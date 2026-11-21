import type { ComponentType } from 'react';

export type LazyScreen<P> = ComponentType<P> & {
  /** 화면 코드 미리 받기. 실패해도 조용히 넘어가고, 그 화면에 들어갈 때 다시 받는다. */
  preload: () => void;
};

const failureResets = new Set<() => void>();

/** 받기에 실패한 화면을 다음 렌더에서 다시 받게 한다. 화면 오류 경계의 [다시 시도]에서 호출. */
export function retryFailedScreens() {
  failureResets.forEach((reset) => reset());
}

/**
 * 화면별 코드 묶음 지연 로딩. `React.lazy`와 달리 받기 실패를 영구히 기억하지 않는다.
 * 실패는 화면 오류 경계로 넘기고, `retryFailedScreens()` 뒤 다시 그리면 새로 받는다.
 * 실패를 바로 지우지 않는 이유: React가 오류 난 렌더를 한 번 더 시도해 끝없이 다시 받게 된다.
 */
export function lazyScreen<P extends object>(load: () => Promise<ComponentType<P>>): LazyScreen<P> {
  let Loaded: ComponentType<P> | null = null;
  let pending: Promise<void> | null = null;
  let failure: unknown = null;
  failureResets.add(() => { failure = null; });

  const fetchOnce = () => {
    pending ??= load().then(
      (component) => { Loaded = component; },
      (error: unknown) => { pending = null; throw error; },
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
