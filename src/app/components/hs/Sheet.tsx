import { useRef, type ReactNode, type PointerEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { Language } from '../../locales';
import { useReturnFocus } from '../common/returnFocus';
import { HsIconButton } from './IconButton';
import { FLIP_RTL } from './icons';
import { HS_TEXT, tx } from './text';

export interface SheetPager {
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

interface HsSheetProps {
  language: Language;
  onClose: () => void;
  title: string;
  /** 제목 아래 작은 줄(메뉴 이름 등) */
  subtitle?: ReactNode;
  /** 여러 장 카드: 오른쪽 위 X 대신 ‹ › + 진행 막대. 닫기는 끌어내리기 · 바깥 누르기. */
  pager?: SheetPager;
  /** 맨 아래 고정(주 버튼 CTA 56) */
  footer?: ReactNode;
  children: ReactNode;
  /** 내용 영역 좌우 여백을 직접 정할 때 */
  bodyClassName?: string;
  /** 제목 줄 대신 보일 내용(칩 등). 제목은 스크린리더 이름으로만 남는다. */
  header?: ReactNode;
}

/**
 * 화면 위로 올라오는 시트. 위 두 모서리 32, 손잡이 40×5, 뒤는 scrim.
 * Radix Dialog 기반: Esc · 바깥 누르기 닫기, 초점 가두기, 닫을 때 초점 복귀.
 * 열려 있는 동안만 렌더한다(`{open && <HsSheet … />}`).
 */
export function HsSheet({ language, onClose, title, subtitle, pager, footer, children, bodyClassName = 'px-5', header }: HsSheetProps) {
  const returnFocus = useReturnFocus();
  const drag = useRef<{ y: number; id: number } | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  // 손잡이 · 머리를 아래로 끌면 닫기(80px 넘게)
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    drag.current = { y: event.clientY, id: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !panel.current) return;
    const dy = Math.max(0, event.clientY - drag.current.y);
    panel.current.style.transform = `translateY(${dy}px)`;
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !panel.current) return;
    const dy = event.clientY - drag.current.y;
    drag.current = null;
    panel.current.style.transform = '';
    if (dy > 80) onClose();
  };

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-hs-scrim" />
        <Dialog.Content
          ref={panel}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          aria-describedby={undefined}
          onCloseAutoFocus={returnFocus}
          className="fixed bottom-0 left-1/2 z-50 flex max-h-[90dvh] w-full max-w-[430px] -translate-x-1/2 flex-col rounded-t-hs-sheet bg-hs-surface-0 animate-slide-up focus:outline-none"
        >
          <div onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} className="flex-none touch-none">
            <div className="flex justify-center pt-2.5" aria-hidden="true">
              <i className="h-[5px] w-10 rounded-hs-pill bg-hs-line-300" />
            </div>
            <div className="flex items-center gap-2 ps-6 pe-5 pt-3">
              <div className="min-w-0 flex-1">
                <Dialog.Title className={header ? 'sr-only' : 'hs-title-md text-hs-ink-900'}>{title}</Dialog.Title>
                {header}
                {subtitle && <div className="mt-[3px] text-[13px] font-extrabold text-hs-ink-500">{subtitle}</div>}
              </div>
              {pager ? (
                <div className="flex flex-none gap-1.5">
                  <HsIconButton icon="back" tone="soft" label={tx(language, HS_TEXT.prevCard)} iconClassName={FLIP_RTL} disabled={pager.index <= 0} onClick={pager.onPrev} />
                  <HsIconButton icon="forward" tone="soft" label={tx(language, HS_TEXT.nextCard)} iconClassName={FLIP_RTL} disabled={pager.index >= pager.total - 1} onClick={pager.onNext} />
                </div>
              ) : (
                <Dialog.Close asChild>
                  <HsIconButton icon="x" tone="soft" label={tx(language, HS_TEXT.close)} />
                </Dialog.Close>
              )}
            </div>
            {pager && pager.total > 1 && (
              <div className="flex gap-1 px-6 pt-3" aria-hidden="true">
                {Array.from({ length: pager.total }, (_, i) => (
                  <span key={i} className={`h-[5px] flex-1 rounded-hs-pill ${i <= pager.index ? 'bg-hs-ink-900' : 'bg-[#E1E8E4]'}`} />
                ))}
              </div>
            )}
          </div>
          <div className={`min-h-0 flex-1 overflow-y-auto pt-3.5 pb-5 ${bodyClassName}`}>{children}</div>
          {footer && <div className="flex-none px-5 pt-2 pb-[max(20px,env(safe-area-inset-bottom))]">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
