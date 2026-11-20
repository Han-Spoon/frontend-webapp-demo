import type { StoreCandidate } from '../../api/store';
import type { Language } from '../App';
import type { StoreCoordinates } from '../hooks/useStoreCandidates';
import { localizeMenuText } from '../results/resultViewModel';
import { AREAS, RESTAURANTS, type Restaurant } from './restaurants';
import { listDemoStoreReviews } from './reviews';

/**
 * 시연 모드 전체 지도용. 가상 식당(`RESTAURANTS`)을 후보 API 형식으로 바꾸고, 후보 조회를 흉내 낸다.
 * 실제 후보 API처럼 반경 안의 가게를 검증(레시피 인증) 가게 먼저, 가까운 순으로 최대 20곳 돌려준다.
 */
const STORE_ID_BASE = 800_000;
const SEARCH_RADIUS_METERS = 1500;
const MAX_RESULTS = 20;
// 가상 식당 분류(한식 계열 3종)를 실제 업종 코드에 맞춘다. 칸 순서 = 지역 안의 식당 순서.
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

/** 이름 검색이면 거리 없이 이름·지역·주소로, 아니면 좌표 반경으로 찾는다. */
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
