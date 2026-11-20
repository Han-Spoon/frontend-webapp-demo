import { Volume2, X } from 'lucide-react';
import type { Language } from '../../App';
import { createTranslator, translateText } from '../../locales';
import { buildDietCardText } from '../../results/dietCard';
import { localizeMenuText, type ProfileCommunicationItem } from '../../results/resultViewModel';
import { speak, ttsSupported } from '../../utils/speech';

/** 결과 위계 A 데모 전용: 내 식단 전체를 한 장의 카드로 직원에게 보여 준다. */
export function DietCardSheet({ items, language, onClose }: { items: ProfileCommunicationItem[]; language: Language; onClose: () => void }) {
  const t = createTranslator(language);
  const text = buildDietCardText(items);
  const localized = translateText(language, text);

  return (
    <>
      <button type="button" className="fixed inset-0 z-40 bg-soy-ink/45" onClick={onClose} aria-label={t('닫기', 'Close', 'إغلاق')} />
      <section
        className="fixed bottom-0 left-1/2 z-50 max-h-[88dvh] w-full max-w-[430px] -translate-x-1/2 overflow-y-auto rounded-t-[1.5rem] border border-border-warm bg-surface-raised shadow-[var(--shadow-float)] animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="diet-card-title"
      >
        <div className="flex items-center gap-2 border-b border-border-warm px-4 py-3">
          <span className="size-11" aria-hidden="true" />
          <h2 id="diet-card-title" className="min-w-0 flex-1 text-center text-base font-extrabold">{t('내 식단 전달하기', 'Share my dietary needs', 'شارك احتياجاتي الغذائية')}</h2>
          <button type="button" onClick={onClose} className="touch-target inline-flex items-center justify-center rounded-full hover:bg-surface-subtle" aria-label={t('닫기', 'Close', 'إغلاق')}>
            <X className="size-5" />
          </button>
        </div>

        <div className="px-5 pb-8 pt-5">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {items.map(item => <span key={item.id} className="rounded-md bg-brand-primary-soft px-2 py-1 text-xs font-bold text-brand-primary">{localizeMenuText(item.label, language)}</span>)}
          </div>
          <div className="rounded-[var(--radius-card)] border border-border-warm bg-surface-subtle p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                {/* 직원이 읽는 한국어를 크게, 내 언어(한국어 사용자는 영어)를 작게 보여 준다. */}
                <p lang="ko" dir="auto" className="break-words text-xl font-extrabold leading-8 text-text-primary">{text.ko}</p>
                <p lang={language === 'ko' ? 'en' : language} dir="auto" className="mt-3 border-t border-border-warm pt-3 text-sm leading-6 text-text-secondary">{language === 'ko' ? text.en : localized}</p>
              </div>
              {ttsSupported && (
                <button type="button" onClick={() => speak(text.ko, 'ko-KR')} className="touch-target inline-flex shrink-0 items-center justify-center rounded-full bg-brand-primary text-white hover:bg-brand-primary-hover" aria-label={t('음성 듣기', 'Play audio', 'تشغيل الصوت')}>
                  <Volume2 className="size-5" />
                </button>
              )}
            </div>
          </div>
          <p className="mt-3 text-center text-xs leading-5 text-text-tertiary">{t('직원에게 이 화면을 보여주세요.', 'Show this screen to a staff member.', 'اعرض هذه الشاشة على أحد الموظفين.')}</p>
        </div>
      </section>
    </>
  );
}
