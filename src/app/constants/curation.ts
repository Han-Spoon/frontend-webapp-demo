import type { Language } from '../types';
import { translateText, type LocalizedText } from '../locales';
import { EXTRA_CURATION_ARTICLES } from './curationExtra';

/** 큐레이션 이미지: Wikimedia Commons 직링크. 로드 실패 시 컴포넌트의 그라데이션·이모지 대체. */
const commons = (file: string, width = 800) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;

export type CurationTag = 'culture' | 'restaurant' | 'food' | 'tips';

export const CURATION_TAGS: { key: CurationTag; label: LocalizedText }[] = [
  { key: 'culture', label: { ko: '식문화', en: 'Food Culture', ar: 'ثقافة الطعام' } },
  { key: 'restaurant', label: { ko: '식당에서', en: 'At the Table', ar: 'في المطعم' } },
  { key: 'food', label: { ko: '한식 이야기', en: 'Korean Food', ar: 'الطعام الكوري' } },
  { key: 'tips', label: { ko: '알아두기', en: 'Good to Know', ar: 'معلومة مفيدة' } },
];

export const tagLabel = (key: CurationTag, language: Language) =>
  CURATION_TAGS.find((t) => t.key === key)?.label
    ? translateText(language, CURATION_TAGS.find((t) => t.key === key)!.label)
    : key;

export interface CurationArticle {
  id: string;
  emoji: string;
  accent: string;
  image: string;
  imagePosition?: string;
  date: string; // ISO
  tag: CurationTag;
  title: LocalizedText;
  excerpt: LocalizedText;
  /** 히어로 캐러셀 노출 */
  featured?: boolean;
  gradient?: string;
  subtitle?: LocalizedText;
}

export const CURATION_ARTICLES: CurationArticle[] = [
  ...EXTRA_CURATION_ARTICLES,
  // ───────── 히어로(featured) ─────────
  {
    id: 'korean-table',
    emoji: '🍚',
    accent: 'bg-amber-50',
    image: '/images/curation/banchan-table.webp',
    date: '2026-06-05',
    tag: 'culture',
    featured: true,
    gradient: 'from-amber-500 to-orange-600',
    title: { ko: '한 상 가득, 한국의 밥상', en: 'A Table Full of Korea', ar: 'مائدة كورية عامرة' },
    subtitle: {
      ko: '밥·국·반찬이 어우러지는 정(情)의 한 끼',
      en: 'Rice, soup, and many sides — a meal of warmth',
      ar: 'أرز وحساء وأطباق جانبية — وجبة من الدفء',
    },
    excerpt: {
      ko: '한꺼번에 펼쳐지는 그릇들, 그 안에 담긴 환대의 마음',
      en: 'Everything at once — the Korean spirit of hospitality',
      ar: 'كل شيء دفعة واحدة — روح الضيافة الكورية',
    },
  },
  {
    id: 'fermentation',
    emoji: '🥬',
    accent: 'bg-emerald-50',
    image: '/images/curation/fermentation.webp',
    date: '2026-06-04',
    tag: 'food',
    featured: true,
    gradient: 'from-emerald-500 to-teal-600',
    title: { ko: '발효의 나라', en: 'Land of Fermentation', ar: 'بلاد التخمير' },
    subtitle: {
      ko: '김치·된장·고추장, 시간이 빚어낸 깊은 맛',
      en: 'Kimchi, doenjang, gochujang — flavors aged by time',
      ar: 'كيمتشي ودوينجانغ وغوتشوغانغ — نكهات صنعها الزمن',
    },
    excerpt: {
      ko: '장독대에서 익어가는 한국의 ‘느린 맛’',
      en: "Korea's slow flavors, ripening in clay jars",
      ar: 'نكهات كوريا البطيئة، تنضج في الجِرار',
    },
  },
  {
    id: 'chimaek',
    emoji: '🍗',
    accent: 'bg-yellow-50',
    image: '/images/curation/chimaek.webp',
    date: '2026-06-03',
    tag: 'culture',
    featured: true,
    gradient: 'from-yellow-500 to-amber-600',
    title: { ko: '오늘 밤은 치맥', en: 'Tonight: Chimaek', ar: 'الليلة: تشيماك' },
    subtitle: {
      ko: '바삭한 치킨에 시원한 맥주 한 잔',
      en: 'Crispy fried chicken meets cold beer',
      ar: 'دجاج مقلي مقرمش مع بيرة باردة',
    },
    excerpt: {
      ko: '치킨(chicken)+맥주(maekju)=치맥, 한국인의 밤 문화',
      en: 'Chicken + maekju = chimaek, Korea’s night ritual',
      ar: 'دجاج + بيرة = تشيماك، طقس الليل الكوري',
    },
  },
  {
    id: 'bunsik',
    emoji: '🌶️',
    accent: 'bg-rose-50',
    image: commons('Korean.snacks-Tteokbokki-08.jpg'),
    date: '2026-06-02',
    tag: 'food',
    featured: true,
    gradient: 'from-rose-500 to-red-600',
    title: { ko: '길거리 분식의 세계', en: 'Korean Street Snacks', ar: 'وجبات الشارع الكورية' },
    subtitle: {
      ko: '떡볶이·김밥·순대, 소박하지만 중독적인',
      en: 'Tteokbokki, gimbap, sundae — simple yet addictive',
      ar: 'تيوكبوكي وغيمباب وسونداي — بسيطة لكنها تُدمن',
    },
    excerpt: {
      ko: '학교 앞 추억의 맛, 떡볶이 한 접시의 행복',
      en: 'The after-school taste everyone remembers',
      ar: 'نكهة ما بعد المدرسة التي يتذكّرها الجميع',
    },
  },

  // ───────── 피드 ─────────
  {
    id: 'banchan-free',
    emoji: '🥗',
    accent: 'bg-emerald-50',
    image: '/images/curation/banchan-table.webp',
    date: '2026-05-28',
    tag: 'culture',
    title: {
      ko: '왜 한국 식당의 반찬은 공짜일까?',
      en: 'Why are side dishes free in Korea?',
      ar: 'لماذا الأطباق الجانبية مجانية في كوريا؟',
    },
    excerpt: {
      ko: '김치·나물이 기본으로, 리필까지 — 정(情)의 식문화',
      en: 'Kimchi and greens for free, refills included',
      ar: 'كيمتشي وخضار مجانًا، مع إعادة التعبئة',
    },
  },
  {
    id: 'grill-cut',
    emoji: '🥩',
    accent: 'bg-rose-50',
    image: '/images/curation/grill.webp',
    date: '2026-05-24',
    tag: 'restaurant',
    title: {
      ko: '사장님이 고기를 직접 잘라주는 이유',
      en: 'Why staff grill and cut your meat',
      ar: 'لماذا يشوي الموظفون اللحم ويقطعونه',
    },
    excerpt: {
      ko: '테이블 불판 위 바비큐, 그리고 쌈의 즐거움',
      en: 'Tableside barbecue and the joy of ssam',
      ar: 'شواء على الطاولة ومتعة «السام»',
    },
  },
  {
    id: 'kimchi-200',
    emoji: '🥬',
    accent: 'bg-orange-50',
    image: commons('Korea-Sokcho-Kkakdugi-Radish kimchi-01.jpg'),
    date: '2026-05-20',
    tag: 'food',
    title: {
      ko: '김치는 한 종류가 아니다 — 200가지의 얼굴',
      en: "Kimchi isn't just one thing — 200 kinds",
      ar: 'الكيمتشي ليس نوعًا واحدًا — 200 نوع',
    },
    excerpt: {
      ko: '배추·무·오이… 지역과 계절이 빚는 수백 가지',
      en: 'Cabbage, radish, cucumber — hundreds of kinds',
      ar: 'ملفوف وفجل وخيار — مئات الأنواع',
    },
  },
  {
    id: 'shared-stew',
    emoji: '🍲',
    accent: 'bg-amber-50',
    image: commons('Korean stew-Sundubu jjigae-05.jpg'),
    date: '2026-05-15',
    tag: 'culture',
    title: {
      ko: '찌개 하나를 같이 떠먹는 정(情)',
      en: 'Sharing one bubbling stew, together',
      ar: 'مشاركة وعاء حساء واحد',
    },
    excerpt: {
      ko: '가운데 끓는 뚝배기, 함께 나누는 한 끼',
      en: 'One bubbling pot in the middle, shared',
      ar: 'وعاء يغلي في المنتصف، يُشارَك',
    },
  },
  {
    id: 'haejangguk',
    emoji: '🍜',
    accent: 'bg-red-50',
    image: commons('Haejangguk (hangover soup).jpg'),
    date: '2026-05-10',
    tag: 'culture',
    title: {
      ko: '숙취엔 해장국 — 술 마신 다음 날의 의식',
      en: 'Haejangguk: the morning-after ritual',
      ar: 'حساء الهيجانغ: طقس صباح اليوم التالي',
    },
    excerpt: {
      ko: '뜨끈한 국물 한 그릇으로 푸는 어제의 피로',
      en: 'A hot bowl that soothes yesterday',
      ar: 'وعاء ساخن يخفف تعب الأمس',
    },
  },
  {
    id: 'metal-chopsticks',
    emoji: '🥢',
    accent: 'bg-neutral-100',
    image: commons('Cuchara y palitos coreanos.JPG'),
    date: '2026-05-04',
    tag: 'tips',
    title: {
      ko: '젓가락은 납작한 쇠젓가락',
      en: "Korea's flat metal chopsticks",
      ar: 'عيدان الطعام المعدنية المسطحة',
    },
    excerpt: {
      ko: '밥·국은 숟가락, 반찬은 젓가락 — 식탁의 작은 규칙',
      en: 'Spoon for rice and soup, chopsticks for sides',
      ar: 'الملعقة للأرز والحساء، والعيدان للأطباق',
    },
  },
];

export const HERO_ARTICLES = CURATION_ARTICLES.filter((a) => a.featured);
export const FEED_ARTICLES = CURATION_ARTICLES.filter((a) => !a.featured);
