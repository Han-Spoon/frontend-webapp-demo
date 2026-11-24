import { useEffect, useState, type ReactNode } from 'react';
import type { Language } from '../../locales';
import { HsIcon, type HsIconName } from './icons';
import { BowlTile } from './RiskBadge';
import { HS_TEXT, tx } from './text';

/** 지금 연결 상태 */
export function useOnline() {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

/** 오프라인 배너: 상단 제목 바로 아래 ink-900 배너 + [다시 시도]. 연결되어 있으면 그리지 않는다. */
export function OfflineBanner({ language, onRetry, force = false, className = '' }: { language: Language; onRetry?: () => void; force?: boolean; className?: string }) {
  const online = useOnline();
  if (online && !force) return null;
  return (
    <div role="status" className={`flex min-h-[54px] items-center gap-2.5 rounded-[18px] bg-hs-ink-900 py-2.5 ps-3.5 pe-2.5 text-[13px] font-bold text-hs-surface-0 ${className}`}>
      <HsIcon name="offline" size={18} className="flex-none" />
      <span className="min-w-0 flex-1 leading-[1.4]">{tx(language, HS_TEXT.offline)}</span>
      <button type="button" onClick={onRetry ?? (() => window.location.reload())} className="h-[34px] min-w-11 flex-none rounded-hs-pill bg-hs-surface-0 px-3 text-[12px] font-black text-hs-ink-900">
        {tx(language, HS_TEXT.retry)}
      </button>
    </div>
  );
}

/** 빈 상태: 점선 상자 + 그릇 모양 아이콘(mint-100) + 제목 + 설명(+ 필요할 때만 버튼) */
const EMPTY_TONE = {
  mint: 'bg-hs-mint-100 text-hs-brand-700',
  coral: 'bg-hs-coral-100 text-hs-orange-500',
  neutral: 'bg-hs-surface-100 text-hs-ink-700',
} as const;

export function EmptyState({ icon = 'scan', title, description, action, tone = 'mint', className = '' }: { icon?: HsIconName; title: string; description?: ReactNode; action?: ReactNode; tone?: keyof typeof EMPTY_TONE; className?: string }) {
  return (
    <div className={`rounded-3xl border-[1.5px] border-dashed border-hs-line-dash px-5 py-[26px] text-center ${className}`}>
      <BowlTile className={`mx-auto h-12 w-[52px] ${EMPTY_TONE[tone]}`}><HsIcon name={icon} size={22} /></BowlTile>
      <h3 className="mt-3 text-[16px] font-black text-hs-ink-900">{title}</h3>
      {description && <p className="mt-1 text-[13px] font-semibold text-hs-ink-500">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/** 불러오기 실패(C-03): 연한 빨강 테두리 흰 상자 + 그릇 모양 경고 아이콘 + 제목 + 설명 + [↻ 다시 시도](초록 테두리) */
export function ErrorState({ language, title, description, onRetry, className = '' }: { language: Language; title: string; description?: ReactNode; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={`rounded-3xl border-[1.5px] border-[#F6CFCB] bg-hs-surface-0 px-[18px] pt-5 pb-[18px] text-center ${className}`}>
      <BowlTile className="mx-auto size-12 bg-[#FFE9E7] text-hs-danger-700"><HsIcon name="alert" size={22} strokeWidth={2.4} /></BowlTile>
      <h3 className="mt-3 text-[15px] font-black text-hs-ink-900">{title}</h3>
      {description && <p className="mt-1 text-[12px] leading-[1.5] font-semibold text-hs-ink-500">{description}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3.5 inline-flex h-11 items-center gap-1.5 rounded-hs-pill border-[1.5px] border-hs-brand-700 bg-hs-surface-0 px-5 text-[14px] font-black text-hs-brand-700">
          <HsIcon name="refresh" size={16} strokeWidth={2.6} />
          {tx(language, HS_TEXT.retry)}
        </button>
      )}
    </div>
  );
}

/** 항목 하나만 실패: 그 카드 바로 아래 빨간 한 줄 */
export function InlineError({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p role="alert" className={`flex items-start gap-1.5 text-[12px] font-bold text-hs-danger-700 ${className}`}>
      <HsIcon name="alert" size={14} strokeWidth={2.4} className="mt-px flex-none" />
      {children}
    </p>
  );
}

/** 회색 스켈레톤 줄 */
export function SkeletonLine({ width = '100%', className = '' }: { width?: string; className?: string }) {
  return <i aria-hidden="true" className={`block h-3 rounded-hs-pill bg-hs-surface-skeleton ${className}`} style={{ width }} />;
}

/** 불러오는 중: 실제 카드 모양 그대로의 회색 스켈레톤. 스크린리더에는 '불러오는 중…' */
export function SkeletonCard({ language, lines = ['60%', '35%'], className = '' }: { language: Language; lines?: string[]; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`rounded-hs-xl bg-hs-surface-0 p-4 ${className}`}>
      <span className="sr-only">{tx(language, HS_TEXT.loading)}</span>
      {lines.map((width, index) => <SkeletonLine key={index} width={width} className={index ? 'mt-2.5' : ''} />)}
    </div>
  );
}
