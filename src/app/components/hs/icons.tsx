import type { CSSProperties, ReactNode } from 'react';

/**
 * 「한스푼 디자인 시스템」 Assets › Icons 선 아이콘(24 viewBox, 선 2.2, 둥근 끝).
 * 색은 `currentColor`를 따른다. 디자인 시스템에 없는 모양은 lucide-react를 strokeWidth 2.2로 쓴다.
 */
const PATHS = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5h.01" /></>,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  question: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.2-2.4 3.7M12 17h.01" /></>,
  shield: <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  bookmark: <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />,
  back: <path d="M15 5l-7 7 7 7" />,
  forward: <path d="M9 5l7 7-7 7" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronUp: <path d="M6 15l6-6 6 6" />,
  photo: <><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="M21 16l-5-5-8 8" /></>,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>,
  trash: <><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" /><path d="M10 11v5M14 11v5" /></>,
  offline: <path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 4-2.4M19 12.5a10 10 0 0 0-3-2M2 9a15 15 0 0 1 4.5-3M12 20h.01" />,
  scan: <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7 12h10" />,
  home: <path d="M4 11l8-7 8 7v8a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 19z" />,
  book: <><path d="M3 5.5c2.5-1 6-1 9 1 3-2 6.5-2 9-1v13c-2.5-1-6-1-9 1-3-2-6.5-2-9-1z" /><path d="M12 6.5v13" /></>,
  pin: <><path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z" /><circle cx="12" cy="10" r="2.2" /></>,
  cards: <><rect x="3" y="8" width="14" height="12" rx="2.5" /><path d="M7 4.5h11.5A2.5 2.5 0 0 1 21 7v9" /></>,
  more: <><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></>,
  speaker: <><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></>,
  message: <><path d="M4 5h16v11H9l-5 4z" /><path d="M8 10h8" /></>,
  leaf: <><path d="M7 20c6 0 11-5 11-12" /><path d="M18 8c-3 0-5 2-5 5 0 3-3 6-6 7" /><path d="M18 8c0-2 1-3.5 2.5-4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  user: <><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
} satisfies Record<string, ReactNode>;

export type HsIconName = keyof typeof PATHS;

interface HsIconProps {
  name: HsIconName;
  size?: number;
  strokeWidth?: number;
  /** 채운 아이콘(켜진 하트) */
  filled?: boolean;
  className?: string;
  style?: CSSProperties;
  /** 아이콘만 있는 뜻 있는 그림일 때만. 기본은 장식(aria-hidden). */
  label?: string;
}

export function HsIcon({ name, size = 20, strokeWidth = 2.2, filled = false, className, style, label }: HsIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {PATHS[name]}
    </svg>
  );
}

/** 뒤로 · › 처럼 방향이 있는 아이콘은 아랍어(RTL)에서 좌우를 뒤집는다. */
export const FLIP_RTL = 'rtl:-scale-x-100';
