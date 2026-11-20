import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { Language } from '../../App';
import { useReturnFocus } from './returnFocus';

interface ModalSheetProps {
  language: Language;
  onClose: () => void;
  children: ReactNode;
  /**
   * 화면에 제목이 따로 없을 때 스크린리더용 이름. 화면에 보이는 제목이 있으면
   * 이 값 대신 그 제목을 `<ModalSheetTitle asChild>`로 감싼다.
   */
  title?: string;
  /** 시트 상자 모양. 기본은 하단 시트(최대 430px, 높이 88dvh). */
  className?: string;
}

const DEFAULT_SHEET_CLASS = 'fixed bottom-0 left-1/2 z-50 max-h-[88dvh] w-full max-w-[430px] -translate-x-1/2 overflow-y-auto rounded-t-[1.5rem] border border-border-warm bg-surface-raised shadow-[var(--shadow-float)] animate-slide-up focus:outline-none';

/**
 * 하단 시트의 바깥 틀. 머리 영역과 내용은 각 시트가 그대로 그린다.
 * 열려 있는 동안만 렌더한다(`{open && <ModalSheet />}`).
 * Radix Dialog가 Esc 닫기·초점 가두기·뒤 화면 숨김·스크롤 잠금을, `useReturnFocus`가 닫을 때 초점 복귀를 맡는다.
 * 제목·설명이 정해진 단순 시트는 `discovery/BottomSheet`를 쓴다.
 */
export function ModalSheet({ language, onClose, children, title, className = DEFAULT_SHEET_CLASS }: ModalSheetProps) {
  const returnFocus = useReturnFocus();
  return (
    <Dialog.Root open onOpenChange={open => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-soy-ink/45" />
        <Dialog.Content dir={language === 'ar' ? 'rtl' : 'ltr'} aria-describedby={undefined} onCloseAutoFocus={returnFocus} className={className}>
          {title && <Dialog.Title className="sr-only">{title}</Dialog.Title>}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** 화면에 보이는 제목을 시트 이름으로 연결한다. 예: `<ModalSheetTitle asChild><h2>…</h2></ModalSheetTitle>` */
export const ModalSheetTitle = Dialog.Title;
