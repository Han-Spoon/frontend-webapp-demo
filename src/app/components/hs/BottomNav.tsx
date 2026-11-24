import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Language } from '../../locales';
import { HsIcon, type HsIconName } from './icons';
import { tx, type AllText } from './text';

const ITEMS: Array<{ path: string; icon: HsIconName; label: AllText }> = [
  { path: '/home', icon: 'home', label: { ko: '홈', en: 'Home', ar: 'الرئيسية', 'zh-CN': '首页', ja: 'ホーム', 'zh-TW': '首頁', es: 'Inicio' } },
  { path: '/curation', icon: 'book', label: { ko: '큐레이션', en: 'Curation', ar: 'مقالات', 'zh-CN': '精选', ja: 'コラム', 'zh-TW': '精選', es: 'Artículos' } },
  { path: '/map', icon: 'pin', label: { ko: '지도', en: 'Map', ar: 'الخريطة', 'zh-CN': '地图', ja: '地図', 'zh-TW': '地圖', es: 'Mapa' } },
  { path: '/cards', icon: 'cards', label: { ko: '카드', en: 'Cards', ar: 'بطاقات', 'zh-CN': '卡片', ja: 'カード', 'zh-TW': '卡片', es: 'Tarjetas' } },
];

const SCAN_LABEL: AllText = { ko: '촬영', en: 'Scan', ar: 'مسح', 'zh-CN': '拍摄', ja: '撮影', 'zh-TW': '拍攝', es: 'Escanear' };

/** 하단 내비: 홈 · 큐레이션 · [촬영(가운데 60px 원)] · 지도 · 카드. 결과 · 마이페이지 · 온보딩에는 두지 않는다. */
export function BottomNav({ language }: { language: Language }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
  const item = (entry: (typeof ITEMS)[number]) => {
    const on = isActive(entry.path);
    return (
      <button
        key={entry.path}
        type="button"
        onClick={() => navigate(entry.path)}
        aria-current={on ? 'page' : undefined}
        className={`flex min-h-11 min-w-14 flex-1 flex-col items-center gap-[3px] whitespace-nowrap text-[12px] ${on ? 'font-extrabold text-hs-brand-700' : 'font-bold text-hs-ink-500'}`}
      >
        <HsIcon name={entry.icon} size={24} className={on ? '' : 'text-hs-ink-400'} />
        {tx(language, entry.label)}
      </button>
    );
  };
  return (
    // 높이: 위아래 여백 같게(12px) + 홈 인디케이터 영역
    <nav className="relative z-10 flex h-[calc(69px+env(safe-area-inset-bottom))] flex-none items-start justify-around border-t-[1.5px] border-hs-line-200 bg-hs-surface-0 px-2 pt-2.5 pb-[env(safe-area-inset-bottom)]">
      {item(ITEMS[0])}
      {item(ITEMS[1])}
      <div className="flex flex-1 justify-center">
        <button
          type="button"
          onClick={() => navigate('/scan')}
          aria-label={tx(language, SCAN_LABEL)}
          aria-current={isActive('/scan') ? 'page' : undefined}
          className="-mt-[26px] box-content flex size-[60px] items-center justify-center rounded-hs-pill border-[5px] border-hs-surface-0 bg-hs-brand-700 text-hs-surface-0"
        >
          <HsIcon name="scan" size={26} strokeWidth={2.4} />
        </button>
      </div>
      {item(ITEMS[2])}
      {item(ITEMS[3])}
    </nav>
  );
}

/** 화면 아래 고정 버튼 줄(위 테두리 line-200). 안의 버튼은 같은 폭으로 나눈다. */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-none gap-2 border-t-[1.5px] border-hs-line-200 bg-hs-surface-0 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] [&>*]:flex-1">
      {children}
    </div>
  );
}
