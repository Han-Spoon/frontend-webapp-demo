import type { LocalizedText } from '../locales';
import type { FoodCategoryId } from '../components/discovery/foodCategories';
import type { DiscoverAreaId } from './restaurants';

/**
 * 큐레이션 글 아래 '칼럼 속 식당을 만나보세요'의 하드코딩 가게(홈 가게 탐색과 같은 방식, API 없이).
 * 실제 가게 후보 API 결과가 아니고 내 식단에 맞는지 확인한 추천도 아니다.
 * 누르면 그 지역(`area`) 중심으로 지도를 연다. 저장(책갈피)은 홈 가게와 같은 기기 저장을 쓴다.
 */
export interface CurationStore {
  id: string;
  name: LocalizedText;
  reviewCount: number;
  district: LocalizedText;
  category: FoodCategoryId;
  distanceMeters: number;
  area: DiscoverAreaId;
}

const SEONGDONG: LocalizedText = { ko: '성동구', en: 'Seongdong-gu', ar: 'سونغدونغ', 'zh-CN': '城东区', ja: '城東区', 'zh-TW': '城東區', es: 'Seongdong-gu' };
const JONGNO: LocalizedText = { ko: '종로구', en: 'Jongno-gu', ar: 'جونغنو', 'zh-CN': '钟路区', ja: '鍾路区', 'zh-TW': '鐘路區', es: 'Jongno-gu' };
const MAPO: LocalizedText = { ko: '마포구', en: 'Mapo-gu', ar: 'مابو', 'zh-CN': '麻浦区', ja: '麻浦区', 'zh-TW': '麻浦區', es: 'Mapo-gu' };

export const CURATION_STORES: CurationStore[] = [
  // 홈 가게 탐색의 같은 가게와 id를 같이 써서 저장 상태도 같다.
  { id: 'home-green-table', name: { ko: '초록식탁', en: 'Green Table', ar: 'Green Table' }, reviewCount: 12, district: SEONGDONG, category: 'korean', distanceMeters: 350, area: 'seongsu' },
  { id: 'curation-hansang', name: { ko: '한상가득', en: 'Hansang Gadeuk', ar: 'Hansang Gadeuk' }, reviewCount: 9, district: JONGNO, category: 'korean', distanceMeters: 1800, area: 'gwanghwamun-jongno' },
  { id: 'curation-sotbap', name: { ko: '솥밥정', en: 'Sotbap Jeong', ar: 'Sotbap Jeong' }, reviewCount: 6, district: MAPO, category: 'korean', distanceMeters: 4200, area: 'hongdae-sinchon' },
];

