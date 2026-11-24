import type { ReactNode } from 'react';
import { HsIcon } from './icons';

/**
 * 판정 문장 상자. surface-100 바탕 · 14 모서리 · 검정 글자(판정색을 쓰지 않는다).
 * verdict(14 · 900) → reason(13 · 600) → notes(구분선 아래 12 · 700 + ! 아이콘).
 */
export function VerdictBox({ verdict, reason, notes = [], className = '' }: { verdict: string; reason?: string | null; notes?: string[]; className?: string }) {
  return (
    <div className={`rounded-hs-md bg-hs-surface-100 px-3.5 py-3 ${className}`}>
      <p className="text-[14px] leading-[1.45] font-black text-hs-ink-900">{verdict}</p>
      {reason && <p className="mt-1 text-[13px] leading-[1.5] font-semibold text-hs-ink-900">{reason}</p>}
      {notes.length > 0 && (
        <div className="mt-2 space-y-1 border-t-[1.5px] border-hs-line-200 pt-2">
          {notes.map((note) => (
            <p key={note} className="flex items-start gap-1.5 text-[12px] leading-[1.5] font-bold text-hs-ink-900">
              <HsIcon name="alert" size={14} strokeWidth={2.4} className="mt-px flex-none text-hs-ink-500" />
              {note}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/** 안내 한 줄(! 아이콘 + ink-500 글자) */
export function HsNote({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`flex items-start gap-1.5 text-[12px] leading-[1.5] font-bold text-hs-ink-500 ${className}`}>
      <HsIcon name="alert" size={14} strokeWidth={2.4} className="mt-px flex-none" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** 화면 공통 안내 상자(목록 맨 아래 22 모서리). 안에 HsNote 여러 줄 + 링크. */
export function NoticeBox({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`space-y-1.5 rounded-hs-xl bg-hs-surface-100 px-4 py-3.5 ${className}`}>{children}</div>;
}
