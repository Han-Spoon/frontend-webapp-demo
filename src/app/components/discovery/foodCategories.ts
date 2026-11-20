import type { LocalizedText } from '../../locales';

/**
 * 가게 후보의 업종 코드(`categoryCode`, 소상공인 상권업종 분류)를 지도 목록용 짧은 음식 종류로 묶는다.
 * 상가정보 가게는 한식 소분류(I201xx)와 분식(I21007)만, LOCALDATA 가게는 중분류(I201~I210)나 대분류(I2)만 온다.
 * 코드가 없으면 같은 표의 분류 이름으로 찾고, 표에 없는 값·중분류 '한식'·대분류 '음식'은 기타.
 */
export type FoodCategoryId =
  | 'korean' | 'soup' | 'meat' | 'seafood' | 'noodle' | 'snack'
  | 'chinese' | 'japanese' | 'western' | 'other';

const BY_CODE: Record<string, { id: FoodCategoryId; name: string }> = {
  I20101: { id: 'korean', name: '백반/한정식' },
  I20104: { id: 'korean', name: '전/부침개' },
  I20102: { id: 'soup', name: '국/탕/찌개류' },
  I20103: { id: 'meat', name: '족발/보쌈' },
  I20107: { id: 'meat', name: '돼지고기 구이/찜' },
  I20108: { id: 'meat', name: '소고기 구이/찜' },
  I20109: { id: 'meat', name: '곱창 전골/구이' },
  I20110: { id: 'meat', name: '닭/오리고기 구이/찜' },
  I20111: { id: 'seafood', name: '횟집' },
  I20112: { id: 'seafood', name: '해산물 구이/찜' },
  I20113: { id: 'seafood', name: '복 요리 전문' },
  I20105: { id: 'noodle', name: '국수/칼국수' },
  I20106: { id: 'noodle', name: '냉면/밀면' },
  I21007: { id: 'snack', name: '김밥/만두/분식' },
  // LOCALDATA 업태 '분식'이 붙는 중분류
  I210: { id: 'snack', name: '기타 간이' },
  I202: { id: 'chinese', name: '중식' },
  I203: { id: 'japanese', name: '일식' },
  I204: { id: 'western', name: '서양식' },
  I20199: { id: 'other', name: '기타 한식 음식점' },
  I201: { id: 'other', name: '한식' },
  I2: { id: 'other', name: '음식' },
};

const BY_NAME = new Map(Object.values(BY_CODE).map(({ id, name }) => [name, id]));

/** 칩 순서 */
export const FOOD_CATEGORY_ORDER: FoodCategoryId[] = [
  'korean', 'soup', 'meat', 'seafood', 'noodle', 'snack', 'chinese', 'japanese', 'western', 'other',
];

export const FOOD_CATEGORY_LABELS: Record<FoodCategoryId, LocalizedText> = {
  korean: { ko: '한식', en: 'Korean', ar: 'كوري', 'zh-CN': '韩餐', ja: '韓国料理', 'zh-TW': '韓式', es: 'Coreana' },
  soup: { ko: '국·탕·찌개', en: 'Soups & stews', ar: 'شوربات ويخنات', 'zh-CN': '汤·炖锅', ja: 'スープ・鍋', 'zh-TW': '湯·燉鍋', es: 'Sopas y guisos' },
  meat: { ko: '고기', en: 'Meat & BBQ', ar: 'لحوم ومشويات', 'zh-CN': '烤肉', ja: '肉料理', 'zh-TW': '烤肉', es: 'Carnes' },
  seafood: { ko: '횟집·해물', en: 'Seafood', ar: 'مأكولات بحرية', 'zh-CN': '海鲜', ja: '刺身・海鮮', 'zh-TW': '海鮮', es: 'Mariscos' },
  noodle: { ko: '국수·냉면', en: 'Noodles', ar: 'نودلز', 'zh-CN': '面条', ja: '麺料理', 'zh-TW': '麵食', es: 'Fideos' },
  // 분식: 떡볶이·김밥·라면·만두 같은 한국식 간편 음식. 'Snacks'는 과자·간식으로 읽혀 쓰지 않는다.
  snack: { ko: '분식', en: 'Street food', ar: 'أكلات الشارع', 'zh-CN': '韩式小吃', ja: '粉食（ブンシク）', 'zh-TW': '韓式小吃', es: 'Comida callejera' },
  chinese: { ko: '중식', en: 'Chinese', ar: 'صيني', 'zh-CN': '中餐', ja: '中華', 'zh-TW': '中式', es: 'China' },
  japanese: { ko: '일식', en: 'Japanese', ar: 'ياباني', 'zh-CN': '日料', ja: '和食', 'zh-TW': '日式', es: 'Japonesa' },
  western: { ko: '양식', en: 'Western', ar: 'غربي', 'zh-CN': '西餐', ja: '洋食', 'zh-TW': '西式', es: 'Occidental' },
  other: { ko: '기타', en: 'Other', ar: 'أخرى', 'zh-CN': '其他', ja: 'その他', 'zh-TW': '其他', es: 'Otros' },
};

/** 음식 종류 버튼 앞 그림 문자(장식용, 스크린리더에는 읽히지 않게 한다) */
export const FOOD_CATEGORY_ICONS: Record<FoodCategoryId, string> = {
  korean: '🍚',
  soup: '🍲',
  meat: '🥩',
  seafood: '🐟',
  noodle: '🍜',
  snack: '🍢',
  chinese: '🥡',
  japanese: '🍣',
  western: '🍝',
  other: '🍴',
};

export function foodCategoryOf(store: { categoryCode?: string | null; categoryName?: string | null }): FoodCategoryId {
  const code = store.categoryCode?.trim();
  if (code) return BY_CODE[code]?.id ?? 'other';
  return BY_NAME.get(store.categoryName?.trim() ?? '') ?? 'other';
}
