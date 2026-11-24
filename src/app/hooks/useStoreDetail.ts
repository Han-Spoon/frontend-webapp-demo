import { useCallback, useEffect, useState } from 'react';
import { getStoreDetail, type StoreDetail } from '../../api/store';
import { demoStoreDetail } from '../demo/storeDetails';

/**
 * 가게 상세(`GET /api/v1/stores/{storeId}`). 지도 미리보기 · 가게 상세 · 홈 · 칼럼 카드가 같이 쓰므로
 * 이번 세션 동안 storeId별로 기억한다(같은 가게를 다시 부르지 않음). 실패는 기억하지 않아 다시 시도할 수 있다.
 * 시연 모드는 `demo/storeDetails.ts` fixture.
 */
const cache = new Map<number, StoreDetail>();
const pending = new Map<number, Promise<StoreDetail>>();

function load(storeId: number, demoMode: boolean): Promise<StoreDetail> {
  const cached = cache.get(storeId);
  if (cached) return Promise.resolve(cached);
  const running = pending.get(storeId);
  if (running) return running;
  const request = (demoMode
    ? new Promise<StoreDetail>((resolve, reject) => {
      // 불러오는 중 상태를 볼 수 있게 조금 기다린다.
      window.setTimeout(() => {
        const detail = demoStoreDetail(storeId);
        if (detail) resolve(detail); else reject(new Error('Unknown demo store.'));
      }, 350);
    })
    : getStoreDetail(storeId))
    .then((detail) => { cache.set(storeId, detail); return detail; })
    .finally(() => { pending.delete(storeId); });
  pending.set(storeId, request);
  return request;
}

export type StoreDetailState =
  | { status: 'loading'; detail: null }
  | { status: 'ready'; detail: StoreDetail }
  | { status: 'error'; detail: null };

export function useStoreDetail(storeId: number | null, demoMode: boolean): StoreDetailState & { retry: () => void } {
  const [state, setState] = useState<StoreDetailState>(() => {
    const cached = storeId === null ? undefined : cache.get(storeId);
    return cached ? { status: 'ready', detail: cached } : { status: 'loading', detail: null };
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (storeId === null) return;
    const cached = cache.get(storeId);
    if (cached) { setState({ status: 'ready', detail: cached }); return; }
    let active = true;
    setState({ status: 'loading', detail: null });
    load(storeId, demoMode)
      .then((detail) => { if (active) setState({ status: 'ready', detail }); })
      .catch(() => { if (active) setState({ status: 'error', detail: null }); });
    return () => { active = false; };
  }, [storeId, demoMode, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { ...state, retry };
}
