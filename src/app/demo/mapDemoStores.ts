import type { StoreCandidate } from '../../api/store';
import type { Language } from '../types';
import type { StoreCoordinates } from '../hooks/useStoreCandidates';
import { localizeMenuText } from '../results/resultViewModel';
import { AREAS, RESTAURANTS, type Restaurant } from './restaurants';
import { listDemoStoreReviews } from './reviews';

/** 시연 전체 지도용 후보 조회 흉내. 가상 식당 → 후보 API 형식, 반경 안 검증 가게 먼저·가까운 순 최대 20곳. */
const STORE_ID_BASE = 800_000;
const SEARCH_RADIUS_METERS = 1500;
const MAX_RESULTS = 20;
// 가상 식당에 붙일 실제 업종 코드 3종(지역 안 식당 순서대로 순환).
const SLOT_CATEGORIES: Array<[string, string]> = [['I201', '한식'], ['I20102', '국/탕/찌개류'], ['I20101', '백반/한정식']];

export function demoStoreId(restaurant: Restaurant) {
  return STORE_ID_BASE + RESTAURANTS.indexOf(restaurant);
}

export function demoRestaurantOf(store: StoreCandidate) {
  return RESTAURANTS[store.storeId - STORE_ID_BASE] ?? null;
}

export function demoAreaName(restaurant: Restaurant, language: Language) {
  const area = AREAS.find((item) => item.id === restaurant.area);
  return area ? localizeMenuText(area, language) : null;
}

function distanceMeters(restaurant: Restaurant, from: StoreCoordinates) {
  const dLat = (restaurant.lat - from.latitude) * 111_320;
  const dLng = (restaurant.lng - from.longitude) * 111_320 * Math.cos((restaurant.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

function toCandidate(restaurant: Restaurant, language: Language, distance: number | null): StoreCandidate {
  const [categoryCode, categoryName] = SLOT_CATEGORIES[RESTAURANTS.indexOf(restaurant) % 3];
  return {
    storeId: demoStoreId(restaurant),
    name: localizeMenuText(restaurant.name, language),
    roadAddress: null,
    latitude: restaurant.lat,
    longitude: restaurant.lng,
    distanceMeters: distance,
    categoryCode,
    categoryName,
    verified: restaurant.partnership === 'recipe-verified',
    reviewCount: listDemoStoreReviews(restaurant.id).length,
    matchMethod: distance === null ? 'name_search' : 'gps_candidate',
  };
}

/** 검색어가 있으면 이름·지역·주소(거리 없음), 없으면 좌표 반경 */
export function searchDemoStores(language: Language, search: { query: string; location: StoreCoordinates | null }): StoreCandidate[] {
  const text = search.query.trim().toLocaleLowerCase();
  if (text) {
    return RESTAURANTS.filter((restaurant) => {
      const area = AREAS.find((item) => item.id === restaurant.area);
      return `${Object.values(restaurant.name).join(' ')} ${area ? Object.values(area).join(' ') : ''} ${restaurant.address}`
        .toLocaleLowerCase()
        .includes(text);
    }).slice(0, MAX_RESULTS).map((restaurant) => toCandidate(restaurant, language, null));
  }
  const location = search.location;
  if (!location) return [];
  return RESTAURANTS
    .map((restaurant) => ({ restaurant, distance: distanceMeters(restaurant, location) }))
    .filter(({ distance }) => distance <= SEARCH_RADIUS_METERS)
    .sort((a, b) => Number(b.restaurant.partnership === 'recipe-verified') - Number(a.restaurant.partnership === 'recipe-verified') || a.distance - b.distance)
    .slice(0, MAX_RESULTS)
    .map(({ restaurant, distance }) => toCandidate(restaurant, language, distance));
}
