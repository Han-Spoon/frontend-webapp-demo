import { authFetch } from './authFetch';
import { ApiError } from './user';

export type ReviewAnswer = 'yes' | 'no' | 'unknown';
export type ReportReason = 'INAPPROPRIATE' | 'FALSE_INFORMATION' | 'AD_SPAM' | 'OTHER';
export interface ReviewMenu { name: string; answers: Record<string, ReviewAnswer>; note: string; }
export interface RestaurantReview {
  id: string;
  storeId: number | string;
  storeName: string;
  scanId: string | null;
  menus: ReviewMenu[];
  mine: boolean;
  createdAt: string;
  updatedAt: string;
}

async function parse<T>(response: Response): Promise<T> {
  const body = await response.text();
  if (!response.ok) throw new ApiError(response.status, body);
  if (!body) return undefined as T;
  const json = JSON.parse(body);
  return (json.data ?? json) as T;
}

export const getStoreReviews = (storeId: number) =>
  authFetch(`/api/v1/stores/${storeId}/reviews`).then(response => parse<RestaurantReview[]>(response));
export const getMyReviews = () =>
  authFetch('/api/v1/reviews/me').then(response => parse<RestaurantReview[]>(response));
export const createReview = (storeId: number, menus: ReviewMenu[], scanId?: string) =>
  authFetch(`/api/v1/stores/${storeId}/reviews`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scanId, menus }),
  }).then(response => parse<RestaurantReview>(response));
export const updateReview = (id: string, menus: ReviewMenu[]) =>
  authFetch(`/api/v1/reviews/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ menus }),
  }).then(response => parse<RestaurantReview>(response));
export const deleteReview = (id: string) =>
  authFetch(`/api/v1/reviews/${id}`, { method: 'DELETE' }).then(response => parse<void>(response));
export const reportReview = (id: string, reason: ReportReason) =>
  authFetch(`/api/v1/reviews/${id}/reports`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }),
  }).then(response => parse<void>(response));
