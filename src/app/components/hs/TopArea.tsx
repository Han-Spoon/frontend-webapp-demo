import type { ReactNode } from 'react';
import symbol from '../../../assets/brand/han-spoon-symbol.svg';

interface TopAreaProps {
  /** mint: 탭 상단(민트, 아래 모서리 56) / result: 판정 결과(surface-100, 아래 모서리 44) */
  variant?: 'mint' | 'result';
  /** 영문 eyebrow(11 · 900 · 자간) */
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  /** 제목 위 줄(뒤로 · 오른쪽 버튼) */
  toolbar?: ReactNode;
  /** 옅은 심볼 워터마크. 한 화면에 로고는 한 번만(로고 또는 워터마크 중 하나). */
  watermark?: boolean;
  children?: ReactNode;
  className?: string;
}

export function TopArea({ variant = 'mint', eyebrow, title, description, toolbar, watermark = false, children, className = '' }: TopAreaProps) {
  const surface = variant === 'result' ? 'rounded-b-hs-top-area bg-hs-surface-100' : 'rounded-b-[56px] bg-hs-mint-100';
  return (
    <header className={`relative flex-none overflow-hidden px-5 pt-[18px] pb-6 ${surface} ${className}`}>
      {watermark && <img src={symbol} alt="" aria-hidden="true" className="pointer-events-none absolute -end-6 -top-4 w-40 opacity-[0.14]" />}
      <div className="relative">
        {toolbar}
        {eyebrow && <p lang="en" className="text-[11px] font-black tracking-[0.08em] text-hs-brand-700">{eyebrow}</p>}
        {title && <h1 className="mt-1.5 hs-title-xl text-hs-ink-900">{title}</h1>}
        {description && <p className="mt-1 text-[14px] font-semibold text-hs-ink-700">{description}</p>}
        {children}
      </div>
    </header>
  );
}

/** 상단 바(흰 바탕): 뒤로 + 가운데 제목 + 오른쪽 */
export function TopBar({ leading, title, trailing }: { leading?: ReactNode; title?: ReactNode; trailing?: ReactNode }) {
  return (
    <div className="flex min-h-14 flex-none items-center gap-2 px-3">
      <div className="flex min-w-11 justify-start">{leading}</div>
      <div className="min-w-0 flex-1 truncate text-center hs-title-sm text-hs-ink-900">{title}</div>
      <div className="flex min-w-11 justify-end">{trailing}</div>
    </div>
  );
}

/** 온보딩 진행 표시: 지나왔거나 현재 단계는 brand-700, 남은 단계는 surface-100 */
export function Stepper({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div className="flex flex-1 items-center gap-2" role="progressbar" aria-label={label} aria-valuemin={1} aria-valuemax={total} aria-valuenow={step}>
      <div className="flex flex-1 gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <i key={i} className={`h-2 flex-1 rounded-hs-pill ${i < step ? 'bg-hs-brand-700' : 'bg-hs-surface-100'}`} />
        ))}
      </div>
      <span dir="ltr" className="text-[12px] font-extrabold text-hs-ink-500">{step}/{total}</span>
    </div>
  );
}
