import { useState } from 'react';
import { AlertTriangle, Check, Volume2, XCircle } from 'lucide-react';
import type { Language, MenuAnalysis, UserProfile } from '../App';
import { saveCard, type CardType } from '../../api/card';
import { saveStaffAnswer, type StaffAnswer } from '../../api/staff';
import { speak, ttsSupported } from '../utils/speech';
import {
  formatOwnerCommunicationContent,
  getAllergyName,
  getHitTagLabel,
  ownerCommunicationI18n,
  translate,
  type LocalizedText,
  type OwnerContent,
} from '../i18n';
import { createTranslator } from '../locales';
import { saveDemoCard } from '../demo/cards';
import { getProfileCommunicationItems, getProfileSummary, localizeMenuText } from '../results/resultViewModel';
import { ModalSheet } from './common/ModalSheet';

export type OwnerCommunicationType =
  | 'order'
  | 'ingredient'
  | 'request'
  | 'spicy'
  | 'lessSpicy'
  | 'moreSpicy';
export type OwnerResponseId = 'ok' | 'yes' | 'no' | 'unknown' | 'possible' | 'difficult';
export type OwnerResponseTone = 'success' | 'caution' | 'danger';

export interface OwnerResponseOption {
  id: OwnerResponseId;
  label: LocalizedText;
  tone: OwnerResponseTone;
}

export const getOwnerResponseOptions = (type: OwnerCommunicationType): OwnerResponseOption[] => {
  return ownerCommunicationI18n.responseOptions[type] as OwnerResponseOption[];
};

export const getOwnerResponseOption = (
  type: OwnerCommunicationType,
  responseId: OwnerResponseId,
) => getOwnerResponseOptions(type).find((option) => option.id === responseId);

const HIDDEN_OWNER_CONTENT_LABELS = new Set([
  'hidden animal',
  'unknown remain',
]);

interface OwnerCommunicationSheetProps {
  menu: MenuAnalysis;
  type: OwnerCommunicationType;
  userProfile: UserProfile | null;
  language: Language;
  demoMode?: boolean;
  initialResponse?: OwnerResponseId | null;
  onResponseSelect?: (type: OwnerCommunicationType, responseId: OwnerResponseId) => void;
  scanId?: string;
  onServerAnswer?: () => void;
  onClose: () => void;
}

export function OwnerCommunicationSheet({
  menu,
  type,
  userProfile,
  language,
  demoMode = false,
  initialResponse = null,
  onResponseSelect,
  scanId,
  onServerAnswer,
  onClose,
}: OwnerCommunicationSheetProps) {
  const [response, setResponse] = useState<OwnerResponseId | null>(initialResponse);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [answeringQuestion, setAnsweringQuestion] = useState<string | null>(null);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, StaffAnswer>>({});
  const t = createTranslator(language);

  // 시트 카드 종류 → 백엔드 CardType
  const toCardType = (sheetType: OwnerCommunicationType): CardType => {
    if (sheetType === 'order') return 'order';
    if (sheetType === 'ingredient') return 'ingredient_check';
    if (sheetType === 'lessSpicy') return 'less_spicy';
    return 'exclude';
  };

  // 직원에게 보일 재료: 내 프로필 관련 근거 재료, 없으면 위험 사유 코드 라벨.
  const activeProfileIds = new Set(getProfileCommunicationItems(userProfile).map(item => item.id));
  const relevantIngredients = (menu.explainability?.ingredients ?? []).filter(item => item.profileIds?.some(id => activeProfileIds.has(id)));
  const listSeparator = (lang: Language) =>
    lang === 'zh-CN' || lang === 'zh-TW' || lang === 'ja' ? '、' : lang === 'ar' ? '، ' : ', ';
  const flaggedFor = (lang: Language) => relevantIngredients.length
    ? relevantIngredients.map(item => localizeMenuText(item.name, lang)).join(listSeparator(lang))
    : Array.from(
      new Set((menu.riskReasons ?? [])
        .map((code) => getHitTagLabel(code, lang))
        .filter(Boolean)
        .filter((label) => !HIDDEN_OWNER_CONTENT_LABELS.has(label.trim().toLowerCase()))),
    ).join(listSeparator(lang));
  const flaggedLabels: LocalizedText = {
    ko: flaggedFor('ko'),
    en: flaggedFor('en'),
    ar: flaggedFor('ar'),
    'zh-CN': flaggedFor('zh-CN'),
    ja: flaggedFor('ja'),
    'zh-TW': flaggedFor('zh-TW'),
    es: flaggedFor('es'),
  };

  const getContent = (): OwnerContent => {
    const menuName = {
      ko: menu.menuName,
      en: menu.menuNameEn,
      ar: menu.menuNameAr ?? menu.menuNameEn,
    };
    const emptyText = { ko: '', en: '', ar: '' };

    switch (type) {
      case 'order':
        return formatOwnerCommunicationContent(type, {
          menuName,
          ingredient: emptyText,
          allergen: emptyText,
        });
      case 'ingredient': {
        const ingredient = flaggedLabels.ko
          ? flaggedLabels
          : ownerCommunicationI18n.ingredients.generic;

        return formatOwnerCommunicationContent(type, {
          menuName,
          ingredient,
          allergen: emptyText,
        });
      }
      case 'request': {
        // 비건 제한은 알레르기 아님. 식단과 겹치는 달걀·생선을 알레르기로 표기하지 않음.
        if (flaggedLabels.ko) return formatOwnerCommunicationContent('exclude', {
          menuName, ingredient: flaggedLabels, allergen: emptyText,
        });
        // 표시할 재료가 없으면 사용자 알레르기 첫 항목.
        const fallbackAllergy = userProfile?.allergies[0];
        const allergen = flaggedLabels.ko
          ? flaggedLabels
            : {
              ko: getAllergyName(fallbackAllergy, 'ko'),
              en: getAllergyName(fallbackAllergy, 'en'),
              ar: getAllergyName(fallbackAllergy, 'ar'),
              'zh-CN': getAllergyName(fallbackAllergy, 'zh-CN'),
              ja: getAllergyName(fallbackAllergy, 'ja'),
              'zh-TW': getAllergyName(fallbackAllergy, 'zh-TW'),
              es: getAllergyName(fallbackAllergy, 'es'),
            };

        return formatOwnerCommunicationContent(type, {
          menuName,
          ingredient: emptyText,
          allergen,
        });
      }
      case 'spicy':
      case 'lessSpicy':
      case 'moreSpicy':
        return formatOwnerCommunicationContent(type, {
          menuName,
          ingredient: emptyText,
          allergen: emptyText,
        });
      default:
        return { korean: '', english: '', arabic: '', localized: emptyText };
    }
  };

  const content = getContent();
  const responseButtons = getOwnerResponseOptions(type);
  const selectedResponse = response ? getOwnerResponseOption(type, response) : null;

  const selectedButtonClasses: Record<OwnerResponseTone, string> = {
    success: 'border-action-primary bg-action-primary text-action-primary-foreground shadow-sm',
    caution: 'border-action-primary bg-action-primary text-action-primary-foreground shadow-sm',
    danger: 'border-action-primary bg-action-primary text-action-primary-foreground shadow-sm',
  };

  const summaryClasses: Record<OwnerResponseTone, string> = {
    success: 'bg-action-primary-soft border-action-primary text-action-primary',
    caution: 'bg-action-primary-soft border-action-primary text-action-primary',
    danger: 'bg-action-primary-soft border-action-primary text-action-primary',
  };

  const getResponseIcon = (tone: OwnerResponseTone) => {
    if (tone === 'success') {
      return <Check className="w-4 h-4" />;
    }
    if (tone === 'danger') {
      return <XCircle className="w-4 h-4" />;
    }
    return <AlertTriangle className="w-4 h-4" />;
  };

  const handleResponseSelect = (option: OwnerResponseOption) => {
    setResponse(option.id);
    onResponseSelect?.(type, option.id);
  };

  const answerQuestion = async (questionId: string, answer: StaffAnswer) => {
    if (!scanId) return;
    setAnsweringQuestion(questionId);
    setSaveError('');
    try {
      await saveStaffAnswer(scanId, questionId, answer);
      setQuestionAnswers(current => ({ ...current, [questionId]: answer }));
      onServerAnswer?.();
    } catch (error) { setSaveError(error instanceof Error ? error.message : String(error)); }
    finally { setAnsweringQuestion(null); }
  };

  const handleSave = async () => {
    if (saving || saved) return;
    try {
      setSaving(true);
      setSaveError('');
      const request = {
        type: toCardType(type),
        menuNameKo: menu.menuName,
        text: { ko: content.korean, en: content.english, ar: content.arabic, ...(language !== 'ko' && language !== 'en' && language !== 'ar' ? { [language]: translate(language, content.localized) } : {}) },
        ...(scanId ? { scanId } : {}),
      };
      if (demoMode) saveDemoCard(request);
      else await saveCard(request);
      setSaved(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Card save failed:', error);
      setSaveError(t('저장에 실패했어요. 다시 시도해 주세요.', 'Failed to save. Please try again.', 'فشل الحفظ. يرجى المحاولة مرة أخرى.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet language={language} onClose={onClose} title={translate(language, ownerCommunicationI18n.labels.selectedMenu)}>
        <div className="pt-3 pb-2 flex justify-center">
          <div className="w-12 h-1 bg-border-warm rounded-full" />
        </div>

        <div className="px-6 pb-8 pt-6 relative">
          <div className="mb-4 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-2 break-words text-2xl font-extrabold leading-tight text-text-primary">
                {translate(language, content.localized)}
              </div>
              <div className="break-words text-sm text-text-secondary">
                {language === 'ko' ? content.english : content.korean}
              </div>
            </div>
            {ttsSupported && content.korean && (
              <button
                onClick={() => speak(content.korean, 'ko-KR')}
                className="flex size-11 flex-shrink-0 items-center justify-center rounded-full bg-action-primary text-action-primary-foreground hover:bg-action-primary-hover"
                aria-label={t('음성 듣기', 'Play audio', 'تشغيل الصوت')}
              >
                <Volume2 className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="mb-6 rounded-xl border border-border-warm bg-surface-subtle p-4">
            <div className="mb-1 text-xs font-semibold text-action-primary">{translate(language, ownerCommunicationI18n.labels.selectedMenu)}</div>
            <div className="font-bold text-text-primary">
              {language === 'ko'
                ? menu.menuName
                : localizeMenuText({
                    ko: menu.menuName,
                    en: menu.menuNameEn || menu.menuName,
                    ar: menu.menuNameAr ?? menu.menuNameEn ?? menu.menuName,
                  }, language)}
            </div>
            <div className="mt-1 text-xs text-text-secondary">{language === 'ko' ? menu.menuNameEn : menu.menuName}</div>
            <p className="mt-2 text-xs font-semibold text-action-primary">{t('내 식단', 'My dietary needs', 'احتياجاتي الغذائية')}: {getProfileSummary(userProfile, language).join(' · ')}</p>
          </div>

          {type === 'ingredient' && scanId && (menu.staffQuestions?.length ?? 0) > 0 ? <div className="mb-4 space-y-3">
            {menu.staffQuestions?.map(question => <div key={question.questionId} className="rounded-xl border border-border-warm bg-surface-subtle p-3">
              <p className="text-sm font-bold">{question.questionText[language] ?? question.questionText.en ?? question.questionText.ko}</p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">{([['present', t('있어요', 'Present', 'موجود')], ['absent', t('없어요', 'Absent', 'غير موجود')], ['unknown', t('모름', 'Not sure', 'لا أعرف')]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={(questionAnswers[question.questionId] ?? question.answer) === value} disabled={question.status === 'expired' || answeringQuestion === question.questionId} onClick={() => void answerQuestion(question.questionId, value)} className={`min-h-11 rounded-lg border px-1 text-xs font-bold ${(questionAnswers[question.questionId] ?? question.answer) === value ? 'border-action-primary bg-action-primary text-action-primary-foreground' : 'border-border-warm bg-surface-raised'}`}>{label}</button>)}</div>
            </div>)}
            <p className="text-xs text-text-secondary">{t('있어요 답변이 내 식단과 겹치면 서버 판정이 위험으로 바뀔 수 있어요.', 'A present answer that conflicts with your diet can change the result to danger.', 'قد تتحول النتيجة إلى خطر إذا كانت الإجابة موجودة وتعارض نظامك الغذائي.')}</p>
          </div> : <div className="space-y-2 mb-4">
            <div className="mb-3 text-xs font-semibold text-text-secondary">{translate(language, ownerCommunicationI18n.labels.ownerResponse)}</div>
            {responseButtons.map((btn) => {
              const selected = response === btn.id;

              return (
                <button
                  key={btn.id}
                  aria-pressed={selected}
                  onClick={() => handleResponseSelect(btn)}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                    selected
                      ? selectedButtonClasses[btn.tone]
                      : 'border-border-warm bg-surface-raised text-text-primary hover:border-action-primary hover:bg-surface-subtle'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      selected ? 'bg-action-primary-foreground/20 text-action-primary-foreground' : 'bg-surface-subtle text-action-primary'
                    }`}
                  >
                    {selected ? getResponseIcon(btn.tone) : btn.id === 'ok' || btn.id === 'possible' ? '✓' : btn.id === 'yes' ? '!' : btn.id === 'unknown' ? '?' : '✗'}
                  </span>
                  <span className="min-w-0 text-start leading-tight">
                    <span className="block">{translate(language, btn.label)}</span>
                    <span className={`mt-0.5 block text-xs ${selected ? 'opacity-75' : 'text-text-secondary'}`}>
                      {language === 'ko' ? btn.label.en : btn.label.ko}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>}

          {selectedResponse && type === 'ingredient' && !(scanId && menu.staffQuestions?.length) && (
            <div className={`mb-4 rounded-xl border p-3 text-xs leading-5 ${summaryClasses[selectedResponse.tone]}`} role="status">
              {t(
                '이 답변은 현재 화면에만 표시돼요. 판정 확인에는 서버 질문 카드를 사용해 주세요.',
                'This answer appears only on this screen. Use a server question card to update the result.',
                'تظهر هذه الإجابة على هذه الشاشة فقط. استخدم بطاقة سؤال الخادم لتحديث النتيجة.',
              )}
            </div>
          )}

          {saveError && <p className="mb-2 text-center text-xs text-status-danger-text">{saveError}</p>}
          <button
            onClick={handleSave}
            disabled={saved || saving}
            className={`min-h-12 w-full rounded-xl text-sm font-bold transition-colors disabled:cursor-not-allowed ${
              saved
                ? 'bg-action-primary text-action-primary-foreground'
                : 'bg-action-primary text-action-primary-foreground hover:bg-action-primary-hover disabled:opacity-60'
            }`}
          >
            {saved ? (
              <span className="flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                {translate(language, ownerCommunicationI18n.labels.saved)}
              </span>
            ) : saving ? (
              t('저장 중...', 'Saving...', 'جارٍ الحفظ...')
            ) : (
              translate(language, ownerCommunicationI18n.labels.saveFavorite)
            )}
          </button>
        </div>
    </ModalSheet>
  );
}
