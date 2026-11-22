import type { CurationArticle, CurationTag } from './curation';
import { CURATION_EXTRA_ZH_TW } from './curationExtraZhTw';

const commons = (file: string, width = 900) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;

const storyPhotos: Record<string, string> = {
  'sauce-on-side': '/images/curation/sauce-on-side.webp',
  'market-small-plates': commons('Seoul-Namdaemun.Market-Street.food-02.jpg'),
  'solo-table': '/images/curation/solo.webp',
  'broth-question': commons('Korean stew-Sundubu jjigae-05.jpg'),
  'seongsu-walk': commons('Seongsu Street.jpg'),
  'busan-seaside': commons('Haeundae Beach, Busan.jpg'),
  'spice-conversation': commons('Korean.snacks-Tteokbokki-08.jpg'),
  'banchan-questions': '/images/curation/banchan-table.webp',
  'cafe-pause': commons('Coffee and Tea at Droptop Cafe, Seoul.jpg'),
  'halal-conversation': '/images/curation/diet-conversation.webp',
  'menu-memory': '/images/curation/meal-memory.webp',
  'ordering-rhythm': '/images/curation/diet-conversation.webp',
};

// 시연용 자체 작성 글. zh-TW는 대만 전용 문안으로 별도 관리.
const stories: {
  id: string;
  emoji: string;
  tag: CurationTag;
  ko: string;
  en: string;
  ar: string;
  introKo: string;
  introEn: string;
  introAr: string;
}[] = [
  {
    id: 'sauce-on-side',
    emoji: '🥣',
    tag: 'tips',
    ko: '소스는 따로, 취향은 가까이',
    en: 'Sauce on the side, your way',
    ar: 'الصلصة جانباً، حسب ذوقك',
    introKo: '작은 그릇 하나가 만들어주는 선택의 여유',
    introEn: 'A little bowl can give you more choice',
    introAr: 'وعاء صغير يمنحك حرية الاختيار',
  },
  {
    id: 'market-small-plates',
    emoji: '🏮',
    tag: 'culture',
    ko: '시장에서 시작하는 작은 한 입',
    en: 'Small bites at the market',
    ar: 'لقمات صغيرة في السوق',
    introKo: '다 먹어보기보다, 마음에 드는 한 가지부터',
    introEn: 'Start with one dish that catches your eye',
    introAr: 'ابدأ بطبق يلفت انتباهك',
  },
  {
    id: 'solo-table',
    emoji: '🪑',
    tag: 'restaurant',
    ko: '혼자여도 좋은 한국의 식탁',
    en: 'A table for one',
    ar: 'طاولة لشخص واحد',
    introKo: '혼밥을 편안하게 만드는 작은 주문 요령',
    introEn: 'Make a solo meal feel easy',
    introAr: 'اجعل وجبتك الفردية مريحة',
  },
  {
    id: 'broth-question',
    emoji: '🍲',
    tag: 'food',
    ko: '국물 속 이야기를 물어보세요',
    en: 'Ask what is in the broth',
    ar: 'اسأل عما في المرق',
    introKo: '맑은 국물에도 저마다의 재료가 있어요',
    introEn: 'Even a clear broth has its own ingredients',
    introAr: 'حتى المرق الصافي له مكوناته',
  },
  {
    id: 'seongsu-walk',
    emoji: '🌿',
    tag: 'culture',
    ko: '성수, 산책과 한 끼 사이',
    en: 'A stroll and a meal in Seongsu',
    ar: 'نزهة ووجبة في سونغسو',
    introKo: '목적지를 빽빽하게 채우지 않는 오후',
    introEn: 'Leave a little room in your afternoon',
    introAr: 'اترك مساحة في برنامجك',
  },
  {
    id: 'busan-seaside',
    emoji: '🌊',
    tag: 'culture',
    ko: '부산에서는 바다 곁 한 끼',
    en: 'A meal by the sea in Busan',
    ar: 'وجبة قرب البحر في بوسان',
    introKo: '풍경도 취향도 함께 고르는 여행',
    introEn: 'Choose the view and the food you enjoy',
    introAr: 'اختر المنظر والطعام الذي تحبه',
  },
  {
    id: 'spice-conversation',
    emoji: '🌶️',
    tag: 'tips',
    ko: '덜 맵게, 더 즐겁게',
    en: 'Less heat, more enjoyment',
    ar: 'حرارة أقل، متعة أكثر',
    introKo: '맵기의 기준은 대화로 맞춰가요',
    introEn: 'Find your spice level through conversation',
    introAr: 'حدد مستوى الحرارة بالحوار',
  },
  {
    id: 'banchan-questions',
    emoji: '🥬',
    tag: 'food',
    ko: '작은 반찬, 하나씩 알아가기',
    en: 'Get to know your banchan',
    ar: 'تعرّف على الأطباق الجانبية',
    introKo: '한 상의 작은 그릇에도 이름이 있어요',
    introEn: 'Every little plate has a story',
    introAr: 'لكل طبق صغير قصة',
  },
  {
    id: 'cafe-pause',
    emoji: '☕',
    tag: 'restaurant',
    ko: '카페에서 쉬어가는 한 페이지',
    en: 'A café pause in your day',
    ar: 'استراحة مقهى في يومك',
    introKo: '커피보다 먼저 고르는 오늘의 속도',
    introEn: 'Choose a slower pace before your coffee',
    introAr: 'اختر إيقاعاً أهدأ قبل القهوة',
  },
  {
    id: 'halal-conversation',
    emoji: '💬',
    tag: 'tips',
    ko: '내 식단을 설명하는 첫 문장',
    en: 'The first sentence about your diet',
    ar: 'الجملة الأولى عن نظامك الغذائي',
    introKo: '서로 이해하는 주문은 짧은 대화에서 시작해요',
    introEn: 'A thoughtful order starts with a short conversation',
    introAr: 'يبدأ الطلب الواضح بحوار قصير',
  },
  {
    id: 'menu-memory',
    emoji: '📖',
    tag: 'tips',
    ko: '맛있는 기억을 모으는 방법',
    en: 'Collect your food memories',
    ar: 'اجمع ذكريات الطعام',
    introKo: '이름을 잊기 전에, 오늘의 한 끼를 기록해요',
    introEn: 'Save today’s meal before its name slips away',
    introAr: 'احفظ وجبة اليوم قبل أن تنسى اسمها',
  },
  {
    id: 'ordering-rhythm',
    emoji: '🔔',
    tag: 'restaurant',
    ko: '주문부터 계산까지, 천천히',
    en: 'From ordering to paying',
    ar: 'من الطلب إلى الدفع',
    introKo: '낯선 식당의 리듬을 익히는 세 가지 질문',
    introEn: 'Three questions to find your way at the table',
    introAr: 'ثلاثة أسئلة لتعرف طريقة المطعم',
  },
];

export const EXTRA_CURATION_ARTICLES: CurationArticle[] = stories.map(
  (story) => {
    const zhTW = CURATION_EXTRA_ZH_TW[story.id];
    return ({
    id: story.id,
    emoji: story.emoji,
    tag: story.tag,
    accent: 'bg-brand-green-50',
    date: '2026-09-10',
    image: storyPhotos[story.id],
    title: { ko: story.ko, en: story.en, ar: story.ar, 'zh-TW': zhTW.title },
    excerpt: { ko: story.introKo, en: story.introEn, ar: story.introAr, 'zh-TW': zhTW.excerpt },
    });
  },
);
