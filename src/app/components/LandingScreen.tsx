import { useNavigate } from 'react-router-dom';
import type { Language } from '../types';
import { BowlTile, HsButton, HsIcon, LanguageButton, Logo, tx, type AllText, type HsIconName } from './hs';

const T = {
  eyebrow: { ko: 'AI 한식 메뉴 가이드', en: 'AI KOREAN MENU GUIDE', ar: 'دليل قوائم الطعام الكورية بالذكاء الاصطناعي', 'zh-CN': 'AI 韩餐菜单指南', ja: 'AI 韓国料理メニューガイド', 'zh-TW': 'AI 韓式菜單指南', es: 'GUÍA DE MENÚS COREANOS CON IA' },
  headline: {
    ko: '낯선 한식 메뉴도\n맛있는 발견으로!',
    en: 'Unfamiliar Korean menus,\ndelicious discoveries!',
    ar: 'قوائم كورية غير مألوفة\nتتحول إلى اكتشافات لذيذة!',
    'zh-CN': '陌生的韩餐菜单，\n也能变成美味发现！',
    ja: '見慣れない韓国料理も\nおいしい発見に！',
    'zh-TW': '陌生的韓式菜單，\n也能變成美味發現！',
    es: '¡Menús coreanos desconocidos,\ndescubrimientos deliciosos!',
  },
  body: {
    ko: '메뉴판 한 장이면 번역부터 내 식단 확인,\n식당에서 필요한 말까지 준비해드려요.',
    en: 'One menu photo gives you translations, a check against your diet,\nand the words you need at the table.',
    ar: 'صورة واحدة للقائمة تمنحك الترجمة والتحقق من نظامك الغذائي\nوالعبارات التي تحتاجها في المطعم.',
    'zh-CN': '只需一张菜单照片，就能翻译、核对饮食需求，\n还能准备好在餐厅要说的话。',
    ja: 'メニュー1枚で翻訳から食事条件の確認、\nお店で必要なひと言まで準備します。',
    'zh-TW': '只要一張菜單照片，就能翻譯、核對飲食需求，\n還能準備好在餐廳要說的話。',
    es: 'Con una foto del menú obtienes la traducción, la revisión según tu dieta\ny las frases que necesitas en el restaurante.',
  },
  features: { ko: '한스푼 주요 기능', en: 'Han Spoon features', ar: 'مزايا هان سبون', 'zh-CN': 'Han Spoon 主要功能', ja: 'Han Spoon の主な機能', 'zh-TW': 'Han Spoon 主要功能', es: 'Funciones de Han Spoon' },
  start: { ko: '한스푼 시작하기', en: 'Start with Han Spoon', ar: 'ابدأ مع هان سبون', 'zh-CN': '开始使用 Han Spoon', ja: 'Han Spoon をはじめる', 'zh-TW': '開始使用 Han Spoon', es: 'Empezar con Han Spoon' },
} satisfies Record<string, AllText>;

const FEATURES: Array<{ icon: HsIconName; label: AllText }> = [
  { icon: 'translate', label: { ko: '메뉴 번역', en: 'Translate', ar: 'ترجمة', 'zh-CN': '菜单翻译', ja: 'メニュー翻訳', 'zh-TW': '菜單翻譯', es: 'Traducir' } },
  { icon: 'bowl', label: { ko: '식단 확인', en: 'Check diet', ar: 'تحقق غذائي', 'zh-CN': '饮食确认', ja: '食事チェック', 'zh-TW': '飲食確認', es: 'Revisar dieta' } },
  { icon: 'message', label: { ko: '직원 소통', en: 'Talk to staff', ar: 'تواصل', 'zh-CN': '与店员沟通', ja: 'スタッフと会話', 'zh-TW': '與店員溝通', es: 'Hablar al personal' } },
];

/** 버블 9개: [left, top, size, 색, 애니메이션, 주기, 시작] (390 폭 기준) */
const BUBBLES: Array<[number, number, number, string, 'drift' | 'float', number, number]> = [
  [196, 118, 168, 'rgba(255,255,255,0.72)', 'drift', 7, 0],
  [36, 146, 112, 'var(--hs-mint-200)', 'float', 6, -1.5],
  [300, 86, 72, 'rgba(60,203,142,0.35)', 'float', 5.5, -0.8],
  [150, 256, 48, 'rgba(244,119,59,0.85)', 'float', 4.8, -2],
  [286, 246, 92, 'rgba(255,255,255,0.55)', 'drift', 6.5, -3],
  [104, 104, 28, 'var(--hs-brand-700)', 'float', 5, -1],
  [334, 196, 18, 'var(--hs-orange-500)', 'float', 4.2, -0.5],
  [58, 292, 38, 'rgba(255,255,255,0.8)', 'float', 5.8, -2.4],
  [238, 322, 22, 'var(--hs-mint-200)', 'float', 4.6, -1.2],
];

/** 흐름 1 ① 랜딩 */
export function LandingScreen({ language, setLanguage }: { language: Language; setLanguage: (language: Language) => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex h-dvh flex-col bg-hs-surface-0 text-hs-ink-900">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="relative h-[392px] overflow-hidden rounded-b-[56px] bg-hs-mint-100">
          <div aria-hidden="true" className="absolute inset-0">
            {BUBBLES.map(([left, top, size, color, kind, duration, delay], index) => (
              <span
                key={index}
                className={`absolute rounded-hs-pill motion-reduce:animate-none ${kind === 'drift' ? 'animate-hs-drift' : 'animate-hs-float'}`}
                style={{ left: `${(left / 390) * 100}%`, top, width: size, height: size, background: color, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}
              />
            ))}
          </div>
          <div className="relative flex items-center justify-between px-5 pt-[max(18px,env(safe-area-inset-top))]">
            <Logo height={30} />
            <LanguageButton language={language} setLanguage={setLanguage} />
          </div>
        </div>
        <div className="px-6 pt-[26px]">
          <p className="text-[12px] font-black tracking-[0.06em] text-hs-brand-700">{tx(language, T.eyebrow)}</p>
          <h1 className="mt-2 whitespace-pre-line text-[30px] leading-[1.25] font-black tracking-[-0.02em]">{tx(language, T.headline)}</h1>
          <p className="mt-2.5 whitespace-pre-line text-[15px] leading-[1.55] text-hs-ink-500">{tx(language, T.body)}</p>
        </div>
        <ul aria-label={tx(language, T.features)} className="mx-6 mt-[22px] mb-6 grid grid-cols-3 gap-2 rounded-3xl bg-hs-surface-100 px-2 py-4">
          {FEATURES.map((feature) => (
            <li key={feature.icon} className="flex flex-col items-center gap-2 text-center">
              <BowlTile className="h-12 w-[52px] bg-hs-mint-100 text-hs-brand-700"><HsIcon name={feature.icon} size={24} strokeWidth={2.1} /></BowlTile>
              <span className="text-[13px] font-extrabold">{tx(language, feature.label)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex-none bg-hs-surface-0 px-5 pt-3 pb-[max(28px,env(safe-area-inset-bottom))]">
        <HsButton size="cta" onClick={() => navigate('/login')}>{tx(language, T.start)}</HsButton>
      </div>
    </div>
  );
}
