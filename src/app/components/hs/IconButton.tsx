import type { ButtonHTMLAttributes } from 'react';
import { HsIcon, type HsIconName } from './icons';

interface HsIconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  icon: HsIconName;
  /** 스크린리더 이름(필수) */
  label: string;
  /** white: 색 있는 면 위 / soft: 흰 면(시트) 위 / ghost: 바탕 없음 */
  tone?: 'white' | 'soft' | 'ghost';
  iconSize?: number;
  iconClassName?: string;
}

/** 44px 원형 아이콘 버튼(뒤로 · 닫기 · 카드 넘김). 흐리게 막힌 상태는 opacity .35. */
export function HsIconButton({ icon, label, tone = 'white', iconSize = 20, iconClassName = '', className = '', type = 'button', ...rest }: HsIconButtonProps) {
  const bg = tone === 'soft' ? 'bg-hs-surface-100' : tone === 'ghost' ? 'bg-transparent' : 'bg-hs-surface-0';
  return (
    <button
      type={type}
      aria-label={label}
      className={`inline-flex size-[var(--hs-size-touch)] flex-none items-center justify-center rounded-hs-pill text-hs-ink-900 disabled:opacity-35 ${bg} ${className}`}
      {...rest}
    >
      <HsIcon name={icon} size={iconSize} className={iconClassName} />
    </button>
  );
}

interface HsTextIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: HsIconName;
  tone?: 'white' | 'soft';
}

/** 아이콘 + 글자 버튼(높이 40). 뜻을 짐작해야 하는 동작에 쓴다: [메뉴판 사진] [기록 수정]. */
export function HsTextIconButton({ icon, tone = 'white', className = '', children, type = 'button', ...rest }: HsTextIconButtonProps) {
  const bg = tone === 'soft' ? 'bg-hs-surface-100' : 'bg-hs-surface-0';
  return (
    <button
      type={type}
      className={`inline-flex h-[var(--hs-size-btn-sm)] min-w-11 flex-none items-center gap-1.5 rounded-hs-pill ps-2.5 pe-3 text-[13px] font-extrabold text-hs-ink-900 ${bg} ${className}`}
      {...rest}
    >
      <HsIcon name={icon} size={16} strokeWidth={2.3} />
      {children}
    </button>
  );
}
