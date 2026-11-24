import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { HsIcon, type HsIconName } from './icons';

export type HsButtonVariant = 'primary' | 'ink' | 'outline' | 'danger' | 'soft';
export type HsButtonSize = 'cta' | 'bar' | 'lg' | 'md' | 'sm';

const VARIANT: Record<HsButtonVariant, string> = {
  primary: 'bg-hs-brand-700 text-hs-surface-0 hover:bg-hs-brand-800',
  ink: 'bg-hs-ink-900 text-hs-surface-0 hover:bg-hs-ink-700',
  outline: 'bg-hs-surface-0 text-hs-ink-900 border-[1.5px] border-hs-line-300 hover:bg-hs-surface-100',
  danger: 'bg-hs-danger-700 text-hs-surface-0',
  soft: 'bg-hs-surface-100 text-hs-ink-900',
};

const SIZE: Record<HsButtonSize, string> = {
  cta: 'h-[var(--hs-size-btn-cta)] w-full px-5 text-[17px] font-black',
  bar: 'h-[var(--hs-size-btn-bar)] px-5 text-[15px] font-black',
  lg: 'h-[var(--hs-size-btn-lg)] px-5 text-[15px] font-black',
  md: 'h-[var(--hs-size-btn-md)] px-4 text-[14px] font-black',
  sm: 'h-[var(--hs-size-btn-sm)] ps-2.5 pe-3 text-[13px] font-extrabold',
};

export interface HsButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: HsButtonVariant;
  size?: HsButtonSize;
  /** 글자 왼쪽 아이콘(18px, 글자와 같은 색) */
  icon?: HsIconName;
  iconNode?: ReactNode;
  /** 버튼 폭을 부모에 맞춤 */
  block?: boolean;
  /** 처리 중: 누를 수 없지만 모양은 유지(흐리게) */
  busy?: boolean;
}

/**
 * 알약 버튼. 한 화면에 채움 버튼은 하나, 나머지는 outline.
 * disabled는 line-dash 바탕 + 흰 글자(필수 조건이 남았을 때. 위에 이유 한 줄을 둔다).
 */
export const HsButton = forwardRef<HTMLButtonElement, HsButtonProps>(function HsButton(
  { variant = 'primary', size = 'lg', icon, iconNode, block = false, busy = false, className = '', children, type = 'button', disabled, ...rest },
  ref,
) {
  const disabledLook = busy ? 'disabled:opacity-60' : 'disabled:border-0 disabled:bg-hs-line-dash disabled:text-hs-surface-0';
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex min-w-11 select-none items-center justify-center gap-1.5 rounded-hs-pill leading-tight transition-colors disabled:cursor-default ${disabledLook} ${VARIANT[variant]} ${SIZE[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {iconNode ?? (icon && <HsIcon name={icon} size={18} />)}
      {children}
    </button>
  );
});

interface HsLinkButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'ink' | 'brand' | 'danger';
  /** 글자 오른쪽 아이콘(판정 읽는 법 ›, 자세히 보기 ⌄) */
  trailingIcon?: HsIconName;
  trailingClassName?: string;
}

/** 글자 버튼(판정 읽는 법 ›, 수정, 자세히 보기 ⌄). 터치 영역 44px. */
export function HsLinkButton({ tone = 'ink', trailingIcon, trailingClassName = '', className = '', children, type = 'button', ...rest }: HsLinkButtonProps) {
  const color = tone === 'brand' ? 'text-hs-brand-700' : tone === 'danger' ? 'text-hs-danger-700' : 'text-hs-ink-900';
  return (
    <button type={type} className={`inline-flex min-h-11 items-center gap-[3px] hs-label ${color} ${className}`} {...rest}>
      {children}
      {trailingIcon && <HsIcon name={trailingIcon} size={14} strokeWidth={2.6} className={trailingClassName} />}
    </button>
  );
}
