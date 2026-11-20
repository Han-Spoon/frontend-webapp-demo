import { useState } from 'react';

/**
 * 모달을 닫을 때 연 버튼으로 초점을 돌려준다.
 *
 * Radix 모달은 닫힐 때 기본 복귀를 막고 `Dialog.Trigger`로 초점을 보내는데, 이 앱은 모달을
 * `{open && <Sheet />}`로 띄우고 Trigger를 쓰지 않아 초점이 body로 떨어진다.
 * 첫 렌더(= Radix가 초점을 옮기기 전)에 초점이 있던 요소를 기억했다가 `onCloseAutoFocus`에서 되돌린다.
 * 그 요소가 사라졌으면(예: 삭제한 항목의 버튼) 브라우저 기본 동작에 맡긴다.
 */
export function useReturnFocus() {
  const [opener] = useState(() =>
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : null,
  );
  return (event: Event) => {
    event.preventDefault();
    if (opener?.isConnected) opener.focus();
  };
}
