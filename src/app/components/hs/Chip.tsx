import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { HsIcon } from './icons';
import { RISK_COLOR, type HsRisk } from './risk';

interface ChipButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean;
}

/** 고르는 칩(입력: 옵션 · 식단 · 먹은 메뉴). 선택하면 brand-700 채움 + ✓. */
export function ChoiceChip({ selected, className = '', children, type = 'button', ...rest }: ChipButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={rest.role === 'radio' ? undefined : selected}
      className={`inline-flex min-h-9 items-center gap-[5px] rounded-hs-pill px-[13px] py-1 text-[13px] font-extrabold ${selected ? 'border-[1.5px] border-hs-brand-700 bg-hs-brand-700 text-hs-surface-0' : 'border-[1.5px] border-hs-line-200 bg-hs-surface-0 text-hs-ink-700'} ${className}`}
      {...rest}
    >
      {selected && <HsIcon name="check" size={14} strokeWidth={3} />}
      {children}
    </button>
  );
}

/** 추가 칩(점선 테두리 + brand-700 글자): + 다른 메뉴 이름 */
export function AddChip({ className = '', children, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={`inline-flex min-h-9 items-center gap-1 rounded-hs-pill border-[1.5px] border-dashed border-hs-line-dash bg-hs-surface-0 px-[13px] py-1 text-[13px] font-extrabold text-hs-brand-700 ${className}`} {...rest}>
      <HsIcon name="plus" size={14} strokeWidth={2.6} />
      {children}
    </button>
  );
}

interface FilterChipProps extends ChipButtonProps {
  /** 판정 필터일 때 판정색 점 */
  risk?: HsRisk;
  count?: number;
}

/** 거르는 칩(필터 · 카테고리 · 정렬). surface-100 → 선택하면 ink-900 채움. */
export function FilterChip({ selected, risk, count, className = '', children, type = 'button', ...rest }: FilterChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`inline-flex h-10 flex-none items-center gap-1.5 whitespace-nowrap rounded-hs-pill px-[13px] text-[14px] font-extrabold ${selected ? 'bg-hs-ink-900 text-hs-surface-0' : 'bg-hs-surface-100 text-hs-ink-700'} ${className}`}
      {...rest}
    >
      {risk && <span aria-hidden="true" className={`size-2 rounded-hs-pill ${RISK_COLOR[risk].dot}`} />}
      {children}
      {count !== undefined && <span dir="ltr">{count}</span>}
    </button>
  );
}

/** 식단 칩(적용된 내 식단 프로필, 프로필 화면). surface-100 바탕 + ink-900 글자. */
export function DietTag({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex min-h-7 items-center rounded-hs-pill bg-hs-surface-100 px-2.5 py-0.5 text-[12px] font-extrabold text-hs-ink-900 ${className}`}>{children}</span>;
}

/** 관련 재료 태그(접힌 주의 · 위험 카드). 흰 바탕 + 테두리만 판정색 + 검정 글자. */
export function IngredientTag({ risk, children }: { risk: HsRisk; children: ReactNode }) {
  return <span className={`inline-flex min-h-[26px] items-center rounded-hs-pill border-[1.5px] bg-hs-surface-0 px-2.5 py-0.5 text-[12px] font-extrabold text-hs-ink-900 ${RISK_COLOR[risk].border}`}>{children}</span>;
}

/** 작은 회색 태그(매운 메뉴 등) */
export function PlainTag({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex h-6 items-center rounded-hs-pill bg-hs-surface-100 px-[9px] text-[11px] font-black text-hs-ink-700 ${className}`}>{children}</span>;
}

export type CurationCategory = 'culture' | 'food' | 'restaurant' | 'tips';

const CATEGORY_CLASS: Record<CurationCategory, string> = {
  culture: 'bg-hs-mint-100 text-hs-brand-700',
  food: 'bg-hs-coral-100 text-hs-coral-700',
  restaurant: 'bg-hs-surface-100 text-hs-ink-700',
  tips: 'bg-hs-caution-100 text-hs-caution-700',
};

/** 큐레이션 카테고리 태그 4종: 식문화 · 한식 이야기 · 식당에서 · 알아두기 */
export function CategoryTag({ category, children }: { category: CurationCategory; children: ReactNode }) {
  return <span className={`inline-flex h-6 flex-none items-center rounded-hs-pill px-[9px] text-[11px] font-black ${CATEGORY_CLASS[category]}`}>{children}</span>;
}
