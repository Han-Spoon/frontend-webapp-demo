import { useRef, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { Language } from '../../App';
import { useReturnFocus } from './returnFocus';

interface ConfirmDialogProps {
  language: Language;
  title: string;
  description?: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** danger: 되돌릴 수 없는 삭제·탈퇴. default: 그 밖의 확인. */
  tone?: 'danger' | 'default';
  /** 처리 중에는 버튼을 막고 Esc·바깥 누르기로도 닫히지 않게 한다. */
  busy?: boolean;
  error?: string;
}

/**
 * 가운데 확인창. 열려 있는 동안만 렌더한다(`{open && <ConfirmDialog />}`).
 * Radix Dialog가 Esc 닫기·초점 가두기·뒤 화면 숨김을, `useReturnFocus`가 닫을 때 초점 복귀를 맡는다.
 * 처음 초점은 취소 버튼 — 위험한 동작이 기본 선택이 되지 않게.
 */
export function ConfirmDialog({
  language,
  title,
  description,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  tone = 'default',
  busy = false,
  error,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useReturnFocus();
  const confirmClass = tone === 'danger'
    ? 'border-status-danger-text text-status-danger-text'
    : 'border-brand-primary text-brand-primary';

  return (
    <Dialog.Root open onOpenChange={open => { if (!open && !busy) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-soy-ink/45" />
        <Dialog.Content
          role="alertdialog"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          {...(description ? {} : { 'aria-describedby': undefined })}
          onOpenAutoFocus={event => { event.preventDefault(); cancelRef.current?.focus(); }}
          onCloseAutoFocus={returnFocus}
          onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}
          onPointerDownOutside={event => { if (busy) event.preventDefault(); }}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-warm bg-surface-raised p-5 shadow-2xl"
        >
          <Dialog.Title className="text-lg font-extrabold text-text-primary">{title}</Dialog.Title>
          {description && (
            <Dialog.Description asChild>
              <div className="mt-2 text-sm leading-6 text-text-secondary">{description}</div>
            </Dialog.Description>
          )}
          {error && <p role="alert" className="mt-3 text-sm font-semibold text-status-danger-text">{error}</p>}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="min-h-12 rounded-[18px] border border-border-warm text-sm font-bold text-text-primary disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              aria-busy={busy}
              className={`min-h-12 rounded-[18px] border text-sm font-bold disabled:opacity-50 ${confirmClass}`}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
