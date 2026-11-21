import type { StoreCandidate } from '../../api/store';
import type { StoreCardExtras } from '../components/discovery/MapStorePanel';
import { DINING_PHOTO_POOL } from '../components/discovery/restaurantPhotos';

/**
 * 개발용 지도 미리보기(/dev/map-preview) 전용 가상 데이터.
 * 용산 시연 가게 밀집을 흉내 낸 것으로, 좌표·별점·영업시간·사진·층은 실제 가게 정보가 아니다.
 * 층(`floorInfo`)은 후보 API 원본 형식("6", "B1", "지", "반지층", "")으로 넣어 층 문구 포맷터를 확인한다.
 * 같은 좌표 3묶음은 시연 데이터에서 측정한 겹침을 재현한다.
 */
export const MAP_PREVIEW_CENTER = { latitude: 37.5312, longitude: 126.9636 };

const SAME_SPOT: Array<[string, number, number, string]> = [
  // 1층·지하 1층
  ['우대하루 용산', 37.52985, 126.96455, '1'],
  ['상리 남도밥상', 37.529855, 126.964555, 'B1'],
  // 전자랜드 6층 2곳
  ['궁추어탕', 37.53305, 126.96205, '6'],
  ['박가부대 용산전자랜드점', 37.53306, 126.96206, '6'],
  // 아이파크몰 4·7층 3곳
  ['장독대김치찜김치찌개 용산점', 37.52925, 126.96475, '4'],
  ['꿈꾸는 메밀', 37.529255, 126.964745, '7'],
  ['아울 아이파크몰 용산점', 37.52926, 126.96476, '7'],
];

const NAMES = [
  '용산 칼국수', '한강 국밥', '삼각지 곱창', '원효 냉면', '신용산 떡볶이', '전자상가 순대국', '용리단길 파스타', '효창 김밥',
  '숙대 우동', '남영 돈까스', '이촌 초밥', '한강로 백반', '용문 비빔밥', '청파 쌀국수', '문배 수제버거', '서계 닭갈비',
  '갈월 감자탕', '도원 짬뽕', '신계 샤브샤브', '용산역 횟집', '후암 빈대떡', '원효로 보쌈', '삼각지 만두', '한남 한우',
  '이태원 삼겹살', '용산 생선구이', '전자랜드 김치찌개', '아이파크 라멘', '용산 복집', '한강 마라탕',
];

// 실제 후보 응답과 같은 업종 코드·이름(상가정보 소분류 + LOCALDATA 중분류·대분류)
const CATEGORY_NAMES: Record<string, string> = {
  I20101: '백반/한정식', I20102: '국/탕/찌개류', I20103: '족발/보쌈', I20104: '전/부침개', I20105: '국수/칼국수',
  I20106: '냉면/밀면', I20107: '돼지고기 구이/찜', I20108: '소고기 구이/찜', I20109: '곱창 전골/구이',
  I20110: '닭/오리고기 구이/찜', I20111: '횟집', I20112: '해산물 구이/찜', I20113: '복 요리 전문',
  I20199: '기타 한식 음식점', I21007: '김밥/만두/분식',
  I201: '한식', I202: '중식', I203: '일식', I204: '서양식', I210: '기타 간이', I2: '음식',
};
// spots 순서(같은 좌표 7곳 → NAMES)와 같은 순서로, 가게 이름에 맞춘 업종 코드
const CATEGORY_CODES = [
  'I20101', 'I20101', 'I20102', 'I20102', 'I20102', 'I20106', 'I2',
  'I20105', 'I20102', 'I20109', 'I20106', 'I21007', 'I20199', 'I204', 'I21007',
  'I203', 'I203', 'I203', 'I20101', 'I201', 'I2', 'I204', 'I20110',
  'I20102', 'I202', 'I20199', 'I20111', 'I20104', 'I20103', 'I210', 'I20108',
  'I20107', 'I20112', 'I20102', 'I203', 'I20113', 'I202',
];
// 흩뿌린 가게 층: 대부분 1~3층·빈 값, 지하·반지하·"0"(표시 안 함)·필드 없음(배포 전 서버)도 섞는다.
const SCATTERED_FLOORS: Array<string | undefined> = [
  '1', '', '2', '1', '지', '', '3', '1',
  '', '2', '1', '0', '', '1', undefined, '2',
  '반지층', '1', '', 'B2', '1', '', '반', '2',
  undefined, '1', '', '3', '1', '',
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
    floor: SCATTERED_FLOORS[index] as string | undefined,
  })),
];

export const MAP_PREVIEW_CANDIDATES: StoreCandidate[] = spots.map((spot, index) => ({
  storeId: 900_000 + index,
  name: spot.name,
  roadAddress: `서울 용산구 한강대로 ${20 + index}길 ${index + 3}`,
  latitude: spot.lat,
  longitude: spot.lng,
  distanceMeters: distance(spot.lat, spot.lng),
  categoryCode: CATEGORY_CODES[index],
  categoryName: CATEGORY_NAMES[CATEGORY_CODES[index]],
  verified: index < 20,
  reviewCount: Math.round(seeded(index + 1, 3.17) * 40),
  floorInfo: spot.floor,
  matchMethod: 'gps_candidate',
}));

export const MAP_PREVIEW_EXTRAS = new Map<number, StoreCardExtras>(
  MAP_PREVIEW_CANDIDATES.map((store, index) => [store.storeId, {
    rating: Math.round((3.6 + seeded(index + 1, 5.71) * 1.3) * 10) / 10,
    hours: HOURS[index % HOURS.length],
    // 실제 가게 사진이 아닌 분위기 참고 사진. 사진이 없는 가게도 보이도록 3곳마다 1곳은 비운다.
    photos: index % 3 === 2 ? undefined : [0, 1, 2].map((offset) => DINING_PHOTO_POOL[(index + offset) % DINING_PHOTO_POOL.length]),
  }]),
);
