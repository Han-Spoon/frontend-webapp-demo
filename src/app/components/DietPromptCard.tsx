import { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Language, UserProfile } from '../types';
import { translateText } from '../locales';
import { getProfileCommunicationItems } from '../results/resultViewModel';

const DISMISS_KEY = 'han-spoon-diet-prompt-dismissed';

function readDismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
}

/** 식단 조건 없는 사용자용 식단 설정 권유. 프로필 미확인(null)이면 숨김, 닫기는 기기에 기억. */
export function DietPromptCard({ language, userProfile }: { language: Language; userProfile: UserProfile | null }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(readDismissed);

  if (dismissed || !userProfile || getProfileCommunicationItems(userProfile).length > 0) return null;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* 저장이 막혀 있으면 이번 화면에서만 닫는다. */ }
  };

  return (
    <section className="relative mb-3 rounded-[22px] border border-border-warm bg-surface-raised p-4 pe-12 shadow-[var(--shadow-card)]">
      <button
        type="button"
        onClick={dismiss}
        aria-label={translateText(language, { ko: '닫기', en: 'Close', ar: 'إغلاق', 'zh-CN': '关闭', ja: '閉じる', 'zh-TW': '關閉', es: 'Cerrar' })}
        className="absolute end-1.5 top-1.5 flex size-11 items-center justify-center rounded-full text-text-tertiary hover:bg-surface-subtle"
      >
        <X className="size-4" />
      </button>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-subtle text-action-primary">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-text-primary">
            {translateText(language, { ko: '아직 식단 조건이 없어요', en: 'No dietary conditions yet', ar: 'لا توجد شروط غذائية بعد', 'zh-CN': '还没有设置饮食条件', ja: 'まだ食事の条件がありません', 'zh-TW': '還沒有設定飲食條件', es: 'Aún no has indicado tu dieta' })}
          </h2>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            {translateText(language, { ko: '식단을 설정하면 메뉴마다 위험·주의를 알려 드려요.', en: 'Set your diet and we’ll flag Danger and Caution for each dish.', ar: 'حدد نظامك الغذائي وسننبهك إلى الخطر والحذر في كل طبق.', 'zh-CN': '设置饮食条件后，我们会为每道菜标出危险和注意。', ja: '食事の条件を設定すると、メニューごとに危険・注意をお知らせします。', 'zh-TW': '設定飲食條件後，我們會為每道菜標出危險和注意。', es: 'Indica tu dieta y te avisaremos de Peligro y Precaución en cada plato.' })}
          </p>
          <button
            type="button"
            onClick={() => navigate('/onboarding', { state: { editSection: 'diet' } })}
            className="mt-3 inline-flex min-h-11 items-center rounded-[18px] border border-action-primary px-4 text-sm font-bold text-action-primary hover:bg-action-primary-soft"
          >
            {translateText(language, { ko: '식단 설정하기', en: 'Set up my diet', ar: 'حدد نظامي الغذائي', 'zh-CN': '设置饮食条件', ja: '食事の条件を設定', 'zh-TW': '設定飲食條件', es: 'Indicar mi dieta' })}
          </button>
        </div>
      </div>
    </section>
  );
}
