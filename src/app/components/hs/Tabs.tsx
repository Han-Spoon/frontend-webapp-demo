interface TabsProps<T extends string> {
  items: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

/** 1단계 탭(화면 나누기): surface-100 트랙, 선택은 흰 알약 + 그림자 */
export function PillTabs<T extends string>({ items, value, onChange, label, className = '' }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={`flex rounded-hs-pill bg-hs-surface-100 p-1 ${className}`}>
      {items.map((item) => {
        const on = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(item.value)}
            className={`h-10 flex-1 rounded-hs-pill text-[13px] ${on ? 'bg-hs-surface-0 font-black text-hs-ink-900 shadow-[0_2px_8px_rgba(23,32,28,0.08)]' : 'font-extrabold text-hs-ink-500'}`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

/** 2단계 탭(같은 화면 안 목록 바꾸기): 밑줄 탭, 선택은 ink-900 글자 + 2.5px 밑줄 */
export function UnderlineTabs<T extends string>({ items, value, onChange, label, className = '' }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={`flex border-b-[1.5px] border-hs-line-200 ${className}`}>
      {items.map((item) => {
        const on = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(item.value)}
            className={`-mb-[1.5px] h-11 flex-1 border-b-[2.5px] text-[14px] ${on ? 'border-hs-ink-900 font-black text-hs-ink-900' : 'border-transparent font-extrabold text-hs-ink-500'}`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
