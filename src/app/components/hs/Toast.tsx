import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { HsIcon } from './icons';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
}

interface ToastApi {
  show: (message: string, options?: { tone?: ToastTone; action?: ToastItem['action'] }) => void;
}

const ToastContext = createContext<ToastApi>({ show: () => {} });

/** 하단 내비 위에 잠깐 뜨는 진한 알약 알림. 3초 뒤 사라짐(행동 버튼이 있으면 5초). 행동은 하나까지. */
export function ToastProvider({ children, bottomOffset = 96 }: { children: ReactNode; bottomOffset?: number }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const show = useCallback<ToastApi['show']>((message, options) => {
    clearTimeout(timer.current);
    const item = { id: Date.now(), message, tone: options?.tone ?? 'info', action: options?.action };
    setToast(item);
    timer.current = setTimeout(() => setToast(null), item.action ? 5000 : 3000);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {/* 앱 틀(.mobile-container)은 isolation: isolate라 시트(body 포털) 위에 보이도록 body로 뺀다. */}
      {createPortal(<div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 z-[60] mx-auto flex w-full max-w-[430px] justify-center px-4" style={{ bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom))` }}>
        {toast && <ToastPill key={toast.id} item={toast} onDone={() => setToast(null)} />}
      </div>, document.body)}
    </ToastContext.Provider>
  );
}

/** 알림 한 줄(C-05): ink-900 20 모서리 + 그림자, 아이콘(성공 민트 ✓ · 실패 빨간 ! · 안내 연민트 !) + 글자 + 행동 하나 */
export function ToastPill({ item, onDone }: { item: Omit<ToastItem, 'id'>; onDone?: () => void }) {
  return (
    <div className="pointer-events-auto flex min-h-[52px] w-full items-center gap-2.5 rounded-[20px] bg-hs-ink-900 py-2 ps-4 pe-2 text-[14px] leading-[1.4] font-extrabold text-hs-surface-0 shadow-[0_12px_30px_rgba(23,32,28,0.25)] animate-slide-up">
      {item.tone === 'success' && <HsIcon name="check" size={18} strokeWidth={2.8} className="flex-none text-[#7BE0AE]" />}
      {item.tone === 'error' && <HsIcon name="alert" size={18} strokeWidth={2.4} className="flex-none text-[#FF9A90]" />}
      {item.tone === 'info' && <HsIcon name="alert" size={18} strokeWidth={2.4} className="flex-none text-hs-mint-200" />}
      <span className="min-w-0 flex-1">{item.message}</span>
      {item.action && (
        <button type="button" onClick={() => { item.action?.onClick(); onDone?.(); }} className="h-8 min-w-11 flex-none rounded-hs-pill bg-white/15 px-2.5 text-[12px] font-black">
          {item.action.label}
        </button>
      )}
    </div>
  );
}

export const useToast = () => useContext(ToastContext);
