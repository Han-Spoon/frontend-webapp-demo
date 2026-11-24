import type { MenuAnalysis, MenuIngredientEvidence, UserProfile } from '../types';

/**
 * 흐름 4(판정 결과) 미리보기 fixture. 캔버스 「한스푼 새 테마」 F4 보드와 같은 메뉴 · 판정.
 * /dev/results-preview?demo=1 에서만 쓴다(실제 API 판정을 덮어쓰지 않음).
 */
export const GUIDE_PREVIEW_PROFILE: UserProfile = {
  nationality: 'US',
  languageCode: 'ko',
  isFirstTime: false,
  isVegan: false,
  veganType: null,
  hasReligion: false,
  religionType: null,
  hasAllergies: true,
  allergies: ['shrimp', 'milk'],
  noSpicy: true,
  noAlcohol: false,
};

const SHRIMP = 'allergy:shrimp';
const MILK = 'allergy:milk';

const ing = (ko: string, en: string, profileId: string, extra: Partial<MenuIngredientEvidence> = {}): MenuIngredientEvidence => ({
  name: { ko, en },
  profileIds: [profileId],
  status: 'unknown',
  ...extra,
});

const say = (ko: string, en: string) => ({ ko, en });

export const GUIDE_PREVIEW_MENUS: MenuAnalysis[] = [
  {
    id: 'guide-pajeon', displayOrder: 0, menuName: '해물파전', menuNameEn: 'Seafood pancake', description: '해물과 파를 넣어 부친 전', descriptionEn: 'Savory pancake with seafood and green onion',
    price: '16000', riskLevel: 'danger', evidenceBasis: 'confirmed', informationStatus: 'complete', riskReasons: ['is_shrimp'], isSpicy: false,
    notes: [{ code: 'hard_to_remove', text: '새우는 이 메뉴의 주재료라 빼기 어려울 수 있어요.' }],
    explainability: {
      verdict: say('새우가 들어 있어요. 내 새우 알레르기와 겹쳐요.', 'It contains shrimp, which matches your shrimp allergy.'),
      ingredients: [ing('새우', 'Shrimp', SHRIMP, { status: 'present', role: 'identity' }), ing('우유', 'Milk', MILK)],
      curationId: 'korean-table',
    },
    staffQuestions: [{ questionId: 'q-pajeon-milk', cardId: 'c-pajeon', target: 'ingredient', ingredientName: '우유', questionText: { ko: '이 메뉴에 우유가 들어가나요?' }, status: 'pending', answer: null }],
  },
  {
    id: 'guide-risotto', displayOrder: 1, menuName: '버섯 크림 리조또', menuNameEn: 'Mushroom cream risotto', description: '양송이와 생크림으로 끓인 리조또', descriptionEn: 'Risotto with button mushrooms and fresh cream',
    price: '15000', riskLevel: 'caution', evidenceBasis: 'estimated', informationStatus: 'complete', riskReasons: ['is_milk'], isSpicy: false,
    explainability: {
      verdict: say('크림 소스에 우유가 들어갈 수 있어요.', 'The cream sauce may contain milk.'),
      decisionReason: say('유제품을 쓰는지 주문 전에 확인해 주세요.', 'Ask whether dairy is used before ordering.'),
      ingredients: [ing('우유', 'Milk', MILK, { role: 'hidden', inclusionProbability: 82 }), ing('버터', 'Butter', MILK)],
      curationId: 'sauce-on-side',
    },
  },
  {
    id: 'guide-bibimbap', displayOrder: 2, menuName: '비빔밥', menuNameEn: 'Bibimbap', description: '밥 위에 나물과 고추장을 올려 비벼 먹는 음식', descriptionEn: 'Rice topped with seasoned vegetables and chili paste',
    price: '10000', riskLevel: 'safe', evidenceBasis: 'confirmed', informationStatus: 'complete', riskReasons: [], isSpicy: true,
    explainability: {
      verdict: say('확보한 정보에서 식단 충돌을 찾지 못했어요.', 'No dietary conflict was found in the available information.'),
      ingredients: [ing('새우', 'Shrimp', SHRIMP, { status: 'absent' }), ing('우유', 'Milk', MILK, { status: 'absent' })],
      curationId: 'korean-table',
    },
  },
  {
    id: 'guide-doenjang', displayOrder: 3, menuName: '된장찌개', menuNameEn: 'Soybean paste stew', description: '된장에 두부와 채소를 넣어 끓인 찌개', descriptionEn: 'Stew of soybean paste, tofu and vegetables',
    price: '9000', priceOptions: [{ label: '2인', priceText: '18000', inferred: true }], riskLevel: 'caution', evidenceBasis: 'unknown', informationStatus: 'partial', riskReasons: [], isSpicy: false,
    explainability: {
      verdict: say('재료 정보가 부족해 확률을 계산하지 못했어요. 먹기 전에 직원에게 재료를 물어보세요.', 'There wasn’t enough ingredient information to estimate. Ask staff before eating.'),
      ingredients: [ing('새우', 'Shrimp', SHRIMP)],
      curationId: 'shared-stew',
    },
  },
  {
    id: 'guide-japchae', displayOrder: 4, menuName: '잡채', menuNameEn: 'Japchae', description: '당면과 채소를 볶아 버무린 음식', descriptionEn: 'Stir-fried glass noodles with vegetables',
    price: '12000', riskLevel: 'caution', evidenceBasis: 'estimated', informationStatus: 'complete', riskReasons: ['is_shrimp'], isSpicy: false,
    explainability: {
      verdict: say('고명에 새우가 올라갈 수 있어요. 먼저 확인해 주세요.', 'Shrimp may be used as a topping. Check first.'),
      ingredients: [ing('새우', 'Shrimp', SHRIMP, { role: 'component', inclusionProbability: 35 })],
    },
  },
  {
    id: 'guide-set', displayOrder: 5, menuName: '모둠 분식 세트', menuNameEn: 'Assorted street-food set', description: '떡볶이 · 김밥 · 튀김을 함께 담은 세트', descriptionEn: 'Tteokbokki, gimbap and fried snacks in one set',
    price: '13000', riskLevel: 'caution', evidenceBasis: 'estimated', informationStatus: 'complete', riskReasons: ['is_shrimp', 'is_milk'], isSpicy: true,
    explainability: {
      verdict: say('새우와 유제품이 들어갈 수 있는 메뉴가 섞인 세트예요.', 'This set mixes dishes that may contain shrimp or dairy.'),
      decisionReason: say('튀김옷과 소스에 쓰였을 가능성이 있어요.', 'They may be used in the batter and sauces.'),
      ingredients: [
        ing('새우', 'Shrimp', SHRIMP, { inclusionProbability: 64 }),
        ing('새우젓', 'Salted shrimp', SHRIMP, { role: 'hidden', inclusionProbability: 47 }),
        ing('치즈', 'Cheese', MILK, { inclusionProbability: 35 }),
        ing('버터', 'Butter', MILK, { role: 'hidden', inclusionProbability: 31 }),
        ing('우유', 'Milk', MILK, { role: 'hidden', inclusionProbability: 28 }),
        ing('마요네즈', 'Mayonnaise', MILK, { role: 'hidden', inclusionProbability: 19 }),
        ing('크림 소스', 'Cream sauce', MILK),
      ],
      curationId: 'bunsik',
    },
  },
  {
    id: 'guide-special', displayOrder: 6, menuName: '오늘의 특선', menuNameEn: 'Today’s special', description: '', price: '시가', riskLevel: 'unknown', informationStatus: 'none', riskReasons: [], isSpicy: false,
    notes: [{ code: 'ambiguous_menu', text: '메뉴 이름만으로는 어떤 음식인지 알기 어려운 메뉴예요.' }],
  },
];
