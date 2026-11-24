import type { ReactNode } from 'react';
import type { Language } from '../../locales';
import { HsIcon } from './icons';
import { EVIDENCE_LABEL, RISK_COLOR, RISK_ICON, RISK_LABEL, type HsRisk } from './risk';
import { tx } from './text';

/**
 * 판정 상태 배지. 항상 글자 + 아이콘 + 색.
 * - size="lg": 28 높이, 점 안 아이콘(요약 · 저장한 음식)
 * - size="sm": 24 높이 글자 배지(메뉴 카드 머리). 아이콘은 옆 판정 타일이 맡는다.
 */
export function RiskBadge({ risk, language, size = 'sm', label, className = '' }: { risk: HsRisk; language: Language; size?: 'sm' | 'lg'; label?: string; className?: string }) {
  const c = RISK_COLOR[risk];
  const text = label ?? tx(language, RISK_LABEL[risk]);
  if (size === 'lg') {
    return (
      <span className={`inline-flex h-7 flex-none items-center gap-1 rounded-hs-pill ps-[5px] pe-2.5 text-[13px] font-black ${c.bg} ${c.fg} ${className}`}>
        <span className={`inline-flex size-5 items-center justify-center rounded-hs-pill text-white ${c.dot}`}>
          <HsIcon name={RISK_ICON[risk]} size={12} strokeWidth={3.4} />
        </span>
        {text}
      </span>
    );
  }
  return (
    <span className={`inline-flex h-6 flex-none items-center rounded-hs-pill px-[9px] text-[12px] font-black ${c.bg} ${c.fg} ${className}`}>
      {text}
    </span>
  );
}

/** 개수 배지(스캔 기록 카드: 주의 5개 · 위험 3개). 아이콘 없이 판정색 글자. */
export function RiskCountBadge({ risk, children }: { risk: HsRisk; children: string }) {
  const c = RISK_COLOR[risk];
  return <span className={`inline-flex h-6 flex-none items-center rounded-hs-pill px-[9px] text-[11px] font-black ${c.bg} ${c.fg}`}>{children}</span>;
}

/**
 * 근거 배지. 흰 바탕 · 무채색. confirmed = 사장님 확인 기준(방패), estimated = 추정 확률 기준.
 * unknown(정보 부족) 배지는 없다.
 */
export function EvidenceBadge({ basis, language }: { basis: 'confirmed' | 'estimated' | 'unknown' | null | undefined; language: Language }) {
  if (basis !== 'confirmed' && basis !== 'estimated') return null;
  const confirmed = basis === 'confirmed';
  return (
    <span className={`inline-flex h-[22px] flex-none items-center gap-[3px] rounded-hs-pill border-[1.5px] bg-hs-surface-0 px-2 text-[11px] font-extrabold ${confirmed ? 'border-hs-line-300 text-hs-ink-900' : 'border-hs-line-200 text-hs-ink-500'}`}>
      {confirmed && <HsIcon name="shield" size={12} strokeWidth={2.4} />}
      {tx(language, EVIDENCE_LABEL[basis])}
    </span>
  );
}

/** 그릇 모양 타일(위 16 / 아래 26 모서리). 크기 · 색은 쓰는 곳이 정한다. */
export function BowlTile({ className = '', children }: { className?: string; children?: ReactNode }) {
  return (
    <span aria-hidden="true" className={`flex flex-none items-center justify-center rounded-t-hs-bowl-top rounded-b-hs-bowl-bottom ${className}`}>
      {children}
    </span>
  );
}

/** 메뉴 카드 왼쪽 52px 판정 타일(메뉴 사진 자리). 장식이라 aria-hidden, 상태는 옆 배지가 읽어 준다. */
export function RiskTile({ risk, className = '' }: { risk: HsRisk; className?: string }) {
  const c = RISK_COLOR[risk];
  return (
    <BowlTile className={`size-[var(--hs-size-tile)] ${c.bg} ${c.fg} ${className}`}>
      <HsIcon name={RISK_ICON[risk]} size={24} strokeWidth={3} />
    </BowlTile>
  );
}
