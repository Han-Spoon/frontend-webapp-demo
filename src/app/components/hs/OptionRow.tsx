import type { ReactNode } from 'react';
import { FLIP_RTL, HsIcon, type HsIconName } from './icons';

interface OptionRowProps {
  title: string;
  description?: string;
  icon?: HsIconName;
  /** 아이콘 대신 그림(국기 등) */
  leading?: ReactNode;
  /** 이동형: 오른쪽 값 + › */
  trailing?: string;
  /** 선택형: 선택하면 2px brand-700 테두리 + mint-100 바탕 */
  selected?: boolean;
  onClick: () => void;
  /** 선택형일 때 radio로 읽힘 */
  role?: 'radio' | 'button';
  className?: string;
}

/**
 * 아이콘 타일 + 제목 + 설명이 있는 큰 선택 행.
 * 해당 없는 항목은 흐리게 두지 말고 목록에서 뺀다.
 */
export function OptionRow({ title, description, icon, leading, trailing, selected, onClick, role, className = '' }: OptionRowProps) {
  const isSelectable = selected !== undefined;
  return (
    <button
      type="button"
      role={role ?? (isSelectable ? 'radio' : undefined)}
      aria-checked={isSelectable ? selected : undefined}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-hs-xl py-3 ps-3.5 pe-3 text-start ${selected ? 'border-2 border-hs-brand-700 bg-hs-mint-100' : 'border-[1.5px] border-hs-line-200 bg-hs-surface-0'} ${className}`}
    >
      {(icon || leading) && (
        <span aria-hidden="true" className={`flex h-10 w-11 flex-none items-center justify-center rounded-t-[12px] rounded-b-[20px] text-hs-ink-900 ${selected ? 'bg-hs-surface-0' : 'bg-hs-surface-100'}`}>
          {leading ?? (icon && <HsIcon name={icon} size={19} />)}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-black text-hs-ink-900">{title}</span>
        {description && <span className="mt-px block text-[12px] font-semibold text-hs-ink-500">{description}</span>}
      </span>
      {trailing !== undefined && (
        <span className="flex flex-none items-center gap-0.5 text-[12px] font-extrabold text-hs-ink-500">
          {trailing}
          <HsIcon name="forward" size={16} strokeWidth={2.4} className={FLIP_RTL} />
        </span>
      )}
      {isSelectable && selected && trailing === undefined && <HsIcon name="check" size={18} strokeWidth={3} className="flex-none text-hs-brand-700" />}
    </button>
  );
}
