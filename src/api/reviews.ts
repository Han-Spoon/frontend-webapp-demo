import { authFetch } from './authFetch';
import { ApiError } from './user';

/*
 * 화면 타입(RestaurantReview·ReviewAnswer·ReportReason)과 명세 V2 전송 형식을 분리한다.
 * 서버와는 V2 필드(reviewId, present/absent, comment, 소문자 신고 사유)로 주고받고,
 * 화면에는 기존 타입으로 돌려준다.
 */

export type ReviewAnswer = 'yes' | 'no' | 'unknown';
export type ReportReason = 'INAPPROPRIATE' | 'FALSE_INFORMATION' | 'AD_SPAM' | 'OTHER';
export interface ReviewMenu { name: string; scanMenuId?: string | null; answers: Record<string, ReviewAnswer>; note: string; }
export interface RestaurantReview {
  id: string;
  storeId: number | string;
  storeName: string;
  scanId: string | null;
  menus: ReviewMenu[];
  mine: boolean;
  hidden?: boolean;
  createdAt: string;
  updatedAt: string;
}

type WireAnswer = 'present' | 'absent' | 'unknown';
type WireReportReason = 'inappropriate' | 'false_info' | 'spam' | 'other';
interface WireReviewMenu {
  name: string;
  scanMenuId?: string | null;
  answers: Record<string, WireAnswer>;
  comment?: string | null;
  commentLocale?: string | null;
}
interface WireReview {
  reviewId: string;
  storeId: number;
  storeName: string;
  scanId: string | null;
  menus: WireReviewMenu[];
  mine: boolean;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
}

const TO_WIRE_ANSWER: Record<ReviewAnswer, WireAnswer> = { yes: 'present', no: 'absent', unknown: 'unknown' };
// 모르는 값은 '잘 모르겠어요'로 본다. '없었어요'로 바꾸지 않는다.
const fromWireAnswer = (value: string): ReviewAnswer =>
  value === 'present' ? 'yes' : value === 'absent' ? 'no' : 'unknown';
const TO_WIRE_REASON: Record<ReportReason, WireReportReason> = {
  INAPPROPRIATE: 'inappropriate', FALSE_INFORMATION: 'false_info', AD_SPAM: 'spam', OTHER: 'other',
};

const mapAnswers = <From extends string, To extends string>(answers: Record<string, From> | null | undefined, map: (value: From) => To) =>
  Object.fromEntries(Object.entries(answers ?? {}).map(([id, value]) => [id, map(value as From)])) as Record<string, To>;

const toWireMenu = (menu: ReviewMenu): WireReviewMenu => ({
  name: menu.name,
  ...(menu.scanMenuId ? { scanMenuId: menu.scanMenuId } : {}),
  answers: mapAnswers(menu.answers, value => TO_WIRE_ANSWER[value]),
  comment: menu.note.trim() ? menu.note : null,
});

const fromWireReview = (review: WireReview): RestaurantReview => ({
  id: review.reviewId,
  storeId: review.storeId,
  storeName: review.storeName,
  scanId: review.scanId,
  menus: (review.menus ?? []).map(menu => ({
    name: menu.name,
    scanMenuId: menu.scanMenuId ?? null,
    answers: mapAnswers(menu.answers, fromWireAnswer),
    note: menu.comment ?? '',
  })),
  mine: review.mine,
  hidden: review.hidden,
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
});

async function parse<T>(response: Response): Promise<T> {
  const body = await response.text();
  if (!response.ok) throw new ApiError(response.status, body);
  const json = body ? JSON.parse(body) : null;
  return (json?.data ?? json) as T;
}

const parseList = async (response: Response) => {
  const items = await parse<WireReview[] | null>(response);
  return (Array.isArray(items) ? items : []).map(fromWireReview);
};

export const getStoreReviews = (storeId: number) =>
  authFetch(`/api/v1/stores/${storeId}/reviews`).then(parseList);
export const getMyReviews = () =>
  authFetch('/api/v1/reviews/me').then(parseList);
export const createReview = (storeId: number, menus: ReviewMenu[], scanId?: string) =>
  authFetch(`/api/v1/stores/${storeId}/reviews`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...(scanId ? { scanId } : {}), menus: menus.map(toWireMenu) }),
  }).then(response => parse<WireReview>(response)).then(fromWireReview);
export const updateReview = (id: string, menus: ReviewMenu[]) =>
  authFetch(`/api/v1/reviews/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ menus: menus.map(toWireMenu) }),
  }).then(response => parse<WireReview>(response)).then(fromWireReview);
export const deleteReview = (id: string) =>
  authFetch(`/api/v1/reviews/${id}`, { method: 'DELETE' }).then(response => parse<void>(response));
export const reportReview = (id: string, reason: ReportReason) =>
  authFetch(`/api/v1/reviews/${id}/reports`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: TO_WIRE_REASON[reason], detail: null }),
  }).then(response => parse<void>(response));
