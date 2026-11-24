import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
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
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 z-[60] mx-auto flex w-full max-w-[430px] justify-center px-5" style={{ bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom))` }}>
        {toast && <ToastPill key={toast.id} item={toast} onDone={() => setToast(null)} />}
      </div>
    </ToastContext.Provider>
  );
}

export function ToastPill({ item, onDone }: { item: Omit<ToastItem, 'id'>; onDone?: () => void }) {
  return (
    <div className="pointer-events-auto flex min-h-11 w-full items-center gap-2 rounded-hs-pill bg-hs-ink-900 py-1.5 ps-3.5 pe-2 text-[13px] font-extrabold text-hs-surface-0 animate-slide-up">
      {item.tone === 'success' && <HsIcon name="check" size={16} strokeWidth={3} className="flex-none text-hs-safe-500" />}
      {item.tone === 'error' && <HsIcon name="alert" size={16} strokeWidth={2.6} className="flex-none text-hs-danger-500" />}
      <span className="min-w-0 flex-1">{item.message}</span>
      {item.action && (
        <button type="button" onClick={() => { item.action?.onClick(); onDone?.(); }} className="h-[30px] flex-none rounded-hs-pill bg-white/15 px-2.5 text-[12px] font-extrabold">
          {item.action.label}
        </button>
      )}
    </div>
  );
}

export const useToast = () => useContext(ToastContext);
