import type { ReportReason, RestaurantReview, ReviewMenu } from '../../api/reviews';
import { readDemo, writeDemo } from './storage';
import { RESTAURANTS } from './restaurants';

export interface DemoReviewReport {
  reviewId: string;
  reporterId: string;
  reason: ReportReason;
  reportedAt: string;
}

/** 가게마다 같은 시연 후기 3건(다른 방문자의 선택형 답). 실제 후기 API 대신. */
const FIXTURE_MENUS: ReviewMenu[][] = [
  [{ name: '비빔밥', answers: { 'allergy:shrimp': 'no', 'vegan:vegan': 'unknown' }, note: '직원에게 재료를 확인하고 주문했어요.' }],
  [{ name: '된장찌개', answers: { 'allergy:shrimp': 'yes' }, note: '' }],
  [{ name: '김치전', answers: { 'vegan:vegan': 'unknown', 'preference:no-spicy': 'yes' }, note: '육수 재료는 물어봐야 해요.' }],
];

const fixtureReviews = (storeId: string): RestaurantReview[] => {
  const restaurant = RESTAURANTS.find(item => item.id === storeId);
  return FIXTURE_MENUS.map((menus, index) => ({
    id: `fixture-review-${storeId}-${index}`,
    storeId,
    storeName: restaurant?.name.ko ?? '',
    scanId: null,
    menus,
    mine: false,
    createdAt: `2026-10-0${index + 1}T09:00:00Z`,
    updatedAt: `2026-10-0${index + 1}T09:00:00Z`,
  }));
};

export const listDemoStoreReviews = (storeId: string): RestaurantReview[] => [
  ...readDemo<RestaurantReview[]>('reviews', []).filter(item => item.storeId === storeId),
  ...fixtureReviews(storeId),
];
export const listDemoMyReviews = (): RestaurantReview[] =>
  readDemo<RestaurantReview[]>('reviews', []);

export function saveDemoReview(storeId: string, menus: ReviewMenu[], current?: RestaurantReview): RestaurantReview {
  const now = new Date().toISOString();
  const restaurant = RESTAURANTS.find(item => item.id === storeId);
  const review: RestaurantReview = {
    id: current?.id ?? crypto.randomUUID(), storeId,
    storeName: restaurant?.name.ko ?? current?.storeName ?? '',
    scanId: current?.scanId ?? null, menus, mine: true,
    createdAt: current?.createdAt ?? now, updatedAt: now,
  };
  writeDemo('reviews', [review, ...listDemoMyReviews().filter(item => item.id !== review.id)]);
  return review;
}
export function deleteDemoReview(id: string): void {
  writeDemo('reviews', listDemoMyReviews().filter(item => item.id !== id));
}
export function reportDemoReview(id: string, reason: ReportReason): void {
  const current = readDemo<DemoReviewReport[]>('review-reports', []);
  if (current.some(item => item.reviewId === id && item.reporterId === 'demo-user')) return;
  writeDemo('review-reports', [{ reviewId: id, reporterId: 'demo-user', reason, reportedAt: new Date().toISOString() }, ...current]);
}
