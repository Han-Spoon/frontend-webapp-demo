import type { ComponentType } from 'react';

export type LazyScreen<P> = ComponentType<P> & {
  /** 화면 코드 미리 받기. 실패는 무시, 화면 진입 시 다시 받음. */
  preload: () => void;
};

let loadFailed = false;
export const hasScreenLoadFailure = () => loadFailed;
const failureResets = new Set<() => void>();

/** 받기 실패한 화면을 다음 렌더에서 다시 받게 함. 화면 오류 경계 [다시 시도]에서 호출. */
export function retryFailedScreens() {
  if (loadFailed) { window.location.reload(); return; }
  failureResets.forEach((reset) => reset());
}

/**
  * 화면별 코드 지연 로딩. `React.lazy`와 달리 받기 실패를 영구 기억하지 않음.
  * 실패는 화면 오류 경계로, `retryFailedScreens()` 뒤 다시 그리면 새로 받음.
  * 실패를 바로 지우지 않는 이유: React가 오류 렌더를 한 번 더 시도해 무한 재요청.
 */
export function lazyScreen<P extends object>(load: () => Promise<ComponentType<P>>): LazyScreen<P> {
  let Loaded: ComponentType<P> | null = null;
  let pending: Promise<void> | null = null;
  let failure: unknown = null;
  failureResets.add(() => { failure = null; });

  const fetchOnce = () => {
    pending ??= load().then(
      (component) => { Loaded = component; },
      (error: unknown) => { loadFailed = true; pending = null; throw error; },
    );
    return pending;
  };

  function Screen(props: P) {
    if (Loaded) return <Loaded {...props} />;
    if (failure) throw failure;
    throw fetchOnce().catch((error: unknown) => { failure = error; });
  }

  return Object.assign(Screen, {
    preload: () => {
      if (!Loaded) fetchOnce().catch(() => {});
    },
  });
}
