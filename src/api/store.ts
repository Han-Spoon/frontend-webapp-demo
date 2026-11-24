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
  /** 상가정보 층 원본 값("1", "B1", "지", "반지층", ""). 문구는 프론트가 만든다. */
  floorInfo?: string;
  matchMethod: StoreMatchMethod;
}

/** 가게 상세(`GET /api/v1/stores/{storeId}`)의 메뉴 한 줄. 판정은 없다(판정은 스캔 결과에서만). */
export interface StoreMenu {
  storeMenuId: number;
  /** 한국어 메뉴 이름 */
  name: string;
  translatedName?: string | null;
  description?: string | null;
  priceText?: string | null;
  /** 스캔 결과와 같은 모양으로 본다(예시 응답은 빈 배열). */
  priceOptions?: Array<{ label: string; priceText: string; inferred?: boolean }> | null;
  /** 화면에 쓰지 않음 */
  menuId?: number | null;
  imageUrl?: string | null;
  imageAttribution?: string | null;
  imageSource?: string | null;
}

/** 가게 상세(`GET /api/v1/stores/{storeId}`, 2026-11-25 추가). 거리는 주지 않는다. */
export interface StoreDetail {
  storeId: number;
  name: string;
  branchName?: string | null;
  roadAddress?: string | null;
  /** 상가정보 층 원본 값("1", "B1", "지", "반지층", ""). */
  floorInfo?: string | null;
  latitude: number;
  longitude: number;
  categoryCode?: string | null;
  categoryName?: string | null;
  verified?: boolean;
  reviewCount?: number | null;
  thumbnailUrl?: string | null;
  /** 메뉴가 등록된 가게에만 있음(null 가능) */
  menus?: StoreMenu[] | null;
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

export async function getStoreDetail(storeId: number, signal?: AbortSignal): Promise<StoreDetail> {
  const response = await authFetch(`/api/v1/stores/${encodeURIComponent(String(storeId))}`, { method: 'GET', signal });
  const text = await response.text();
  if (!response.ok) {
    console.error('Store detail request failed:', response.status, text);
    throw new ApiError(response.status, text);
  }
  const json = text ? JSON.parse(text) : {};
  const data = (json.data ?? json) as Partial<StoreDetail>;
  if (typeof data.storeId !== 'number' || typeof data.name !== 'string') throw new Error('Invalid store detail response.');
  return { ...data, menus: Array.isArray(data.menus) ? data.menus : null } as StoreDetail;
}

/** 가게 상세를 후보 형식으로(저장 · 스캔 연결용 스냅숏). 거리는 모른다. */
export function storeDetailToCandidate(detail: StoreDetail, matchMethod: StoreMatchMethod = 'store_detail'): StoreCandidate {
  return {
    storeId: detail.storeId,
    name: detail.name,
    branchName: detail.branchName ?? null,
    roadAddress: detail.roadAddress ?? null,
    latitude: detail.latitude,
    longitude: detail.longitude,
    distanceMeters: null,
    categoryCode: detail.categoryCode ?? null,
    categoryName: detail.categoryName ?? null,
    verified: Boolean(detail.verified),
    reviewCount: detail.reviewCount ?? 0,
    floorInfo: detail.floorInfo ?? undefined,
    matchMethod,
  };
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
