import { useState } from 'react';

/**
 * 모달을 닫을 때 연 버튼으로 초점 복귀.
 * Trigger 없이 `{open && <Sheet />}`로 띄우는 구조라 Radix 기본 복귀는 body로 떨어짐.
 * 첫 렌더(Radix 초점 이동 전)의 초점 요소를 기억해 `onCloseAutoFocus`에서 복귀. 요소가 사라졌으면 브라우저 기본 동작.
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
