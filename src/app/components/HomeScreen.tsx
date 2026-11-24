import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Language, UserProfile } from '../types';
import { translateText } from '../locales';
import { CURATION_ARTICLES, tagLabel } from '../constants/curation';
import type { StoreCandidate } from '../../api/store';
import { HOME_STORES, type HomeAreaId } from '../demo/homeStores';
import { SEOUL_AREAS } from './discovery/seoulAreas';
import { FOOD_CATEGORY_LABELS, type FoodCategoryId } from './discovery/foodCategories';
import { DietPromptCard } from './DietPromptCard';
import { useFixtureStoreSaves } from '../hooks/useFixtureStoreSaves';
import { BottomNav, FilterChip, HsIcon, HsIconButton, HsLinkButton, LanguageButton, Logo, OfflineBanner, StoreCard, tx, type AllText, type HsIconName } from './hs';

const H = {
  eyebrow: { ko: '한 숟가락씩, 나에게 맞게', en: 'ONE SPOONFUL AT A TIME', ar: 'ملعقة تلو الأخرى، كما يناسبك', 'zh-CN': '一勺一勺，适合我的', ja: 'ひとさじずつ、わたしに合わせて', 'zh-TW': '一勺一勺，適合我的', es: 'CUCHARADA A CUCHARADA' },
  title: { ko: '나에게 맞는\n한국 음식 찾기', en: 'Find Korean food\nthat suits you', ar: 'اعثر على طعام كوري\nيناسبك', 'zh-CN': '寻找\n适合我的韩国美食', ja: 'わたしに合う\n韓国料理を見つけよう', 'zh-TW': '尋找\n適合我的韓國美食', es: 'Encuentra comida coreana\na tu medida' },
  myPage: { ko: '마이페이지', en: 'My page', ar: 'صفحتي', 'zh-CN': '我的页面', ja: 'マイページ', 'zh-TW': '我的頁面', es: 'Mi página' },
  stories: { ko: '한스푼 저널', en: 'Han Spoon Journal', ar: 'مجلة هان سبون', 'zh-CN': '韩勺专栏', ja: 'ハンスプーン・ジャーナル', 'zh-TW': '韓勺專欄', es: 'Diario Han Spoon' },
  story: { ko: '이야기', en: 'Story', ar: 'قصة', 'zh-CN': '故事', ja: 'ストーリー', 'zh-TW': '故事', es: 'Historia' },
  craving: { ko: '오늘은 뭐가 당기세요?', en: 'What are you craving today?', ar: 'ماذا تشتهي اليوم؟', 'zh-CN': '今天想吃什么？', ja: '今日は何が食べたい？', 'zh-TW': '今天想吃什麼？', es: '¿Qué te apetece hoy?' },
  spotlightEyebrow: { ko: '스포트라이트', en: 'SPOTLIGHT', ar: 'تحت الضوء', 'zh-CN': '焦点', ja: 'スポットライト', 'zh-TW': '焦點', es: 'EN FOCO' },
  spotlightTitle: { ko: '최근 주목 받고 있는\n식당 모음', en: 'Restaurants getting\nattention lately', ar: 'مطاعم تحظى\nباهتمام مؤخرًا', 'zh-CN': '最近备受关注的\n餐厅合集', ja: '最近注目されている\nお店まとめ', 'zh-TW': '最近備受關注的\n餐廳合集', es: 'Restaurantes que\ndan que hablar' },
  explore: { ko: '가게 탐색', en: 'Explore restaurants', ar: 'استكشف المطاعم', 'zh-CN': '探索餐厅', ja: 'お店を探す', 'zh-TW': '探索餐廳', es: 'Explorar restaurantes' },
  fullMap: { ko: '전체 지도', en: 'Full map', ar: 'الخريطة كاملة', 'zh-CN': '完整地图', ja: '地図全体', 'zh-TW': '完整地圖', es: 'Mapa completo' },
  nearby: { ko: '내 주변', en: 'Near me', ar: 'بالقرب مني', 'zh-CN': '我附近', ja: '近く', 'zh-TW': '我附近', es: 'Cerca de mí' },
  areas: { ko: '지역', en: 'Areas', ar: 'المناطق', 'zh-CN': '地区', ja: 'エリア', 'zh-TW': '地區', es: 'Zonas' },
} satisfies Record<string, AllText>;

// 음식 종류 8가지(지도 필터와 같은 이름 · 순서). 4개씩 두 줄.
const CRAVINGS: Array<{ id: FoodCategoryId; icon: HsIconName; tone: string }> = [
  { id: 'korean', icon: 'bowl', tone: 'bg-hs-mint-100 text-hs-brand-700' },
  { id: 'soup', icon: 'pot', tone: 'bg-hs-coral-100 text-hs-coral-700' },
  { id: 'meat', icon: 'meat', tone: 'bg-hs-surface-100 text-hs-ink-700' },
  { id: 'seafood', icon: 'fish', tone: 'bg-hs-mint-100 text-hs-brand-700' },
  { id: 'noodle', icon: 'noodle', tone: 'bg-hs-coral-100 text-hs-coral-700' },
  { id: 'snack', icon: 'skewer', tone: 'bg-hs-surface-100 text-hs-ink-700' },
  { id: 'chinese', icon: 'dumpling', tone: 'bg-hs-mint-100 text-hs-brand-700' },
  { id: 'western', icon: 'cutlery', tone: 'bg-hs-coral-100 text-hs-coral-700' },
];

/** 큐레이션 배너 자동 넘김 간격. 사용자가 직접 넘기면 이만큼 더 쉰다. */
const AUTO_ADVANCE_MS = 5000;

const HOME_AREAS: HomeAreaId[] = ['nearby', 'seongsu', 'myeongdong', 'hongdae'];
/** 홈(캔버스 '홈 디벨롭 ② 한국어'). 가게 탐색 · 스포트라이트는 하드코딩(2026-11-24 결정). */
export function HomeScreen({
  language,
  userProfile,
  onChangeLanguage,
}: {
  language: Language;
  userProfile: UserProfile | null;
  demoMode?: boolean;
  selectedStore?: StoreCandidate | null;
  onSelectStore?: (store: StoreCandidate | null) => void;
  onChangeLanguage: (language: Language) => void;
}) {
  const navigate = useNavigate();
  const [area, setArea] = useState<HomeAreaId>('nearby');
  const { isSaved, toggleSave } = useFixtureStoreSaves();
  const [slide, setSlide] = useState(0);
  const rail = useRef<HTMLDivElement>(null);
  const stories = CURATION_ARTICLES.slice(0, 4);
  const areaCenter = (id: HomeAreaId) => SEOUL_AREAS.find((item) => item.id === id);
  const areaLabel = (id: HomeAreaId) => {
    if (id === 'nearby') return tx(language, H.nearby);
    const found = areaCenter(id);
    return found ? translateText(language, found.label) : id;
  };

  const openMap = (options: { area?: HomeAreaId; category?: FoodCategoryId } = {}) => {
    const center = options.area && options.area !== 'nearby' ? areaCenter(options.area) : undefined;
    navigate('/map', {
      state: {
        ...(center ? { searchCenter: { latitude: center.latitude, longitude: center.longitude } } : {}),
        ...(options.category ? { category: options.category } : {}),
      },
    });
  };

  // 카드 하나를 레일 시작(왼쪽, 아랍어는 오른쪽) 여백에 맞춘다. 세로로는 움직이지 않는다.
  const scrollToSlide = (index: number, smooth = true) => {
    const el = rail.current;
    const card = el?.children[index] as HTMLElement | undefined;
    if (!el || !card) return;
    const rtl = getComputedStyle(el).direction === 'rtl';
    const railBox = el.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    const padding = parseFloat(getComputedStyle(el).paddingInlineStart) || 0;
    const delta = rtl ? cardBox.right - (railBox.right - padding) : cardBox.left - (railBox.left + padding);
    el.scrollBy({ left: delta, behavior: smooth ? 'smooth' : 'auto' });
  };
  const onRailScroll = () => {
    const el = rail.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = (card?.offsetWidth ?? 310) + 12;
    setSlide(Math.min(stories.length - 1, Math.max(0, Math.round(Math.abs(el.scrollLeft) / step))));
  };
  // 사용자가 직접 넘기거나 누르면 자동 넘김을 잠시 쉰다.
  const lastTouch = useRef(0);
  const touched = () => { lastTouch.current = Date.now(); };
  const goToSlide = (index: number) => { touched(); scrollToSlide(index); };
  const slideRef = useRef(slide);
  slideRef.current = slide;
  useEffect(() => {
    if (stories.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      if (document.hidden || Date.now() - lastTouch.current < AUTO_ADVANCE_MS) return;
      scrollToSlide((slideRef.current + 1) % stories.length);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [stories.length]);

  return (
    <div className="flex h-dvh flex-col bg-hs-surface-0 text-hs-ink-900">
      <OfflineBanner language={language} />
      <main className="min-h-0 flex-1 overflow-y-auto pb-8">
        <header className="relative overflow-hidden rounded-b-[56px] bg-hs-mint-100 px-5 pt-[18px] pb-[60px]">
          <div className="flex items-center justify-between">
            <Logo height={30} />
            <div className="flex gap-2">
              <LanguageButton language={language} setLanguage={onChangeLanguage} short />
              <HsIconButton icon="person" tone="white" label={tx(language, H.myPage)} onClick={() => navigate('/mypage')} />
            </div>
          </div>
          <p className="mt-5 text-[11px] font-black tracking-[0.06em] text-hs-brand-700">{tx(language, H.eyebrow)}</p>
          <h1 className="mt-1.5 text-[28px] leading-[1.22] font-black tracking-[-0.01em] whitespace-pre-line">{tx(language, H.title)}</h1>
        </header>

        {/* 한스푼 저널: 가로로 넘기는 이야기 카드 */}
        <section aria-label={tx(language, H.stories)} className="relative -mt-10">
          <div ref={rail} onScroll={onRailScroll} onPointerDown={touched} onWheel={touched} onKeyDown={touched} onFocus={touched} className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-ps-5 px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {stories.map((article, index) => (
              <button
                key={article.id}
                type="button"
                onClick={() => navigate(`/curation/${article.id}`)}
                className="relative h-[172px] w-[310px] max-w-[calc(100vw-56px)] flex-none snap-start overflow-hidden rounded-[30px] bg-hs-brand-700 p-5 text-start text-hs-surface-0 shadow-[0_12px_28px_rgba(23,107,77,0.22)]"
              >
                {/* 그 글의 대표 사진. 글자는 아래 어두운 그라데이션 위에. */}
                <img src={article.image} alt="" loading={index === 0 ? 'eager' : 'lazy'} className="absolute inset-0 size-full object-cover" style={{ objectPosition: article.imagePosition ?? '50% 50%' }} />
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0B2A1F]/90 via-[#0B2A1F]/45 to-[#0B2A1F]/10" />
                <span className="absolute inset-x-5 bottom-[18px] block">
                  <span className="block text-[11px] font-black tracking-[0.06em] text-[#BFEBD5]">{index === 0 ? tx(language, H.stories) : tagLabel(article.tag, language)}</span>
                  <span className="mt-1.5 line-clamp-2 block text-[19px] leading-[1.28] font-black whitespace-pre-line">{translateText(language, article.title)}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex justify-center gap-0.5">
            {stories.map((article, index) => (
              <button key={article.id} type="button" onClick={() => goToSlide(index)} aria-label={`${tx(language, H.story)} ${index + 1}`} aria-current={slide === index || undefined} className="flex h-6 items-center px-0.5">
                <span className={`h-1.5 rounded-hs-pill transition-all ${slide === index ? 'w-[18px] bg-hs-brand-700' : 'w-1.5 bg-hs-line-200'}`} />
              </button>
            ))}
          </div>
        </section>

        <div className="px-5">
          <DietPromptCard language={language} userProfile={userProfile} />
        </div>

        <section className="px-5 pt-4" aria-labelledby="home-craving">
          <h2 id="home-craving" className="text-[19px] font-black">{tx(language, H.craving)}</h2>
          <div className="mt-3.5 grid grid-cols-4 gap-x-2 gap-y-4">
            {CRAVINGS.map((item) => (
              <button key={item.id} type="button" onClick={() => openMap({ category: item.id })} className="flex flex-col items-center gap-1.5 text-[13px] font-extrabold">
                <span aria-hidden="true" className={`flex h-[62px] w-[70px] max-w-full items-center justify-center rounded-t-[18px] rounded-b-[34px] ${item.tone}`}>
                  <HsIcon name={item.icon} size={28} />
                </span>
                <span className="break-keep text-center leading-tight">{translateText(language, FOOD_CATEGORY_LABELS[item.id])}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="px-5 pt-6">
          <button type="button" onClick={() => openMap()} className="relative block h-[120px] w-full overflow-hidden rounded-[28px] bg-hs-coral-100 px-5 py-[18px] text-start">
            <span aria-hidden="true" className="absolute -end-4 -top-6 size-[120px] rounded-hs-pill bg-[#FFD8C7]" />
            <span aria-hidden="true" className="absolute end-6 bottom-4 text-hs-orange-500"><HsIcon name="bowl" size={52} strokeWidth={1.8} /></span>
            <span className="relative block text-[11px] font-black tracking-[0.06em] text-hs-coral-700">{tx(language, H.spotlightEyebrow)}</span>
            <span className="relative mt-1.5 block max-w-[210px] text-[18px] leading-[1.3] font-black whitespace-pre-line">{tx(language, H.spotlightTitle)}</span>
          </button>
        </section>

        <section className="pt-7" aria-labelledby="home-explore">
          <div className="flex items-center justify-between px-5">
            <h2 id="home-explore" className="text-[19px] font-black">{tx(language, H.explore)}</h2>
            <HsLinkButton tone="brand" onClick={() => openMap({ area })}>{tx(language, H.fullMap)}</HsLinkButton>
          </div>
          <div role="group" aria-label={tx(language, H.areas)} className="mt-2 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {HOME_AREAS.map((id) => (
              <FilterChip key={id} selected={area === id} onClick={() => setArea(id)} className="px-4">{areaLabel(id)}</FilterChip>
            ))}
          </div>
          <div className="mt-3.5 space-y-2 px-5">
            {HOME_STORES[area].map((store) => (
              <StoreCard
                key={store.id}
                language={language}
                name={translateText(language, store.name)}
                reviewCount={store.reviewCount}
                district={translateText(language, store.district)}
                category={translateText(language, FOOD_CATEGORY_LABELS[store.category])}
                distanceMeters={store.distanceMeters}
                saved={isSaved(store.id)}
                onToggleSave={() => toggleSave(store.id)}
                onClick={() => openMap({ area })}
              />
            ))}
          </div>
        </section>
      </main>
      <BottomNav language={language} />
    </div>
  );
}
