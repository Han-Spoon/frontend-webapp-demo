import type { ReportReason, RestaurantReview, ReviewMenu } from '../../api/reviews';
import { readDemo, writeDemo } from './storage';
import { RESTAURANTS } from './restaurants';

export interface DemoReviewReport {
  reviewId: string;
  reporterId: string;
  reason: ReportReason;
  reportedAt: string;
}

const fixtureReview = (storeId: string): RestaurantReview => {
  const restaurant = RESTAURANTS.find(item => item.id === storeId);
  return {
    id: `fixture-review-${storeId}`,
    storeId,
    storeName: restaurant?.name.ko ?? '',
    scanId: null,
    menus: [{ name: '대표 메뉴', answers: {}, note: '직원에게 재료를 확인하고 주문했어요.' }],
    mine: false,
    createdAt: '2026-10-01T09:00:00Z',
    updatedAt: '2026-10-01T09:00:00Z',
  };
};

export const listDemoStoreReviews = (storeId: string): RestaurantReview[] => [
  ...readDemo<RestaurantReview[]>('reviews', []).filter(item => item.storeId === storeId),
  fixtureReview(storeId),
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
