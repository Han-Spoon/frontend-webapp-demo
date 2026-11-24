import type { StoreCandidate, StoreDetail } from '../../../api/store';
import { translateText, type Language } from '../../locales';
import { FOOD_CATEGORY_LABELS, foodCategoryOf } from '../discovery/foodCategories';
import { districtOf } from '../hs/cards';
import { txn, type CountText } from '../hs/text';

/**
 * 가게 `floorInfo`(상가정보 층 원본 값) → 층 문구(7개 언어).
 * "1"·"2"… 지상 N층, "B1"… 지하 N층, "지" 지하, "반"·"반지층" 반지하.
 * 빈 값·없음·"0"·그 밖의 값은 표시하지 않는다(null).
 */
export function formatFloor(floorInfo: string | null | undefined, language: Language): string | null {
  const value = floorInfo?.trim() ?? '';
  if (/^[1-9]\d*$/.test(value)) {
    const n = value;
    return translateText(language, { ko: `${n}층`, en: `${n}F`, ar: `الطابق ${n}`, 'zh-CN': `${n}楼`, ja: `${n}階`, 'zh-TW': `${n}樓`, es: `Planta ${n}` });
  }
  const basement = value.match(/^B([1-9]\d*)$/i);
  if (basement) {
    const n = basement[1];
    return translateText(language, { ko: `지하 ${n}층`, en: `B${n}`, ar: `الطابق السفلي ${n}`, 'zh-CN': `地下${n}楼`, ja: `地下${n}階`, 'zh-TW': `地下${n}樓`, es: `Sótano ${n}` });
  }
  if (value === '지') {
    return translateText(language, { ko: '지하', en: 'Basement', ar: 'الطابق السفلي', 'zh-CN': '地下', ja: '地下', 'zh-TW': '地下', es: 'Sótano' });
  }
  if (value === '반' || value === '반지층') {
    return translateText(language, { ko: '반지하', en: 'Semi-basement', ar: 'شبه سفلي', 'zh-CN': '半地下', ja: '半地下', 'zh-TW': '半地下', es: 'Semisótano' });
  }
  return null;
}

/** 가게 정보 줄의 후기 수(디자인: '후기 N개') */
export const STORE_REVIEW_COUNT: CountText = {
  ko: (n) => `후기 ${n}개`,
  en: (n) => `${n} review${n === 1 ? '' : 's'}`,
  ar: (n) => `${n} مراجعات`,
  'zh-CN': (n) => `评价 ${n} 条`,
  ja: (n) => `レビュー ${n}件`,
  'zh-TW': (n) => `評價 ${n} 則`,
  es: (n) => `${n} reseña${n === 1 ? '' : 's'}`,
};

const DISTANCE: Record<Language, (d: string) => string> = {
  ko: (d) => `내 위치에서 ${d}`, en: (d) => `${d} from you`, ar: (d) => `على بُعد ${d} منك`, 'zh-CN': (d) => `距你 ${d}`, ja: (d) => `現在地から ${d}`, 'zh-TW': (d) => `距你 ${d}`, es: (d) => `A ${d} de ti`,
};
export const formatDistance = (meters: number) => (meters >= 1000 ? `${(meters / 1000).toFixed(1).replace(/\.0$/, '')}km` : `${Math.round(meters)}m`);
export const distanceText = (meters: number, language: Language) => (DISTANCE[language] ?? DISTANCE.en)(formatDistance(meters));

/** 두 좌표 사이 거리(m). 상세 API에 거리가 없어 내 위치로 계산한다. */
export function distanceBetween(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

type StoreLike = Pick<StoreDetail, 'name' | 'branchName' | 'roadAddress' | 'categoryCode' | 'categoryName'> | StoreCandidate;

export const storeName = (store: Pick<StoreDetail, 'name' | 'branchName'>) => (store.branchName ? `${store.name} ${store.branchName}` : store.name);

/** 음식 종류(기타는 한국어에서만 원래 분류 이름) */
export function storeCategory(store: Pick<StoreDetail, 'categoryCode' | 'categoryName'>, language: Language) {
  const category = foodCategoryOf(store);
  if (category !== 'other') return translateText(language, FOOD_CATEGORY_LABELS[category]);
  return language === 'ko' ? store.categoryName?.trim() || null : null;
}

/** `후기 N개 · 구 이름 · 음식 종류 · 층`(없는 칸은 뺌) */
export function storeMetaLine(store: StoreLike & { reviewCount?: number | null; floorInfo?: string | null }, language: Language, districtFallback?: string | null) {
  return [
    txn(language, STORE_REVIEW_COUNT, store.reviewCount ?? 0),
    districtOf(store.roadAddress) ?? districtFallback ?? null,
    storeCategory(store, language),
    formatFloor(store.floorInfo, language),
  ].filter(Boolean).join(' · ');
}
