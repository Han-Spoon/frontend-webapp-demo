import type { StoreDetail, StoreMenu } from '../../api/store';
import type { Language } from '../types';
import { demoAreaName, demoRestaurantOf, demoStoreId } from './mapDemoStores';
import { CURATION_STORES, HOME_STORES, type StoreSnapshot } from './homeStores';
import { RESTAURANTS } from './restaurants';
import { listDemoStoreReviews } from './reviews';

/**
 * 시연용 가게 상세(`GET /stores/{storeId}` 형식). 메뉴 · 사진은 실제 가게 정보가 아니다.
 * 확인용 경우: 메뉴 · 사진 있음 / 메뉴 사진 불러오기 실패 / 가격 없음 · 번역 없음 / 메뉴 · 가게 사진 모두 없음(F2-09).
 */
const PHOTO = [
  '/images/curation/banchan-table.webp',
  '/images/curation/sundubu.webp',
  '/images/curation/haejangguk.webp',
  '/images/curation/grill.webp',
  '/images/curation/tteokbokki.webp',
  '/images/curation/market-street.webp',
];
/** 불러오기 실패 확인용(없는 주소) */
const BROKEN_PHOTO = '/images/curation/missing-demo-photo.webp';
const CREDIT = '시연용 참고 사진';

const menu = (id: number, name: string, translatedName: string | null, priceText: string | null, extra: Partial<StoreMenu> = {}): StoreMenu => ({
  storeMenuId: id, name, translatedName, description: null, priceText, priceOptions: [], menuId: null,
  imageUrl: null, imageAttribution: null, imageSource: null, ...extra,
});
const photo = (index: number) => ({ imageUrl: PHOTO[index % PHOTO.length], imageAttribution: CREDIT, imageSource: 'store' });

/** 메뉴 많은 가게(8개, 보드 F2-08과 같은 구성) */
const FULL_MENU: StoreMenu[] = [
  menu(1, '비빔밥', 'Bibimbap', '11,000원', { description: '제철 나물과 고추장을 곁들인 비빔밥', ...photo(0) }),
  menu(2, '해물파전', 'Seafood green onion pancake', '16,000원', {
    priceOptions: [{ label: '소', priceText: '12,000원', inferred: false }, { label: '대', priceText: '16,000원', inferred: false }], ...photo(1),
  }),
  menu(3, '공기밥', 'Steamed rice', '1,000원'),
  menu(4, '된장찌개', 'Soybean paste stew', '9,000원', photo(2)),
  menu(5, '뚝배기 불고기', 'Bulgogi in earthen pot', '12,000원', photo(3)),
  menu(6, '김치찌개', 'Kimchi stew', '9,000원', { imageUrl: BROKEN_PHOTO, imageAttribution: CREDIT, imageSource: 'store' }),
  menu(7, '계란말이', 'Rolled omelette', '8,000원'),
  menu(8, '식혜', null, null),
];

/** 메뉴 적은 가게(2개, 태그 '+N개' 없이) */
const SHORT_MENU: StoreMenu[] = [
  menu(11, '칼국수', 'Kalguksu (knife-cut noodle soup)', '9,000원', photo(4)),
  menu(12, '만두', 'Dumplings', '7,000원', { priceOptions: [{ label: '반 접시', priceText: '4,000원', inferred: false }, { label: '한 접시', priceText: '7,000원', inferred: false }] }),
];

const withStoreIds = (menus: StoreMenu[], storeId: number) => menus.map((item) => ({ ...item, storeMenuId: storeId * 100 + item.storeMenuId }));

/** 고정 가게(홈 · 칼럼)의 시연 메뉴: 내 주변 · 칼럼은 메뉴 있음, 다른 지역은 첫 가게만 */
function snapshotDetail(snapshot: StoreSnapshot, index: number, withMenu: boolean): StoreDetail {
  const menus = withMenu ? withStoreIds(index % 2 === 0 ? FULL_MENU : SHORT_MENU, snapshot.storeId) : null;
  return { ...snapshot, verified: true, thumbnailUrl: withMenu ? PHOTO[index % PHOTO.length] : null, menus };
}

/** 시연 지도 가게: 지역마다 첫 가게 = 메뉴 많음 · 1층, 둘째 = 메뉴 적음 · 지하 1층, 셋째 = 메뉴 · 사진 없음 */
function demoMapDetail(storeId: number): StoreDetail | null {
  const restaurant = RESTAURANTS[storeId - demoStoreId(RESTAURANTS[0])];
  if (!restaurant) return null;
  const slot = RESTAURANTS.filter((item) => item.area === restaurant.area).indexOf(restaurant);
  const [categoryCode, categoryName] = [['I201', '한식'], ['I20102', '국/탕/찌개류'], ['I20101', '백반/한정식']][RESTAURANTS.indexOf(restaurant) % 3];
  return {
    storeId,
    name: restaurant.name.ko,
    branchName: null,
    roadAddress: null,
    floorInfo: ['1', 'B1', ''][slot] ?? '',
    latitude: restaurant.lat,
    longitude: restaurant.lng,
    categoryCode,
    categoryName,
    verified: restaurant.partnership === 'recipe-verified',
    reviewCount: listDemoStoreReviews(restaurant.id).length,
    thumbnailUrl: slot === 2 ? null : PHOTO[(RESTAURANTS.indexOf(restaurant) + 5) % PHOTO.length],
    menus: slot === 0 ? withStoreIds(FULL_MENU, storeId) : slot === 1 ? withStoreIds(SHORT_MENU, storeId) : null,
  };
}

export function demoStoreDetail(storeId: number): StoreDetail | null {
  const mapStore = demoMapDetail(storeId);
  if (mapStore) return mapStore;
  for (const [area, stores] of Object.entries(HOME_STORES)) {
    const index = stores.findIndex((item) => item.storeId === storeId);
    if (index >= 0) return snapshotDetail(stores[index], index, area === 'nearby' || index === 0);
  }
  const curationIndex = CURATION_STORES.findIndex((item) => item.storeId === storeId);
  return curationIndex >= 0 ? snapshotDetail(CURATION_STORES[curationIndex], curationIndex, true) : null;
}

/** 시연 지도 가게는 주소가 없어 지역 이름으로 대신 */
export function demoStoreDistrict(storeId: number, language: Language): string | null {
  const restaurant = demoRestaurantOf({ storeId } as Parameters<typeof demoRestaurantOf>[0]);
  return restaurant ? demoAreaName(restaurant, language) : null;
}
