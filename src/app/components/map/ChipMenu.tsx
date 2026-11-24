import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { HsIcon } from '../hs/icons';

export interface ChipMenuOption<T extends string> {
  value: T;
  label: string;
}

/**
 * 칩 모양 버튼 + 아래(또는 위)로 열리는 선택 목록. 정렬 · 후기 필터에 쓴다.
 * 방향키 이동, Esc 닫기, 바깥 누르면 닫기.
 */
export function ChipMenu<T extends string>({ options, value, onChange, menuLabel, className, children, openUpward = false, align = 'start' }: {
  options: ChipMenuOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** 목록 이름(스크린리더) */
  menuLabel: string;
  className: string;
  children: ReactNode;
  openUpward?: boolean;
  align?: 'start' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]');
    (menuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]') ?? items?.[0])?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const close = () => { setOpen(false); buttonRef.current?.focus(); };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); items[(index + 1) % items.length]?.focus(); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); items[(index - 1 + items.length) % items.length]?.focus(); }
    else if (event.key === 'Tab') setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative flex-none">
      <button ref={buttonRef} type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} className={className}>
        {children}
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={menuLabel}
          onKeyDown={onKeyDown}
          className={`absolute z-50 min-w-44 max-w-[260px] rounded-hs-lg bg-hs-surface-0 p-1 shadow-[0_10px_30px_rgba(23,32,28,0.16)] ${align === 'end' ? 'end-0' : 'start-0'} ${openUpward ? 'bottom-full mb-2' : 'top-full mt-2'}`}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={option.value === value}
              onClick={() => { onChange(option.value); close(); }}
              className="flex min-h-11 w-full items-center justify-between gap-3 rounded-hs-md px-3 text-start text-[14px] font-extrabold text-hs-ink-900 hover:bg-hs-surface-100 focus:bg-hs-surface-100 focus:outline-none"
            >
              <span className="min-w-0 truncate">{option.label}</span>
              {option.value === value && <HsIcon name="check" size={16} strokeWidth={2.6} className="flex-none text-hs-brand-700" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
