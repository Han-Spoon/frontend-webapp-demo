import { useCallback, useState } from 'react';
import type { StoreCandidate } from '../../../api/store';
import type { Language } from '../../types';
import { districtOf } from '../hs/cards';
import { FOOD_CATEGORY_LABELS, foodCategoryOf } from '../discovery/foodCategories';
import { translateText } from '../../locales';

const SAVED_KEY = 'han-spoon-saved-stores';
const DETAILS_KEY = `${SAVED_KEY}:details`;

export function storeDisplayName(store: StoreCandidate) {
  return store.branchName ? `${store.name} ${store.branchName}` : store.name;
}

/** StoreCard 줄: 음식 종류(기타는 한국어에서만 원래 분류 이름) */
export function storeCategoryText(store: StoreCandidate, language: Language) {
  const category = foodCategoryOf(store);
  if (category !== 'other') return translateText(language, FOOD_CATEGORY_LABELS[category]);
  return language === 'ko' ? store.categoryName?.trim() || null : null;
}

/** StoreCard 줄: 지역(구). 주소가 없는 시연 가게는 호출부가 준 지역 이름. */
export const storeDistrict = (store: StoreCandidate, fallback?: string | null) => districtOf(store.roadAddress) ?? fallback ?? null;

function readIds(): number[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === 'number') : [];
  } catch {
    return [];
  }
}

function readDetails(): StoreCandidate[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(DETAILS_KEY) ?? '[]');
    return Array.isArray(data) ? data.filter((item): item is StoreCandidate => !!item && typeof item.storeId === 'number' && typeof item.name === 'string') : [];
  } catch {
    return [];
  }
}

function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 저장이 막혀 있으면 이번 화면에서만 기억한다. */ }
}

/**
 * 가게 저장(책갈피). 저장 API가 생기기 전까지 이 기기에만 두고, 저장 당시 정보(스냅숏)를 같이 남긴다.
 */
export function useSavedStores() {
  const [ids, setIds] = useState<number[]>(readIds);
  const [details, setDetails] = useState<StoreCandidate[]>(readDetails);

  const toggle = useCallback((store: StoreCandidate) => {
    const on = ids.includes(store.storeId);
    const nextIds = on ? ids.filter((id) => id !== store.storeId) : [...ids, store.storeId];
    const rest = details.filter((item) => item.storeId !== store.storeId);
    const nextDetails = on ? rest : [store, ...rest];
    setIds(nextIds);
    setDetails(nextDetails);
    write(SAVED_KEY, nextIds);
    write(DETAILS_KEY, nextDetails);
  }, [ids, details]);

  const savedStores = details.filter((store) => ids.includes(store.storeId));
  return { isSaved: (storeId: number) => ids.includes(storeId), toggle, savedStores };
}
