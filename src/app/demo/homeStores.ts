import type { LocalizedText } from '../locales';
import type { FoodCategoryId } from '../components/discovery/foodCategories';

/**
 * 홈 '가게 탐색'의 하드코딩 가게(2026-11-24 결정: 홈 가게 탐색 · 스포트라이트는 API 없이).
 * 실제 가게 후보 API 결과가 아니다. 이름 · 후기 수 · 지역 · 음식 종류 · 거리만(층 · 메뉴 태그 없음).
 */
export interface HomeStore {
  id: string;
  name: LocalizedText;
  reviewCount: number;
  district: LocalizedText;
  category: FoodCategoryId;
  distanceMeters: number;
}

export type HomeAreaId = 'nearby' | 'seongsu' | 'myeongdong' | 'hongdae';

const SEONGDONG: LocalizedText = { ko: '성동구', en: 'Seongdong-gu', ar: 'سونغدونغ', 'zh-CN': '城东区', ja: '城東区', 'zh-TW': '城東區', es: 'Seongdong-gu' };
const JUNG: LocalizedText = { ko: '중구', en: 'Jung-gu', ar: 'جونغ', 'zh-CN': '中区', ja: '中区', 'zh-TW': '中區', es: 'Jung-gu' };
const MAPO: LocalizedText = { ko: '마포구', en: 'Mapo-gu', ar: 'مابو', 'zh-CN': '麻浦区', ja: '麻浦区', 'zh-TW': '麻浦區', es: 'Mapo-gu' };

const store = (id: string, ko: string, en: string, reviewCount: number, district: LocalizedText, category: FoodCategoryId, distanceMeters: number): HomeStore => ({
  id, name: { ko, en, ar: en }, reviewCount, district, category, distanceMeters,
});

export const HOME_STORES: Record<HomeAreaId, HomeStore[]> = {
  nearby: [
    store('home-green-table', '초록식탁', 'Green Table', 12, SEONGDONG, 'korean', 350),
    store('home-sodam', '소담키친', 'Sodam Kitchen', 8, SEONGDONG, 'noodle', 600),
    store('home-hangreut', '한그릇 정원', 'Hangreut Garden', 5, SEONGDONG, 'korean', 800),
  ],
  seongsu: [
    store('home-seongsu-gukbap', '성수 국밥집', 'Seongsu Gukbap', 21, SEONGDONG, 'soup', 420),
    store('home-seoul-forest-grill', '서울숲 숯불', 'Seoul Forest Grill', 17, SEONGDONG, 'meat', 750),
    store('home-ttukseom-bunsik', '뚝섬 분식', 'Ttukseom Bunsik', 9, SEONGDONG, 'snack', 980),
  ],
  myeongdong: [
    store('home-myeongdong-kalguksu', '명동 칼국수', 'Myeongdong Kalguksu', 34, JUNG, 'noodle', 300),
    store('home-euljiro-bossam', '을지로 보쌈', 'Euljiro Bossam', 19, JUNG, 'meat', 650),
    store('home-namdaemun-galchi', '남대문 갈치골목', 'Namdaemun Galchi Alley', 14, JUNG, 'seafood', 900),
  ],
  hongdae: [
    store('home-hongdae-tteokbokki', '홍대 떡볶이', 'Hongdae Tteokbokki', 27, MAPO, 'snack', 280),
    store('home-yeonnam-bapsang', '연남 밥상', 'Yeonnam Bapsang', 16, MAPO, 'korean', 540),
    store('home-mangwon-naengmyeon', '망원 냉면', 'Mangwon Naengmyeon', 11, MAPO, 'noodle', 870),
  ],
};
