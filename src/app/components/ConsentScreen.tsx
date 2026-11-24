import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { getConsentStatus, getLegalDocuments, saveConsent } from '../../api/consent';
import { getAccessToken } from '../../api/auth';
import type { DocumentId, LegalDocumentBundle } from '../../api/consent';
import demoDocuments from '../demo/legalDocuments.json';
import type { Language } from '../types';
import { ErrorState, FLIP_RTL, HsButton, HsIcon, HsIconButton, HsLinkButton, HsNote, HS_TEXT, SkeletonLine, tx, txn, type AllText, type CountText } from './hs';

const REQUIRED: DocumentId[] = ['service', 'privacy', 'sensitive'];
const ALL: DocumentId[] = [...REQUIRED, 'marketing'];
const TITLES: Record<DocumentId, AllText> = {
  service: { ko: '서비스 이용약관', en: 'Terms of service', ar: 'شروط الخدمة', 'zh-CN': '服务条款', ja: '利用規約', 'zh-TW': '服務條款', es: 'Términos de servicio' },
  privacy: { ko: '개인정보 수집·이용', en: 'Personal data collection', ar: 'جمع البيانات الشخصية', 'zh-CN': '个人信息收集与使用', ja: '個人情報の収集・利用', 'zh-TW': '個人資料蒐集與使用', es: 'Recogida de datos personales' },
  sensitive: { ko: '민감정보 처리', en: 'Sensitive data processing', ar: 'معالجة البيانات الحساسة', 'zh-CN': '敏感信息处理', ja: '機微情報の取扱い', 'zh-TW': '敏感資料處理', es: 'Tratamiento de datos sensibles' },
  marketing: { ko: '마케팅 정보 수신', en: 'Marketing messages', ar: 'رسائل التسويق', 'zh-CN': '接收营销信息', ja: '広告情報の受信', 'zh-TW': '接收行銷資訊', es: 'Mensajes de marketing' },
};
type Decisions = Record<DocumentId, boolean>;
const emptyDecisions = (): Decisions => ({ service: false, privacy: false, sensitive: false, marketing: false });

const T = {
  page: { ko: '약관 동의', en: 'Terms & consent', ar: 'الشروط والموافقة', 'zh-CN': '条款同意', ja: '規約への同意', 'zh-TW': '條款同意', es: 'Términos y consentimiento' },
  viewPage: { ko: '약관 보기', en: 'View terms', ar: 'عرض الشروط', 'zh-CN': '查看条款', ja: '規約を見る', 'zh-TW': '查看條款', es: 'Ver los términos' },
  title: { ko: '한스푼을 시작하기 전에\n약관을 확인해 주세요', en: 'Before you start Han Spoon,\nplease review the terms', ar: 'قبل أن تبدأ مع هان سبون،\nيرجى مراجعة الشروط', 'zh-CN': '开始使用 Han Spoon 前，\n请确认条款', ja: 'Han Spoon を始める前に\n規約を確認してください', 'zh-TW': '開始使用 Han Spoon 前，\n請確認條款', es: 'Antes de empezar con Han Spoon,\nrevisa los términos' },
  subtitle: { ko: '각 문서를 열어 전문을 확인할 수 있어요.', en: 'Open each document to read the full text.', ar: 'افتح كل مستند لقراءة النص الكامل.', 'zh-CN': '打开各文档即可阅读全文。', ja: '各文書を開いて全文を確認できます。', 'zh-TW': '開啟各文件即可閱讀全文。', es: 'Abre cada documento para leer el texto completo.' },
  koreanOnly: { ko: '약관은 한국어로만 제공돼요.', en: 'The terms are provided in Korean only.', ar: 'الشروط متوفرة باللغة الكورية فقط.', 'zh-CN': '条款仅提供韩语版本。', ja: '規約は韓国語でのみ提供されます。', 'zh-TW': '條款僅提供韓語版本。', es: 'Los términos solo están disponibles en coreano.' },
  demo: { ko: '시연 모드 · 동의 결정은 서버에 저장되지 않아요.', en: 'Demo mode · consent choices are not sent to the server.', ar: 'وضع العرض · لا تُرسل اختيارات الموافقة إلى الخادم.', 'zh-CN': '演示模式 · 同意选择不会发送到服务器。', ja: 'デモモード · 同意の選択はサーバーに送信されません。', 'zh-TW': '示範模式 · 同意選擇不會傳送至伺服器。', es: 'Modo demo · las decisiones de consentimiento no se envían al servidor.' },
  all: { ko: '전체 동의', en: 'Agree to all', ar: 'الموافقة على الكل', 'zh-CN': '全部同意', ja: 'すべて同意', 'zh-TW': '全部同意', es: 'Aceptar todo' },
  includingOptional: { ko: '선택 항목 포함', en: 'Includes optional items', ar: 'يشمل العناصر الاختيارية', 'zh-CN': '包含可选项目', ja: '任意項目を含む', 'zh-TW': '包含可選項目', es: 'Incluye los opcionales' },
  required: { ko: '필수', en: 'Required', ar: 'مطلوب', 'zh-CN': '必需', ja: '必須', 'zh-TW': '必需', es: 'Obligatorio' },
  optional: { ko: '선택', en: 'Optional', ar: 'اختياري', 'zh-CN': '可选', ja: '任意', 'zh-TW': '可選', es: 'Opcional' },
  readFirst: { ko: '필수 약관은 읽은 뒤 동의할 수 있어요.', en: 'Read required terms before agreeing.', ar: 'اقرأ الشروط المطلوبة قبل الموافقة.', 'zh-CN': '必需条款需阅读后才能同意。', ja: '必須規約は読んでから同意できます。', 'zh-TW': '必需條款需閱讀後才能同意。', es: 'Lee los términos obligatorios antes de aceptar.' },
  view: { ko: '보기', en: 'View', ar: 'عرض', 'zh-CN': '查看', ja: '見る', 'zh-TW': '查看', es: 'Ver' },
  start: { ko: '동의하고 시작하기', en: 'Agree and start', ar: 'الموافقة والبدء', 'zh-CN': '同意并开始', ja: '同意して始める', 'zh-TW': '同意並開始', es: 'Aceptar y empezar' },
  saveSettings: { ko: '동의 설정 저장', en: 'Save consent settings', ar: 'حفظ إعدادات الموافقة', 'zh-CN': '保存同意设置', ja: '同意設定を保存', 'zh-TW': '儲存同意設定', es: 'Guardar preferencias' },
  goBack: { ko: '돌아가기', en: 'Go back', ar: 'عودة', 'zh-CN': '返回', ja: '戻る', 'zh-TW': '返回', es: 'Volver' },
  saving: { ko: '저장 중...', en: 'Saving...', ar: 'جارٍ الحفظ...', 'zh-CN': '正在保存...', ja: '保存中...', 'zh-TW': '正在儲存...', es: 'Guardando...' },
  loadError: { ko: '약관을 불러오지 못했어요', en: 'Could not load the terms', ar: 'تعذر تحميل الشروط', 'zh-CN': '无法加载条款', ja: '規約を読み込めませんでした', 'zh-TW': '無法載入條款', es: 'No se pudieron cargar los términos' },
  saveError: { ko: '동의를 저장하지 못했어요. 다시 시도해 주세요.', en: 'Could not save your consent. Please try again.', ar: 'تعذر حفظ موافقتك. حاول مرة أخرى.', 'zh-CN': '无法保存同意，请重试。', ja: '同意を保存できませんでした。もう一度お試しください。', 'zh-TW': '無法儲存同意，請重試。', es: 'No se pudo guardar tu consentimiento. Inténtalo de nuevo.' },
  later: { ko: '잠시 후 다시 시도해 주세요.', en: 'Please try again shortly.', ar: 'يرجى المحاولة بعد قليل.', 'zh-CN': '请稍后再试。', ja: 'しばらくしてからもう一度お試しください。', 'zh-TW': '請稍後再試。', es: 'Inténtalo de nuevo en unos momentos.' },
  reading: { ko: '끝까지 읽으면 동의할 수 있어요', en: 'Read to the end to agree', ar: 'اقرأ حتى النهاية للموافقة', 'zh-CN': '阅读至末尾后即可同意', ja: '最後まで読むと同意できます', 'zh-TW': '閱讀至末尾後即可同意', es: 'Lee hasta el final para aceptar' },
  reject: { ko: '거부', en: 'Decline', ar: 'رفض', 'zh-CN': '拒绝', ja: '拒否', 'zh-TW': '拒絕', es: 'Rechazar' },
  agree: { ko: '동의', en: 'Agree', ar: 'موافق', 'zh-CN': '同意', ja: '同意', 'zh-TW': '同意', es: 'Aceptar' },
  backToList: { ko: '목록으로', en: 'Back to list', ar: 'العودة إلى القائمة', 'zh-CN': '返回列表', ja: '一覧へ戻る', 'zh-TW': '返回列表', es: 'Volver a la lista' },
  effective: { ko: '시행일', en: 'Effective', ar: 'تاريخ السريان', 'zh-CN': '生效日期', ja: '施行日', 'zh-TW': '生效日期', es: 'Vigente desde' },
  koreanOriginal: { ko: '한국어 원문', en: 'Korean original', ar: 'النص الكوري الأصلي', 'zh-CN': '韩语原文', ja: '韓国語原文', 'zh-TW': '韓語原文', es: 'Original en coreano' },
  readProgress: { ko: '읽은 정도', en: 'Reading progress', ar: 'تقدم القراءة', 'zh-CN': '阅读进度', ja: '読んだ割合', 'zh-TW': '閱讀進度', es: 'Progreso de lectura' },
  agreeTo: { ko: '동의', en: 'agree', ar: 'موافقة', 'zh-CN': '同意', ja: '同意', 'zh-TW': '同意', es: 'aceptar' },
} satisfies Record<string, AllText>;

const REMAINING: CountText = {
  ko: (n) => `필수 약관 ${n}개가 남았어요`,
  en: (n) => `${n} required ${n === 1 ? 'item' : 'items'} left`,
  ar: (n) => `تبقّى ${n} من الشروط المطلوبة`,
  'zh-CN': (n) => `还剩 ${n} 项必需条款`,
  ja: (n) => `必須規約があと${n}件残っています`,
  'zh-TW': (n) => `還剩 ${n} 項必需條款`,
  es: (n) => `Faltan ${n} términos obligatorios`,
};

interface Props {
  language: Language;
  demoMode: boolean;
  onComplete: () => Promise<void> | void;
  onBack: () => void;
}

/** 원형 체크(26, 전체 동의는 30): 켜짐 brand-700 + ✓ / 꺼짐 흰 원 + line-dash 테두리 */
function CheckCircle({ on, size = 26 }: { on: boolean; size?: number }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size }} className={`flex flex-none items-center justify-center rounded-hs-pill ${on ? 'bg-hs-brand-700 text-hs-surface-0' : 'border-2 border-hs-line-dash bg-hs-surface-0'}`}>
      {on && <HsIcon name="check" size={size > 26 ? 16 : 14} strokeWidth={3.2} />}
    </span>
  );
}

/** 흐름 1 ③ 약관 동의 · ③-1 약관 전문. 마이페이지에서 다시 열면 '동의 설정 저장'. */
export function ConsentScreen({ language, demoMode, onComplete, onBack }: Props) {
  const location = useLocation();
  const reviewing = Boolean((location.state as { returnTo?: string } | null)?.returnTo);
  const [bundle, setBundle] = useState<LegalDocumentBundle | null>(null);
  const [decisions, setDecisions] = useState<Decisions>(emptyDecisions);
  const [active, setActive] = useState<DocumentId | null>(null);
  const [readEnd, setReadEnd] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bulk, setBulk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const reader = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoadError(false);
    try {
      if (demoMode) {
        setBundle(demoDocuments as LegalDocumentBundle);
        return;
      }
      const documents = await getLegalDocuments();
      setBundle(documents);
      if (!getAccessToken()) { setViewOnly(true); return; }
      const status = await getConsentStatus();
      if (documents.version === status.version) setDecisions({ ...emptyDecisions(), ...status.decisions });
    } catch {
      setLoadError(true);
    }
  };

  useEffect(() => { void load(); }, [demoMode]);

  useEffect(() => {
    if (!active) return;
    setReadEnd(false);
    setProgress(0);
    reader.current?.scrollTo({ top: 0 });
    const timer = window.setTimeout(() => {
      const element = reader.current;
      if (element && element.scrollHeight <= element.clientHeight + 2) {
        setReadEnd(true);
        setProgress(100);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [active]);

  const onScroll = () => {
    const element = reader.current;
    if (!element) return;
    const max = element.scrollHeight - element.clientHeight;
    setProgress(max <= 0 ? 100 : Math.min(100, (element.scrollTop / max) * 100));
    if (max <= 0 || element.scrollTop >= max - 3) setReadEnd(true);
  };

  const agree = () => {
    if (!active || !readEnd) return;
    const updated = { ...decisions, [active]: true };
    setDecisions(updated);
    if (bulk) {
      const next = REQUIRED.find((id) => !updated[id]);
      if (next) { setActive(next); return; }
      setDecisions({ ...updated, marketing: true });
      setBulk(false);
    }
    setActive(null);
  };

  const decline = () => {
    if (!active) return;
    setDecisions((prev) => ({ ...prev, [active]: false }));
    setBulk(false);
    setActive(null);
  };

  const allOn = ALL.every((id) => decisions[id]);
  const clickAll = () => {
    if (allOn) { setDecisions(emptyDecisions()); return; }
    const first = REQUIRED.find((id) => !decisions[id]);
    if (first) { setBulk(true); setActive(first); return; }
    setDecisions((prev) => ({ ...prev, marketing: true }));
  };

  // 필수 약관은 전문을 읽어야 동의할 수 있음 → 체크를 누르면 전문을 연다. 선택 약관은 바로 켜고 끔.
  const toggleRow = (id: DocumentId, required: boolean) => {
    if (decisions[id]) { setDecisions((prev) => ({ ...prev, [id]: false })); return; }
    if (required) { setActive(id); return; }
    setDecisions((prev) => ({ ...prev, [id]: true }));
  };

  const remaining = REQUIRED.filter((id) => !decisions[id]).length;

  const submit = async () => {
    if (!bundle || remaining > 0 || busy) return;
    setBusy(true);
    setSaveError(false);
    try {
      if (!demoMode) await saveConsent(bundle.version, decisions);
      await onComplete();
    } catch {
      setSaveError(true);
    } finally {
      setBusy(false);
    }
  };

  const document = bundle?.documents.find((item) => item.id === active);
  const header = (title: string, onClick: () => void, label: string, trailing?: ReactNode) => (
    <div className="flex flex-none items-center gap-2 px-5 pt-[max(18px,env(safe-area-inset-top))]">
      <HsIconButton icon="back" tone="soft" label={label} iconClassName={FLIP_RTL} onClick={onClick} />
      <span className="min-w-0 flex-1 truncate hs-title-sm">{title}</span>
      {trailing}
    </div>
  );
  const requiredTag = (required: boolean, large = false) => (
    <span className={`inline-flex flex-none items-center rounded-hs-pill font-black ${large ? 'h-6 px-[9px] text-[12px]' : 'h-[22px] px-2 text-[11px]'} ${required ? 'bg-hs-coral-100 text-hs-coral-700' : 'bg-hs-surface-100 text-hs-ink-500'}`}>
      {tx(language, required ? T.required : T.optional)}
    </span>
  );

  if (document && bundle) {
    return (
      <div className="flex h-dvh flex-col bg-hs-surface-0 text-hs-ink-900">
        {header(tx(language, TITLES[document.id]), () => { setActive(null); setBulk(false); }, tx(language, T.backToList), requiredTag(document.required, true))}
        <div className="mx-5 mt-3.5 h-1.5 flex-none overflow-hidden rounded-hs-pill bg-hs-surface-100" role="progressbar" aria-label={tx(language, T.readProgress)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
          <span className="block h-full rounded-hs-pill bg-hs-brand-700 transition-[width]" style={{ width: `${progress}%` }} />
        </div>
        <div ref={reader} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13px] font-bold text-hs-ink-500">{tx(language, T.effective)} <span dir="ltr">{bundle.effectiveDate}</span></span>
            <span className="inline-flex h-6 items-center rounded-hs-pill bg-hs-surface-100 px-2.5 text-[12px] font-extrabold text-hs-ink-700">{tx(language, T.koreanOriginal)}</span>
          </div>
          {language !== 'ko' && <HsNote className="mt-2">{tx(language, T.koreanOnly)}</HsNote>}
          <div lang="ko" dir="ltr" className="text-start">
            {document.sections.map((section, index) => (
              <section key={index} className="mt-[22px]">
                <h2 className="text-[15px] font-black">{section.heading}</h2>
                <p className="mt-2 whitespace-pre-wrap text-[14px] leading-[1.7] font-medium text-hs-ink-700">{section.body}</p>
              </section>
            ))}
          </div>
        </div>
        <div className="flex-none border-t-[1.5px] border-hs-line-200 bg-hs-surface-0 px-5 pt-3.5 pb-[max(28px,env(safe-area-inset-bottom))]">
          {viewOnly ? (
            <HsButton variant="outline" size="cta" onClick={() => setActive(null)}>{tx(language, T.backToList)}</HsButton>
          ) : (
            <>
              <p aria-live="polite" className="mb-3 flex min-h-5 items-center justify-center gap-1.5 text-[13px] font-extrabold text-hs-ink-500">
                {!readEnd && (
                  <>
                    <svg width="22" height="8" viewBox="0 0 26 9" aria-hidden="true" className="rtl:-scale-x-100"><ellipse cx="5" cy="4.5" rx="5" ry="4.2" fill="var(--hs-orange-500)" /><rect x="8" y="3" width="18" height="3.2" rx="1.6" fill="var(--hs-orange-500)" /></svg>
                    {tx(language, T.reading)}
                  </>
                )}
              </p>
              <div className="flex gap-2.5">
                <HsButton variant="outline" size="cta" className="!w-auto flex-1" onClick={decline}>{tx(language, T.reject)}</HsButton>
                <HsButton size="cta" className="!w-auto flex-[2]" onClick={agree} disabled={!readEnd}>{tx(language, T.agree)}</HsButton>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-hs-surface-0 text-hs-ink-900">
      {header(tx(language, viewOnly ? T.viewPage : T.page), onBack, tx(language, HS_TEXT.back))}
      <div className="min-h-0 flex-1 overflow-y-auto pb-6">
        <div className="px-6 pt-6">
          <h1 className="whitespace-pre-line hs-title-xl">{tx(language, T.title)}</h1>
          <p className="mt-2 text-[14px] font-semibold text-hs-ink-500">{tx(language, T.subtitle)}</p>
          {language !== 'ko' && <HsNote className="mt-2">{tx(language, T.koreanOnly)}</HsNote>}
          {demoMode && <HsNote className="mt-1">{tx(language, T.demo)}</HsNote>}
        </div>

        {loadError && !bundle && (
          <div className="px-5 pt-6"><ErrorState language={language} title={tx(language, T.loadError)} description={tx(language, T.later)} onRetry={() => void load()} /></div>
        )}
        {!bundle && !loadError && (
          <div className="space-y-4 px-6 pt-8" role="status"><span className="sr-only">{tx(language, HS_TEXT.loading)}</span><SkeletonLine width="70%" /><SkeletonLine width="90%" /><SkeletonLine width="80%" /><SkeletonLine width="60%" /></div>
        )}

        {bundle && (
          <>
            {!viewOnly && (
              <button type="button" onClick={clickAll} aria-pressed={allOn} className="mx-5 mt-[22px] flex w-[calc(100%-40px)] items-center gap-3.5 rounded-hs-2xl bg-hs-mint-100 px-[18px] py-4 text-start">
                <CheckCircle on={allOn} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-black">{tx(language, T.all)}</span>
                  <span className="mt-0.5 block text-[13px] font-bold text-hs-ink-700">{tx(language, T.includingOptional)}</span>
                </span>
              </button>
            )}
            <ul className="px-6 pt-1.5">
              {bundle.documents.map((item) => {
                const on = decisions[item.id];
                const title = tx(language, TITLES[item.id]);
                return (
                  <li key={item.id} className="flex items-center gap-3 border-b-[1.5px] border-hs-line-200 py-2">
                    {!viewOnly && (
                      <button type="button" onClick={() => toggleRow(item.id, item.required)} aria-pressed={on} aria-label={`${title} ${tx(language, T.agreeTo)}`} className="-ms-2.5 flex size-11 flex-none items-center justify-center">
                        <CheckCircle on={on} />
                      </button>
                    )}
                    <div className="min-w-0 flex-1 py-1.5">
                      <div className="flex items-center gap-1.5">{requiredTag(item.required)}<span className="text-[15px] font-extrabold">{title}</span></div>
                      {!viewOnly && item.required && !on && <p className="mt-[3px] text-[12px] font-bold text-hs-coral-700">{tx(language, T.readFirst)}</p>}
                    </div>
                    <HsLinkButton className="flex-none !text-hs-ink-500" trailingIcon="forward" trailingClassName={FLIP_RTL} onClick={() => setActive(item.id)} aria-label={`${title} ${tx(language, T.view)}`}>
                      {tx(language, T.view)}
                    </HsLinkButton>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {bundle && (
        <div className="flex-none bg-hs-surface-0 px-5 pt-3 pb-[max(28px,env(safe-area-inset-bottom))]">
          {viewOnly ? (
            <HsButton variant="outline" size="cta" onClick={onBack}>{tx(language, T.goBack)}</HsButton>
          ) : (
            <>
              {saveError && <p role="alert" className="mb-2.5 text-center text-[13px] font-bold text-hs-danger-700">{tx(language, T.saveError)}</p>}
              {remaining > 0 && <p className="mb-2.5 text-center text-[13px] font-bold text-hs-ink-500">{txn(language, REMAINING, remaining)}</p>}
              <HsButton size="cta" disabled={remaining > 0} busy={busy} onClick={() => void submit()}>
                {busy ? tx(language, T.saving) : tx(language, reviewing ? T.saveSettings : T.start)}
              </HsButton>
            </>
          )}
        </div>
      )}
    </div>
  );
}
