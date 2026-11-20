import { authFetch } from './authFetch';
import { ApiError } from './user';

export type ReviewAnswer = 'present' | 'absent' | 'unknown';
export interface ReviewMenu {
  name: string;
  scanMenuId?: string | null;
  answers: Record<string, ReviewAnswer>;
  comment?: string | null;
  commentLocale?: string | null;
}
export interface Review {
  reviewId: string;
  storeId: number;
  storeName: string;
  scanId: string | null;
  menus: ReviewMenu[];
  mine: boolean;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
}
export type ReviewReportReason = 'inappropriate' | 'false_info' | 'spam' | 'other';

async function parse<T>(response: Response): Promise<T> {
  const body = await response.text();
  if (!response.ok) throw new ApiError(response.status, body);
  const json = body ? JSON.parse(body) : null;
  return (json?.data ?? json) as T;
}

export async function getStoreReviews(storeId: number): Promise<Review[]> {
  return parse<Review[]>(await authFetch(`/api/v1/stores/${storeId}/reviews`));
}

export async function getMyReviews(): Promise<Review[]> {
  return parse<Review[]>(await authFetch('/api/v1/reviews/me'));
}

export async function createReview(storeId: number, menus: ReviewMenu[], scanId?: string): Promise<Review> {
  return parse<Review>(await authFetch(`/api/v1/stores/${storeId}/reviews`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(scanId ? { scanId } : {}), menus }),
  }));
}

export async function updateReview(reviewId: string, menus: ReviewMenu[]): Promise<Review> {
  return parse<Review>(await authFetch(`/api/v1/reviews/${reviewId}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ menus }),
  }));
}

export async function deleteReview(reviewId: string): Promise<void> {
  const response = await authFetch(`/api/v1/reviews/${reviewId}`, { method: 'DELETE' });
  if (!response.ok) throw new ApiError(response.status, await response.text());
}

export async function reportReview(reviewId: string, reason: ReviewReportReason): Promise<void> {
  const response = await authFetch(`/api/v1/reviews/${reviewId}/reports`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason, detail: null }),
  });
  if (!response.ok) throw new ApiError(response.status, await response.text());
}
