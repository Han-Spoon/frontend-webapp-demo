import type { LocalizedText } from '../../locales';

/**
 * 가게 후보의 `categoryName`(예: "음식점 > 한식 > 육류,고기 > 갈비")을 지도 목록용 짧은 음식 종류로 묶는다.
 * 위에서부터 먼저 맞는 규칙을 쓴다(예: "한식 > 해물,생선 > 회"는 한식보다 횟집·해물이 먼저).
 * 어느 규칙에도 맞지 않거나 분류가 없으면 기타.
 */
export type FoodCategoryId =
  | 'korean' | 'meat' | 'seafood' | 'snack' | 'chinese' | 'japanese' | 'western'
  | 'asian' | 'chicken' | 'burger' | 'shabu' | 'buffet' | 'pub' | 'cafe' | 'other';

interface Rule {
  id: FoodCategoryId;
  /** 분류 조각에 포함되면 맞음 */
  includes?: string[];
  /** 한 글자처럼 오인되기 쉬운 말은 조각 전체가 같을 때만 맞음 */
  equals?: string[];
}

const RULES: Rule[] = [
  { id: 'cafe', includes: ['카페', '디저트', '베이커리', '제과', '커피', '아이스크림', '빙수', '한과'] },
  { id: 'pub', includes: ['술집', '호프', '요리주점', '이자카야', '포장마차', '와인', '칵테일', '맥주'] },
  { id: 'buffet', includes: ['뷔페'] },
  { id: 'shabu', includes: ['샤브샤브'] },
  { id: 'chicken', includes: ['치킨', '닭강정'] },
  { id: 'burger', includes: ['햄버거', '버거', '패스트푸드', '샌드위치'] },
  { id: 'seafood', includes: ['횟집', '회센터', '해물', '생선', '해산물', '장어', '낙지', '주꾸미', '쭈꾸미', '조개', '대게', '아구', '복어', '참치', '굴', '전복'], equals: ['회'] },
  { id: 'meat', includes: ['육류', '고기', '갈비', '삼겹살', '곱창', '막창', '족발', '보쌈', '닭요리', '닭갈비', '오리', '불고기', '한우', '정육', '돼지', '소고기'] },
  { id: 'chinese', includes: ['중식', '중국', '짜장', '짬뽕', '마라', '딤섬', '양꼬치'] },
  { id: 'japanese', includes: ['일식', '초밥', '스시', '돈까스', '돈가스', '우동', '라멘', '일본', '오마카세', '소바', '규동'] },
  { id: 'snack', includes: ['분식', '떡볶이', '김밥', '라면', '만두'] },
  { id: 'western', includes: ['양식', '이탈리', '파스타', '피자', '스테이크', '프랑스', '스페인', '패밀리레스토랑', '브런치', '멕시'] },
  { id: 'asian', includes: ['아시아', '베트남', '쌀국수', '태국', '인도', '커리', '카레', '동남아', '터키', '중동'] },
  { id: 'korean', includes: ['한식', '한정식', '백반', '국밥', '찌개', '전골', '해장국', '국수', '냉면', '비빔밥', '쌈밥', '두부', '설렁탕', '곰탕', '감자탕', '순대', '수제비', '도시락'], equals: ['죽'] },
];

/** 칩 순서 */
export const FOOD_CATEGORY_ORDER: FoodCategoryId[] = [
  'korean', 'meat', 'seafood', 'snack', 'chinese', 'japanese', 'western', 'asian',
  'chicken', 'burger', 'shabu', 'buffet', 'pub', 'cafe', 'other',
];

export const FOOD_CATEGORY_LABELS: Record<FoodCategoryId, LocalizedText> = {
  korean: { ko: '한식', en: 'Korean', ar: 'كوري', 'zh-CN': '韩餐', ja: '韓国料理', 'zh-TW': '韓式', es: 'Coreana' },
  meat: { ko: '고기', en: 'Meat & BBQ', ar: 'لحوم ومشويات', 'zh-CN': '烤肉', ja: '肉料理', 'zh-TW': '烤肉', es: 'Carnes' },
  seafood: { ko: '횟집·해물', en: 'Seafood', ar: 'مأكولات بحرية', 'zh-CN': '海鲜', ja: '刺身・海鮮', 'zh-TW': '海鮮', es: 'Mariscos' },
  // 분식: 떡볶이·김밥·라면·만두 같은 한국식 간편 음식. 'Snacks'는 과자·간식으로 읽혀 쓰지 않는다.
  snack: { ko: '분식', en: 'Street food', ar: 'أكلات الشارع', 'zh-CN': '韩式小吃', ja: '粉食（ブンシク）', 'zh-TW': '韓式小吃', es: 'Comida callejera' },
  chinese: { ko: '중식', en: 'Chinese', ar: 'صيني', 'zh-CN': '中餐', ja: '中華', 'zh-TW': '中式', es: 'China' },
  japanese: { ko: '일식', en: 'Japanese', ar: 'ياباني', 'zh-CN': '日料', ja: '和食', 'zh-TW': '日式', es: 'Japonesa' },
  western: { ko: '양식', en: 'Western', ar: 'غربي', 'zh-CN': '西餐', ja: '洋食', 'zh-TW': '西式', es: 'Occidental' },
  asian: { ko: '아시안', en: 'Asian', ar: 'آسيوي', 'zh-CN': '亚洲菜', ja: 'アジア料理', 'zh-TW': '亞洲菜', es: 'Asiática' },
  chicken: { ko: '치킨', en: 'Fried chicken', ar: 'دجاج مقلي', 'zh-CN': '炸鸡', ja: 'チキン', 'zh-TW': '炸雞', es: 'Pollo frito' },
  burger: { ko: '버거', en: 'Burgers', ar: 'برغر', 'zh-CN': '汉堡', ja: 'バーガー', 'zh-TW': '漢堡', es: 'Hamburguesas' },
  shabu: { ko: '샤브샤브', en: 'Shabu-shabu', ar: 'شابو شابو', 'zh-CN': '涮涮锅', ja: 'しゃぶしゃぶ', 'zh-TW': '涮涮鍋', es: 'Shabu-shabu' },
  buffet: { ko: '뷔페', en: 'Buffet', ar: 'بوفيه', 'zh-CN': '自助餐', ja: 'ビュッフェ', 'zh-TW': '自助餐', es: 'Bufé' },
  pub: { ko: '술집', en: 'Bars', ar: 'حانات', 'zh-CN': '酒馆', ja: '居酒屋・バー', 'zh-TW': '酒館', es: 'Bares' },
  cafe: { ko: '카페', en: 'Cafés', ar: 'مقاهٍ', 'zh-CN': '咖啡馆', ja: 'カフェ', 'zh-TW': '咖啡廳', es: 'Cafeterías' },
  other: { ko: '기타', en: 'Other', ar: 'أخرى', 'zh-CN': '其他', ja: 'その他', 'zh-TW': '其他', es: 'Otros' },
};

/** 음식 종류 버튼 앞 그림 문자(장식용, 스크린리더에는 읽히지 않게 한다) */
export const FOOD_CATEGORY_ICONS: Record<FoodCategoryId, string> = {
  korean: '🍚',
  meat: '🥩',
  seafood: '🐟',
  snack: '🍢',
  chinese: '🥡',
  japanese: '🍣',
  western: '🍝',
  asian: '🍜',
  chicken: '🍗',
  burger: '🍔',
  shabu: '🍲',
  buffet: '🍽️',
  pub: '🍺',
  cafe: '☕',
  other: '🍴',
};

export function foodCategoryOf(categoryName?: string | null): FoodCategoryId {
  // 첫 조각 "음식점"은 분류에 쓰지 않는다.
  const parts = (categoryName ?? '').split(/\s*[>,]\s*/).map((part) => part.trim()).filter((part) => part && part !== '음식점');
  const rule = RULES.find(({ includes = [], equals = [] }) =>
    parts.some((part) => equals.includes(part) || includes.some((word) => part.includes(word))),
  );
  return rule?.id ?? 'other';
}
