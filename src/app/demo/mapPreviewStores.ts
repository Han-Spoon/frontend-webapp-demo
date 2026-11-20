import type { StoreCandidate } from '../../api/store';
import type { StoreCardExtras } from '../components/discovery/MapStorePanel';
import { DINING_PHOTO_POOL } from '../components/discovery/restaurantPhotos';

/**
 * 개발용 지도 미리보기(/dev/map-preview) 전용 가상 데이터.
 * 용산 시연 가게 밀집을 흉내 낸 것으로, 좌표·별점·영업시간·사진·층은 실제 가게 정보가 아니다.
 * 같은 좌표 3묶음은 시연 데이터에서 측정한 겹침을 재현한다.
 */
export const MAP_PREVIEW_CENTER = { latitude: 37.5312, longitude: 126.9636 };

const SAME_SPOT: Array<[string, number, number, string]> = [
  // 1층 2곳
  ['우대하루 용산', 37.52985, 126.96455, '1층'],
  ['상리 남도밥상', 37.529855, 126.964555, '1층'],
  // 전자랜드 6층 2곳
  ['궁추어탕', 37.53305, 126.96205, '6층'],
  ['박가부대 용산전자랜드점', 37.53306, 126.96206, '6층'],
  // 아이파크몰 4·7층 3곳
  ['장독대김치찜김치찌개 용산점', 37.52925, 126.96475, '4층'],
  ['꿈꾸는 메밀', 37.529255, 126.964745, '7층'],
  ['아울 아이파크몰 용산점', 37.52926, 126.96476, '7층'],
];

const NAMES = [
  '용산 칼국수', '한강 국밥', '삼각지 곱창', '원효 냉면', '신용산 떡볶이', '전자상가 순대국', '용리단길 파스타', '효창 김밥',
  '숙대 우동', '남영 돈까스', '이촌 초밥', '한강로 백반', '용문 비빔밥', '청파 쌀국수', '문배 수제버거', '서계 닭갈비',
  '갈월 감자탕', '도원 짬뽕', '신계 샤브샤브', '용산역 덮밥', '후암 브런치', '원효로 보쌈', '삼각지 만두', '한남 커리',
  '이태원 타코', '용산 생선구이', '전자랜드 김치찌개', '아이파크 라멘', '용산 오므라이스', '한강 마라탕',
];

// 카카오 분류 형식을 흉내 낸 가상 분류
const CATEGORIES = [
  '음식점 > 한식 > 한정식', '음식점 > 한식 > 육류,고기 > 갈비', '음식점 > 분식', '음식점 > 한식 > 해물,생선 > 회',
  '음식점 > 일식 > 돈까스,우동', '음식점 > 중식 > 중국요리', '음식점 > 양식 > 이탈리안', '음식점 > 한식 > 국밥',
  '음식점 > 아시아음식 > 베트남음식', '음식점 > 치킨', '음식점 > 술집 > 호프,요리주점', '음식점 > 퓨전요리',
];
const HOURS = ['11:00–21:00', '10:30–22:00', '17:00–24:00', '11:30–15:00, 17:00–21:30'];

function seeded(index: number, salt: number) {
  const value = Math.sin(index * salt) * 43758.5453;
  return value - Math.floor(value);
}

function distance(lat: number, lng: number) {
  const dLat = (lat - MAP_PREVIEW_CENTER.latitude) * 111_320;
  const dLng = (lng - MAP_PREVIEW_CENTER.longitude) * 111_320 * Math.cos((lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

const spots = [
  ...SAME_SPOT.map(([name, lat, lng, floor]) => ({ name, lat, lng, floor })),
  // 아이파크몰·전자상가 사이 약 300m 범위에 흩뿌린 고정 좌표
  ...NAMES.map((name, index) => ({
    name,
    lat: 37.5296 + seeded(index + 1, 12.9898) * 0.0032,
    lng: 126.9618 + seeded(index + 1, 78.233) * 0.0036,
    floor: undefined as string | undefined,
  })),
];

export const MAP_PREVIEW_CANDIDATES: StoreCandidate[] = spots.map((spot, index) => ({
  storeId: 900_000 + index,
  name: spot.name,
  roadAddress: `서울 용산구 한강대로 ${20 + index}길 ${index + 3}`,
  latitude: spot.lat,
  longitude: spot.lng,
  distanceMeters: distance(spot.lat, spot.lng),
  categoryName: CATEGORIES[index % CATEGORIES.length],
  verified: index < 20,
  reviewCount: Math.round(seeded(index + 1, 3.17) * 40),
  matchMethod: 'gps_candidate',
}));

export const MAP_PREVIEW_EXTRAS = new Map<number, StoreCardExtras>(
  MAP_PREVIEW_CANDIDATES.map((store, index) => [store.storeId, {
    rating: Math.round((3.6 + seeded(index + 1, 5.71) * 1.3) * 10) / 10,
    hours: HOURS[index % HOURS.length],
    floorInfo: spots[index].floor,
    // 실제 가게 사진이 아닌 분위기 참고 사진. 사진이 없는 가게도 보이도록 3곳마다 1곳은 비운다.
    photos: index % 3 === 2 ? undefined : [0, 1, 2].map((offset) => DINING_PHOTO_POOL[(index + offset) % DINING_PHOTO_POOL.length]),
  }]),
);
