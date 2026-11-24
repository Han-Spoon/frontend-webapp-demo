import type { StoreDetail } from '../../api/store';

/**
 * 홈 '가게 탐색'의 고정 가게(2026-11-24 결정: 홈은 API 없이 하드코딩 → 2026-11-25 실제 storeId로).
 * 후보 API(2026-11-25 조회)에서 고른 실제 가게의 스냅숏이다. 화면은 가게 상세 API(`GET /stores/{storeId}`)를
 * 불러오면 그 값(이름 · 후기 수 · 메뉴)을 쓰고, 못 불러오면 이 스냅숏만 보여 준다(메뉴 태그 없음).
 * '내 주변'은 용산구(드래곤시티 주변, 2026-11-25 결정)로 고정.
 */
export type StoreSnapshot = Pick<StoreDetail, 'storeId' | 'name' | 'branchName' | 'roadAddress' | 'latitude' | 'longitude' | 'categoryCode' | 'categoryName' | 'reviewCount' | 'floorInfo'>;

export type HomeAreaId = 'nearby' | 'seongsu' | 'myeongdong' | 'hongdae';

const store = (
  storeId: number, name: string, branchName: string | null, roadAddress: string,
  categoryCode: string, categoryName: string, reviewCount: number, latitude: number, longitude: number, floorInfo: string,
): StoreSnapshot => ({ storeId, name, branchName, roadAddress, categoryCode, categoryName, reviewCount, latitude, longitude, floorInfo });

export const HOME_STORES: Record<HomeAreaId, StoreSnapshot[]> = {
  nearby: [
    store(206828, '기와', null, '서울특별시 용산구 한강대로21나길 40', 'I20101', '백반/한정식', 3, 37.528249, 126.964228, '1'),
    store(228682, '한강로칼국수 용산아이파크몰점', null, '서울특별시 용산구 한강대로23길 55', 'I20105', '국수/칼국수', 3, 37.529772, 126.964736, '7'),
    store(225444, '갈비씨 신용산점', null, '서울특별시 용산구 새창로 213-9', 'I20107', '돼지고기 구이/찜', 3, 37.530665, 126.967643, ''),
  ],
  seongsu: [
    store(224621, '뚝배기양평해장국', '성수점', '서울특별시 성동구 아차산로 110', 'I20102', '국/탕/찌개류', 0, 37.544189, 127.056159, '1'),
    store(215424, '핫시즈너보끔당성수', '본점', '서울특별시 성동구 아차산로 103', 'I20107', '돼지고기 구이/찜', 0, 37.545054, 127.055821, ''),
    store(587001, '어묵나라', null, '서울특별시 성동구 아차산로 100', 'I21007', '김밥/만두/분식', 0, 37.544504, 127.056092, ''),
  ],
  myeongdong: [
    store(226853, '명동교자명동', '1호점', '서울특별시 중구 명동10길 8', 'I20105', '국수/칼국수', 0, 37.563419, 126.985037, ''),
    store(229959, '신선설농탕', '명동점', '서울특별시 중구 명동길 56', 'I20102', '국/탕/찌개류', 0, 37.563735, 126.985456, '2'),
    store(227068, '찜.안동찜닭', null, '서울특별시 중구 명동10길 3', 'I20110', '닭/오리고기 구이/찜', 0, 37.563681, 126.985331, ''),
  ],
  hongdae: [
    store(238633, '평안도상원냉면', null, '서울특별시 마포구 양화로 156', 'I20106', '냉면/밀면', 0, 37.556106, 126.923449, '1'),
    store(207028, '쫑아네', null, '서울특별시 마포구 양화로 156', 'I20101', '백반/한정식', 0, 37.556106, 126.923449, ''),
    store(208390, '신진도간장게장', null, '서울특별시 마포구 월드컵북로2길 41', 'I20112', '해산물 구이/찜', 0, 37.557034, 126.922792, '1'),
  ],
};

/**
 * 큐레이션 글 아래 '칼럼 속 식당을 만나보세요'의 가게(storeId로 가게 상세 API를 부름).
 * 칼럼별 가게 목록 데이터가 아직 없어 모든 글에 같은 가게를 보여 준다. 내 식단에 맞는지 확인한 추천이 아니다.
 */
export const CURATION_STORES: StoreSnapshot[] = [
  store(220752, '이가뚝배기', null, '서울특별시 용산구 원효로19길 56', 'I20102', '국/탕/찌개류', 1, 37.533354, 126.954925, '1'),
  store(224669, '상리 남도밥상', null, '서울특별시 용산구 서빙고로 17', 'I20101', '백반/한정식', 3, 37.526907, 126.96657, '1'),
  store(234241, '용산국제회관', null, '서울특별시 용산구 청파로20길 49', 'I20101', '백반/한정식', 2, 37.531898, 126.96564, '1'),
];
