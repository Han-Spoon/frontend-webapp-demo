import { useLayoutEffect, useRef, useState } from 'react';
import type { Language } from '../../types';
import { txn, type CountText } from './text';

const MORE: CountText = {
  ko: (n) => `+${n}개`, en: (n) => `+${n} more`, ar: (n) => `+${n}`, 'zh-CN': (n) => `+${n}个`, ja: (n) => `+${n}件`, 'zh-TW': (n) => `+${n}個`, es: (n) => `+${n} más`,
};
const MAX_TAGS = 3;
const GAP = 5;

const TAG = 'inline-flex h-[26px] flex-none items-center whitespace-nowrap rounded-hs-pill px-[9px] text-[12px] font-extrabold';

/** 메뉴 태그 한 개(`# 이름`). 판정 화면의 관련 재료 태그(IngredientTag)와는 다른 컴포넌트. */
export function MenuTag({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`${TAG} max-w-full bg-hs-surface-100 text-hs-ink-700 ${className}`}>
      <span aria-hidden="true" className="me-0.5 text-hs-brand-700">#</span>
      <span className="truncate">{name}</span>
    </span>
  );
}

/**
 * 가게 메뉴 이름 태그 줄(디자인 시스템 MenuTag).
 * - 서버 순서 앞에서부터, 한 줄에 들어가는 만큼(최대 3개) + 나머지 `+N개`.
 * - 메뉴가 없으면 아무것도 그리지 않는다(줄 숨김).
 */
export function MenuTags({ language, names, label, className = '' }: { language: Language; names: string[]; label: string; className?: string }) {
  const rowRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const candidates = names.slice(0, MAX_TAGS);
  const [shown, setShown] = useState(candidates.length);

  useLayoutEffect(() => {
    const row = rowRef.current;
    const measure = measureRef.current;
    if (!row || !measure) return;
    const fit = () => {
      const width = row.clientWidth;
      const tags = Array.from(measure.querySelectorAll<HTMLElement>('[data-tag]')).map((element) => element.offsetWidth);
      const more = new Map(Array.from(measure.querySelectorAll<HTMLElement>('[data-more]')).map((element) => [Number(element.dataset.more), element.offsetWidth]));
      let count = tags.length;
      while (count > 1) {
        const rest = names.length - count;
        const used = tags.slice(0, count).reduce((sum, value) => sum + value, 0) + GAP * (count - 1) + (rest > 0 ? GAP + (more.get(rest) ?? 0) : 0);
        if (used <= width) break;
        count -= 1;
      }
      setShown(count);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(row);
    return () => observer.disconnect();
  }, [names.join('\u0000'), language]);

  if (names.length === 0) return null;
  const rest = names.length - shown;
  return (
    // 카드 버튼 안에도 들어가므로 span(목록 역할)으로 그린다.
    // overflow-hidden: 폭 재기용 줄이 밖으로 삐져나가 화면 가로 스크롤이 생기지 않게
    <span ref={rowRef} className={`relative block overflow-hidden ${className}`}>
      <span role="list" aria-label={label} className="flex min-w-0 gap-[5px] overflow-hidden">
        {candidates.slice(0, shown).map((name, index) => (
          <span role="listitem" key={`${name}-${index}`} className={`flex min-w-0 ${index === shown - 1 ? 'shrink' : 'flex-none'}`}><MenuTag name={name} className="min-w-0" /></span>
        ))}
        {rest > 0 && <span role="listitem" className="flex flex-none"><span className={`${TAG} border-[1.5px] border-hs-line-200 bg-hs-surface-0 text-hs-ink-500`}>{txn(language, MORE, rest)}</span></span>}
      </span>
      {/* 폭 재기용(보이지 않음): 후보 태그와 '+N개' 문구 */}
      <span ref={measureRef} aria-hidden="true" className="pointer-events-none invisible absolute start-0 top-0 flex gap-[5px] whitespace-nowrap">
        {candidates.map((name, index) => <span key={`${name}-${index}`} data-tag className={`${TAG} bg-hs-surface-100`}><span className="me-0.5">#</span>{name}</span>)}
        {candidates.map((_, index) => names.length - index - 1).filter((count) => count > 0).map((count) => (
          <span key={count} data-more={count} className={`${TAG} border-[1.5px]`}>{txn(language, MORE, count)}</span>
        ))}
      </span>
    </span>
  );
}
