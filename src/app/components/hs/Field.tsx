import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import type { Language } from '../../locales';
import { HsIcon } from './icons';
import { tx } from './text';

const CLEAR = { ko: '검색어 지우기', en: 'Clear search', ar: 'مسح البحث', 'zh-CN': '清除搜索', ja: '検索をクリア', 'zh-TW': '清除搜尋', es: 'Borrar búsqueda' };

interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  language: Language;
  /** 스크린리더 이름(자리 글자와 같아도 됨) */
  label: string;
}

/** 검색 칸(알약, surface-100, 52 높이). 지우기 X는 입력이 있을 때만. */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField({ value, onChange, language, label, className = '', ...rest }, ref) {
  return (
    <div className={`hs-search flex h-[52px] items-center gap-2.5 rounded-hs-pill bg-hs-surface-100 ps-4 pe-1.5 ${className}`}>
      <HsIcon name="search" size={18} className="flex-none text-hs-ink-500" />
      <input
        ref={ref}
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-bold text-hs-ink-900 outline-none placeholder:text-hs-ink-500 [&::-webkit-search-cancel-button]:hidden"
        {...rest}
      />
      {value && (
        <button type="button" aria-label={tx(language, CLEAR)} onClick={() => onChange('')} className="flex size-11 flex-none items-center justify-center rounded-hs-pill text-hs-ink-500">
          <HsIcon name="x" size={18} />
        </button>
      )}
    </div>
  );
});

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  label: string;
  /** 보이는 라벨(없으면 스크린리더 이름만) */
  showLabel?: boolean;
  /** 글자 수 제한이 있으면 오른쪽 아래 N / 최대 */
  maxLength?: number;
  error?: string;
}

/** 입력 칸(18 모서리, line-200 테두리, 포커스 2px brand-700) */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField({ value, onChange, label, showLabel = false, maxLength, error, className = '', ...rest }, ref) {
  const id = useId();
  return (
    <div className={className}>
      {showLabel && <label htmlFor={id} className="mb-1.5 block text-[13px] font-extrabold text-hs-ink-900">{label}</label>}
      <input
        ref={ref}
        id={id}
        aria-label={showLabel ? undefined : label}
        aria-invalid={error ? true : undefined}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className={`h-[52px] w-full rounded-hs-lg border-[1.5px] bg-hs-surface-0 px-4 text-[15px] font-extrabold text-hs-ink-900 outline-none focus:border-2 focus:border-hs-brand-700 ${error ? 'border-hs-danger-500' : 'border-hs-line-200'}`}
        {...rest}
      />
      <div className="mt-1 flex items-start gap-2">
        {error && <p role="alert" className="flex-1 text-[12px] font-bold text-hs-danger-700">{error}</p>}
        {maxLength !== undefined && <p dir="ltr" className="ms-auto text-[11px] font-bold text-hs-ink-500">{[...value].length} / {maxLength}</p>}
      </div>
    </div>
  );
});
