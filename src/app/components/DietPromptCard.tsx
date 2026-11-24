import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Language, UserProfile } from '../types';
import { translateText } from '../locales';
import { getProfileCommunicationItems } from '../results/resultViewModel';
import { HsButton, HsIcon, HsIconButton } from './hs';

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
    <section className="relative mt-5 rounded-hs-2xl bg-hs-mint-100 p-4 pe-12">
      <HsIconButton icon="x" tone="ghost" label={translateText(language, { ko: '닫기', en: 'Close', ar: 'إغلاق', 'zh-CN': '关闭', ja: '閉じる', 'zh-TW': '關閉', es: 'Cerrar' })} onClick={dismiss} iconSize={18} className="absolute end-1 top-1 text-hs-ink-500!" />
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex h-10 w-11 flex-none items-center justify-center rounded-t-[12px] rounded-b-[20px] bg-hs-surface-0 text-hs-brand-700">
          <HsIcon name="shield" size={19} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-black text-hs-ink-900">{translateText(language, { ko: '아직 식단 조건이 없어요', en: 'No dietary conditions yet', ar: 'لا توجد شروط غذائية بعد', 'zh-CN': '还没有设置饮食条件', ja: 'まだ食事の条件がありません', 'zh-TW': '還沒有設定飲食條件', es: 'Aún no has indicado tu dieta' })}</h2>
          <p className="mt-1 text-[13px] leading-[1.5] font-semibold text-hs-ink-700">{translateText(language, { ko: '식단을 설정하면 메뉴마다 위험·주의를 알려 드려요.', en: 'Set your diet and we’ll flag Danger and Caution for each dish.', ar: 'حدد نظامك الغذائي وسننبهك إلى الخطر والحذر في كل طبق.', 'zh-CN': '设置饮食条件后，我们会为每道菜标出危险和注意。', ja: '食事の条件を設定すると、メニューごとに危険・注意をお知らせします。', 'zh-TW': '設定飲食條件後，我們會為每道菜標出危險和注意。', es: 'Indica tu dieta y te avisaremos de Peligro y Precaución en cada plato.' })}</p>
          <HsButton variant="outline" size="sm" className="mt-3" onClick={() => navigate('/onboarding', { state: { editSection: 'diet' } })}>{translateText(language, { ko: '식단 설정하기', en: 'Set up my diet', ar: 'حدد نظامي الغذائي', 'zh-CN': '设置饮食条件', ja: '食事の条件を設定', 'zh-TW': '設定飲食條件', es: 'Indicar mi dieta' })}</HsButton>
        </div>
      </div>
    </section>
  );
}
