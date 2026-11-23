import { authFetch } from './authFetch';
import { ApiError } from './user';

export type StoreMatchMethod = 'gps_candidate' | 'name_search' | 'kakao_fallback' | 'store_detail';

export interface StoreCandidate {
  storeId: number;
  name: string;
  branchName?: string | null;
  roadAddress?: string | null;
  latitude: number;
  longitude: number;
  /** 좌표 없이 이름으로 찾으면 null(명세 V2). */
  distanceMeters: number | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  verified: boolean;
  reviewCount?: number;
  /** 상가정보 층 원본 값("1", "B1", "지", "반지층", ""). 문구는 프론트가 만든다. 배포 전 서버에는 없음. */
  floorInfo?: string;
  matchMethod: StoreMatchMethod;
}

export interface StoreSummary {
  storeId: number;
  name: string;
}

export interface StoreCandidateRequest {
  latitude?: number;
  longitude?: number;
  query?: string;
  radiusMeters?: number;
  limit?: number;
}

interface StoreCandidateResponse {
  items: StoreCandidate[];
}

export async function findStoreCandidates(
  payload: StoreCandidateRequest,
  signal?: AbortSignal,
): Promise<StoreCandidate[]> {
  const response = await authFetch('/api/v1/stores/candidates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  const text = await response.text();

  if (!response.ok) {
    console.error('Store candidate request failed:', response.status, text);
    throw new ApiError(response.status, text);
  }

  const json = text ? JSON.parse(text) : {};
  const data = (json.data ?? json) as Partial<StoreCandidateResponse>;
  if (!Array.isArray(data.items)) {
    throw new Error('Invalid store candidate response.');
  }
  return deduplicateStores(data.items);
}

/** Collapse exact duplicates only; keep distinct branches or differing coordinates. */
export function deduplicateStores(items: StoreCandidate[]): StoreCandidate[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const address = item.roadAddress?.trim().replace(/\s+/g, ' ');
    const key = address && Number.isFinite(item.latitude) && Number.isFinite(item.longitude)
      ? JSON.stringify([item.name.trim(), item.branchName?.trim() ?? '', address, item.latitude, item.longitude])
      : 'id:' + item.storeId;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
