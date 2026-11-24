import { useRef, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { Language } from '../../locales';
import { useReturnFocus } from '../common/returnFocus';
import { HsButton } from './Button';
import { HsIcon, type HsIconName } from './icons';

interface HsDialogProps {
  language: Language;
  title: string;
  /** 함께 사라지는 것이 있으면 여기에 적는다(API 동작 그대로). */
  description?: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** danger: 되돌릴 수 없는 삭제 · 탈퇴(빨간 버튼) / brand: 그 밖(로그아웃 등, 초록 버튼) */
  tone?: 'danger' | 'brand';
  icon?: HsIconName;
  /** 처리 중 버튼 잠금, Esc · 바깥 누르기로 닫히지 않음 */
  busy?: boolean;
  error?: string;
  /** 설명 아래 추가 내용(삭제할 기록 미리보기 등) */
  children?: ReactNode;
}

/**
 * 가운데 확인 창(30 모서리, 그릇 모양 아이콘 56 + 제목 + 설명 + 두 버튼).
 * 왼쪽은 항상 [취소](soft). 처음 초점은 취소 버튼(위험한 동작이 기본 선택되지 않게).
 */
export function HsDialog({ language, title, description, cancelLabel, confirmLabel, onCancel, onConfirm, tone = 'brand', icon, busy = false, error, children }: HsDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useReturnFocus();
  const iconName = icon ?? (tone === 'danger' ? 'trash' : 'alert');
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-hs-scrim" />
        <Dialog.Content
          role="alertdialog"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          {...(description ? {} : { 'aria-describedby': undefined })}
          onOpenAutoFocus={(event) => { event.preventDefault(); cancelRef.current?.focus(); }}
          onCloseAutoFocus={returnFocus}
          onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }}
          onPointerDownOutside={(event) => { if (busy) event.preventDefault(); }}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-48px)] max-w-[382px] -translate-x-1/2 -translate-y-1/2 rounded-[30px] bg-hs-surface-0 px-5 pt-6 pb-[18px] text-center focus:outline-none"
        >
          <span aria-hidden="true" className={`mx-auto flex size-14 items-center justify-center rounded-t-[18px] rounded-b-[28px] ${tone === 'danger' ? 'bg-hs-danger-100 text-hs-danger-700' : 'bg-hs-mint-100 text-hs-brand-700'}`}>
            <HsIcon name={iconName} size={26} />
          </span>
          <Dialog.Title className="mt-3.5 hs-title-md text-hs-ink-900">{title}</Dialog.Title>
          {description && (
            <Dialog.Description asChild>
              <div className="mt-2 text-[14px] leading-[1.55] font-semibold text-hs-ink-500">{description}</div>
            </Dialog.Description>
          )}
          {children}
          {error && <p role="alert" className="mt-3 text-[13px] font-bold text-hs-danger-700">{error}</p>}
          <div className="mt-5 flex gap-2">
            <HsButton ref={cancelRef} variant="soft" className="flex-1" onClick={onCancel} busy={busy}>{cancelLabel}</HsButton>
            <HsButton variant={tone === 'danger' ? 'danger' : 'primary'} className="flex-1" onClick={onConfirm} busy={busy}>{confirmLabel}</HsButton>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
