import { liveFeatures } from '../featureAvailability';
import { preparingLabel, preparingMessage } from './FeaturePreparing';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ArrowLeft,
  Camera,
  Utensils,
  Search,
  Loader2,
  LocateFixed,
  RotateCw,
  Users,
  X,
} from 'lucide-react';
import type { StoreCandidate } from '../../api/store';
import type { Language, UserProfile } from '../types';
import {
  AREAS,
  AREA_CENTERS,
  RESTAURANTS,
  profileMatches,
  type AreaId,
  type Restaurant,
} from '../demo/restaurants';
import { demoAreaName, demoRestaurantOf, demoStoreId, searchDemoStores } from '../demo/mapDemoStores';
import { useDemoValue } from '../demo/storage';
import { createTranslator, translateText, type LocalizedText } from '../locales';
import {
  getProfileCommunicationItems,
  localizeMenuText,
} from '../results/resultViewModel';
import { menuPrice } from '../demo/currency';
import { StoreMap } from './discovery/StoreMap';
import { BottomSheet } from './discovery/BottomSheet';
import { PartnershipBadge } from './discovery/PartnershipBadge';
import { MapStorePanel, storeDisplayName, type StoreCardExtras } from './discovery/MapStorePanel';
import { FOOD_CATEGORY_ICONS, FOOD_CATEGORY_LABELS, FOOD_CATEGORY_ORDER, foodCategoryOf, type FoodCategoryId } from './discovery/foodCategories';
import { SEOUL_AREAS, areaAt, type SeoulArea } from './discovery/seoulAreas';
import { useStoreCandidates, type StoreCoordinates, type StoreLocationStatus, type StoreSearchOrigin } from '../hooks/useStoreCandidates';
import { getStoreReviews, reportReview, type RestaurantReview } from '../../api/reviews';
import { listDemoStoreReviews, reportDemoReview } from '../demo/reviews';
import { MealReviewSheet } from './reviews/MealReviewSheet';
import { RestaurantReviewList } from './reviews/RestaurantReviewList';

/** 지도 검색 반경·핀 수. 서버 최대값. */
const MAP_SEARCH_RADIUS_METERS = 3000;
const MAP_SEARCH_LIMIT = 100;

/** 전체 화면 지도에서 나가기. 앱 안에서 들어왔으면 이전 화면, 바로 열었으면 홈. */
function useGoBack() {
  const navigate = useNavigate();
  return () => {
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (historyIndex > 0) navigate(-1);
    else navigate('/home');
  };
}

function isAreaId(value: string | null): value is AreaId {
  return AREAS.some((area) => area.id === value);
}

export function RestaurantMapScreen({
  language,
  userProfile,
  demoMode,
  selectedStore,
  onSelectStore,
}: {
  language: Language;
  userProfile: UserProfile | null;
  demoMode: boolean;
  selectedStore: StoreCandidate | null;
  onSelectStore: (store: StoreCandidate | null) => void;
}) {
  if (!demoMode) {
    return <LiveRestaurantMapScreen language={language} userProfile={userProfile} selectedStore={selectedStore} onSelectStore={onSelectStore} />;
  }

  return <DemoRestaurantMapScreen language={language} userProfile={userProfile} />;
}

function DemoRestaurantMapScreen({
  language,
  userProfile,
}: {
  language: Language;
  userProfile: UserProfile | null;
}) {
  const t = createTranslator(language);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedArea = searchParams.get('area');
  const detail = RESTAURANTS.find((restaurant) => restaurant.id === searchParams.get('restaurant')) ?? null;
  // 첫 위치: 식당 지정 시 그 지역 중심(식당 선택), 지역 지정 시 그 지역 중심, 없으면 성수. '내 주변'은 위치 1회 요청.
  const [initial] = useState(() => {
    if (detail) {
      const [latitude, longitude] = AREA_CENTERS[detail.area];
      return { location: { latitude, longitude }, selectedId: demoStoreId(detail) };
    }
    if (isAreaId(requestedArea) && requestedArea !== 'nearby') {
      const [latitude, longitude] = AREA_CENTERS[requestedArea];
      return { location: { latitude, longitude }, selectedId: null };
    }
    const seongsu = SEOUL_AREAS.find((area) => area.id === 'seongsu')!;
    return { location: { latitude: seongsu.latitude, longitude: seongsu.longitude }, selectedId: null };
  });
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState<{ location: StoreCoordinates; origin: StoreSearchOrigin }>({ location: initial.location, origin: 'map-center' });
  const [locationStatus, setLocationStatus] = useState<StoreLocationStatus>('ready');
  const [reviewing, setReviewing] = useState(false);
  const [reviewVersion, setReviewVersion] = useState(0);
  const [, setSelectedRestaurant] = useDemoValue<string | null>('selected-restaurant', null);
  const profileItems = getProfileCommunicationItems(userProfile);

  const searchAtCurrentLocation = () => {
    if (!navigator.geolocation) { setLocationStatus('unsupported'); return; }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSearch({ location: { latitude: position.coords.latitude, longitude: position.coords.longitude }, origin: 'current-location' });
        setLocationStatus('ready');
      },
      // 실패해도 보던 지역 유지.
      () => setLocationStatus('denied'),
      { timeout: 8000, maximumAge: 300000 },
    );
  };
  useEffect(() => {
    if (!detail && requestedArea === 'nearby') searchAtCurrentLocation();
  }, []);

  const candidates = useMemo(
    () => searchDemoStores(language, { query, location: search.location }),
    [language, query, search, reviewVersion],
  );
  const restaurantOf = (store: StoreCandidate) => demoRestaurantOf(store);
  const scanRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant.id);
    navigate(restaurant.partnership === 'recipe-verified' ? `/restaurants/${restaurant.id}/menu` : '/scan');
  };
  const closeDetail = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('restaurant');
    setSearchParams(next, { replace: true });
  };

  return (
    <>
      <StoreMapView
        language={language}
        query={query}
        onQueryChange={setQuery}
        demoMode
        discovery={{
          candidates,
          error: false,
          isLoading: false,
          locationStatus,
          retryLocation: searchAtCurrentLocation,
          retrySearch: () => setReviewVersion((value) => value + 1),
          searchAt: (location) => setSearch({ location, origin: 'map-center' }),
          searchAtCurrentLocation,
          searchLocation: search.location,
          searchOrigin: search.origin,
        }}
        initialSelectedId={initial.selectedId}
        extras={(store) => {
          const restaurant = restaurantOf(store);
          if (!restaurant) return undefined;
          return {
            photos: [restaurant.image],
            area: demoAreaName(restaurant, language) ?? undefined,
            badge: <PartnershipBadge restaurant={restaurant} language={language} compact />,
            primaryAction: restaurant.partnership === 'recipe-verified' ? 'menu' : 'scan',
          };
        }}
        onOpenDetail={(store) => {
          const restaurant = restaurantOf(store);
          if (!restaurant) return;
          const next = new URLSearchParams(searchParams);
          next.set('restaurant', restaurant.id);
          setSearchParams(next, { replace: true });
        }}
        onScan={(store) => {
          const restaurant = restaurantOf(store);
          if (restaurant) scanRestaurant(restaurant);
        }}
      />

      {detail && (
        <BottomSheet
          language={language}
          onClose={closeDetail}
          title={localizeMenuText(detail.name, language)}
          description={`${demoAreaName(detail, language) ?? ''} · ${localizeMenuText(detail.category, language)} · ${t('1인 예상', 'Est. per person', 'تقدير للفرد')} ${menuPrice(String(detail.price), language)?.original}`}
        >
          <div className="relative mb-4 overflow-hidden rounded-[24px]">
            <img
              src={detail.image}
              alt=""
              className="h-48 w-full object-cover"
            />
            <div className="absolute start-3 top-3">
              <PartnershipBadge restaurant={detail} language={language} />
            </div>
          </div>
          {detail.partnership === 'recipe-verified' && (
            <div className="mb-5 rounded-2xl bg-brand-primary-soft p-3.5">
              <p className="text-sm font-extrabold text-brand-primary">
                {t(
                  '한스푼 파트너가 모든 레시피를 제공했어요.',
                  'This partner supplied every recipe to Han Spoon.',
                  'قدم هذا الشريك جميع الوصفات إلى Han Spoon.',
                )}
              </p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">
                {t(
                  '레시피 인증은 정보 확인 범위를 뜻하며, 개인별 섭취 안전을 보장하지 않아요.',
                  'Recipe verification describes information coverage, not a guarantee of individual dietary safety.',
                  'توثيق الوصفات يصف نطاق المعلومات ولا يضمن السلامة الغذائية الفردية.',
                )}
              </p>
            </div>
          )}
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => scanRestaurant(detail)}
              className="flex min-h-13 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-primary px-4 text-sm font-bold text-white"
            >
              {detail.partnership === 'recipe-verified' ? <Utensils className="size-4" /> : <Camera className="size-4" />}
              {detail.partnership === 'recipe-verified' ? t('내 프로필로 메뉴 보기', 'View menus for my profile', 'القائمة حسب ملفي') : t(
                '이 식당 메뉴 스캔',
                'Scan this restaurant’s menu',
                'امسح قائمة هذا المطعم',
              )}
            </button>
          </div>

          <h3 className="flex items-center gap-2 font-extrabold">
            <Users className="size-4 text-brand-primary" />
            {t(
              '나와 같은 프로필의 경험',
              'Experiences from people like you',
              'تجارب أشخاص باحتياجات مماثلة',
            )}
          </h3>
          <p className="mb-3 mt-1 text-xs leading-5 text-text-secondary">
            {t(
              '선택한 조건이 하나 이상 같은 방문자의 선택형 후기예요.',
              'Feedback from diners sharing at least one of your preferences.',
              'آراء زوار يشاركونك تفضيلاً غذائياً واحداً على الأقل.',
            )}
          </p>
          {profileMatches(detail, userProfile).map((feedback) => {
            const profileItem = profileItems.find(
              (item) => item.id === feedback.profileId,
            );
            return (
              <div
                key={feedback.profileId}
                className="mb-2 rounded-2xl bg-brand-primary-soft p-3.5"
              >
                <p className="text-xs font-extrabold text-brand-primary">
                  {profileItem
                    ? localizeMenuText(profileItem.label, language)
                    : feedback.profileId}
                </p>
                <p className="mt-1 text-sm leading-6">
                  {t(
                    `${feedback.total}명 중 ${feedback.positive}명이 요청을 전달하기 편했어요`,
                    `${feedback.positive} of ${feedback.total} diners found it easy to discuss their needs`,
                    `${feedback.positive} من ${feedback.total} زائراً وجدوا التواصل سهلاً`,
                  )}
                </p>
              </div>
            );
          })}
          {profileMatches(detail, userProfile).length === 0 && (
            <p className="rounded-2xl bg-surface-subtle p-4 text-sm leading-6">
              {userProfile
                ? t(
                    '아직 같은 프로필의 후기가 없어요.',
                    'No matching dietary feedback yet.',
                    'لا توجد آراء مطابقة لملفك بعد.',
                  )
                : t(
                    '식단 프로필을 설정하면 나와 비슷한 사람들의 경험을 볼 수 있어요.',
                    'Set your profile to see experiences from similar diners.',
                    'حدد ملفك لرؤية تجارب زوار مشابهين.',
                  )}
            </p>
          )}
          <div className="mt-5 border-t border-border-warm pt-4"><button type="button" onClick={() => setReviewing(true)} className="mb-5 min-h-11 w-full rounded-[18px] border border-brand-primary text-sm font-extrabold text-brand-primary">{t('후기 작성', 'Write a review', 'اكتب مراجعة')}</button><RestaurantReviewList key={detail.id} language={language} profile={userProfile} reviews={listDemoStoreReviews(detail.id)} onReport={async (review, reason) => { reportDemoReview(review.id, reason); setReviewVersion(reviewVersion + 1); }} /></div>
        </BottomSheet>
      )}
      {reviewing && detail && <MealReviewSheet language={language} profile={userProfile} store={{ id: detail.id, name: localizeMenuText(detail.name, language) }} demoMode onClose={() => setReviewing(false)} onSaved={() => setReviewVersion(value => value + 1)} />}
    </>
  );
}


function LiveRestaurantMapScreen({
  language,
  userProfile,
  selectedStore,
  onSelectStore,
}: {
  language: Language;
  userProfile: UserProfile | null;
  selectedStore: StoreCandidate | null;
  onSelectStore: (store: StoreCandidate | null) => void;
}) {
  const t = createTranslator(language);
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const initialSearchCenter = (
    routeLocation.state as {
      searchCenter?: { latitude: number; longitude: number };
    } | null
  )?.searchCenter;
  const incoming = routeLocation.state as { initialQuery?: string; selectedStoreId?: number; selectedStore?: StoreCandidate } | null;
  const [query, setQuery] = useState(incoming?.initialQuery ?? '');
  const [detailStore, setDetailStore] = useState<StoreCandidate | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState<RestaurantReview[]>([]);
  const [reviewsError, setReviewsError] = useState('');
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewRefresh, setReviewRefresh] = useState(0);
  const discovery = useStoreCandidates(query, {
    initialSearchLocation: initialSearchCenter,
    locateUser: !initialSearchCenter,
    radiusMeters: MAP_SEARCH_RADIUS_METERS,
    limit: MAP_SEARCH_LIMIT,
  });
  useEffect(() => {
    if (!detailStore || !showReviews || !liveFeatures.reviews) return;
    let active = true;
    setReviews([]);
    setReviewsError('');
    setReviewsLoading(true);
    getStoreReviews(detailStore.storeId).then(items => { if (active) setReviews(items); })
      .catch(() => { if (active) setReviewsError(t('후기를 불러오지 못했어요.', 'Could not load reviews.', 'تعذر تحميل المراجعات.')); })
      .finally(() => { if (active) setReviewsLoading(false); });
    return () => { active = false; };
  }, [detailStore?.storeId, showReviews, reviewRefresh]);

  const selectAndScan = (store: StoreCandidate) => {
    onSelectStore(store);
    navigate('/scan');
  };
  const openDetail = (store: StoreCandidate) => {
    setDetailStore(store);
    setReviewing(false);
    setShowReviews(true);
  };

  return (
    <>
      <StoreMapView
        language={language}
        query={query}
        onQueryChange={setQuery}
        discovery={{ ...discovery, candidates: incoming?.selectedStore && !query.trim() && discovery.searchLocation?.latitude === initialSearchCenter?.latitude && discovery.searchLocation?.longitude === initialSearchCenter?.longitude ? [incoming.selectedStore, ...discovery.candidates.filter(item => item.storeId !== incoming.selectedStore?.storeId)] : discovery.candidates }}
        initialSelectedId={incoming?.selectedStoreId ?? selectedStore?.storeId ?? null}
        onOpenDetail={openDetail}
        onScan={selectAndScan}
      />
      {detailStore && showReviews && <BottomSheet language={language} title={storeDisplayName(detailStore)} description={detailStore.roadAddress ?? detailStore.categoryName ?? ''} onClose={() => setShowReviews(false)}><button type="button" onClick={() => selectAndScan(detailStore)} className="mb-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-brand-primary text-sm font-extrabold text-white"><Camera className="size-4" />{t('이 식당 메뉴 스캔', 'Scan this restaurant’s menu', 'امسح قائمة هذا المطعم')}</button><div className="border-t border-border-warm pt-5"><>{!liveFeatures.reviews ? <p role="status" className="rounded-xl bg-surface-subtle p-4 text-sm">{preparingMessage(language)}</p> : <RestaurantReviewList key={detailStore.storeId} language={language} profile={userProfile} reviews={reviews} reviewCount={detailStore.reviewCount} loading={reviewsLoading} error={reviewsError} onRetry={() => setReviewRefresh(value => value + 1)} onReport={async (review, reason) => { await reportReview(review.id, reason); }} />}</></div><button type="button" disabled={!liveFeatures.reviews} onClick={() => { setShowReviews(false); setReviewing(true); }} className="mt-5 min-h-11 w-full rounded-[18px] border border-brand-primary text-sm font-bold text-brand-primary">{t('후기 작성', 'Write a review', 'اكتب مراجعة')}{!liveFeatures.reviews && ` · ${preparingLabel(language)}`}</button></BottomSheet>}
      {detailStore && reviewing && <MealReviewSheet language={language} profile={userProfile} store={{ id: detailStore.storeId, name: storeDisplayName(detailStore) }} demoMode={false} onClose={() => setReviewing(false)} onSaved={() => { setShowReviews(true); setReviewRefresh(value => value + 1); discovery.retrySearch(); }} />}
    </>
  );
}

type StoreSort = 'default' | 'distance' | 'reviews';

const SORT_LABELS: Record<StoreSort, LocalizedText> = {
  // 서버 순서(검증 가게 먼저). 개인화·안전 순위 아님.
  default: { ko: '기본순', en: 'Default', ar: 'الترتيب الافتراضي', 'zh-CN': '默认排序', ja: '標準', 'zh-TW': '預設排序', es: 'Predeterminado' },
  distance: { ko: '거리순', en: 'Nearest', ar: 'الأقرب', 'zh-CN': '距离最近', ja: '近い順', 'zh-TW': '距離最近', es: 'Más cerca' },
  reviews: { ko: '리뷰 많은순', en: 'Most reviewed', ar: 'الأكثر مراجعة', 'zh-CN': '评价最多', ja: '口コミが多い順', 'zh-TW': '評價最多', es: 'Más reseñas' },
};

/** 정렬 드롭다운. 접힌 목록에서는 위로, 펼친 목록에서는 아래로. */
function SortMenu({ language, value, distanceSortable, openUpward, onChange }: {
  language: Language;
  value: StoreSort;
  distanceSortable: boolean;
  openUpward: boolean;
  onChange: (sort: StoreSort) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const options: StoreSort[] = distanceSortable ? ['default', 'distance', 'reviews'] : ['default', 'reviews'];

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const close = () => { setOpen(false); buttonRef.current?.focus(); };
  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); items[(index + 1) % items.length]?.focus(); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); items[(index - 1 + items.length) % items.length]?.focus(); }
    else if (event.key === 'Tab') setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-full border border-border-warm bg-rice-white ps-3.5 pe-2.5 text-xs font-bold text-text-primary"
      >
        {translateText(language, SORT_LABELS[value])}
        <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          onKeyDown={onMenuKeyDown}
          className={`absolute start-0 z-50 min-w-40 rounded-2xl border border-border-warm bg-rice-white p-1 shadow-[var(--shadow-float)] ${openUpward ? 'bottom-full mb-2' : 'top-full mt-2'}`}
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={option === value}
              onClick={() => { onChange(option); close(); }}
              className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-start text-sm font-semibold hover:bg-surface-subtle focus:bg-surface-subtle focus:outline-none"
            >
              {translateText(language, SORT_LABELS[option])}
              {option === value && <Check className="size-4 text-brand-primary" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-xs font-bold ${
        pressed ? 'border-soy-ink bg-soy-ink text-white' : 'border-border-warm bg-rice-white text-text-secondary'
      }`}
    >
      {children}
    </button>
  );
}

type StoreDiscovery = Pick<
  ReturnType<typeof useStoreCandidates>,
  'candidates' | 'error' | 'isLoading' | 'locationStatus' | 'retryLocation' | 'retrySearch' | 'searchAt' | 'searchAtCurrentLocation' | 'searchLocation' | 'searchOrigin'
>;

/** 전체 화면 지도(탭 바 없음): 지도·검색·가게 목록/카드. 데이터는 호출부 제공(후보 API·시연·fixture). */
export function StoreMapView({
  language,
  query,
  onQueryChange,
  discovery,
  initialSelectedId = null,
  extras,
  demoMode = false,
  onOpenDetail,
  onScan,
}: {
  language: Language;
  query: string;
  onQueryChange: (query: string) => void;
  discovery: StoreDiscovery;
  /** 시연 모드: 네이버 지도 대신 위치 개요(끌기·이 지역에서 검색 없음) */
  demoMode?: boolean;
  initialSelectedId?: number | null;
  extras?: (store: StoreCandidate) => StoreCardExtras | undefined;
  onOpenDetail: (store: StoreCandidate) => void;
  onScan: (store: StoreCandidate) => void;
}) {
  const t = createTranslator(language);
  const navigate = useNavigate();
  const routeState = useLocation().state as { category?: FoodCategoryId } | null;
  const {
    candidates,
    error,
    isLoading,
    locationStatus,
    retryLocation,
    retrySearch,
    searchAt,
    searchAtCurrentLocation,
    searchLocation,
    searchOrigin,
  } = discovery;
  const [selectedId, setSelectedId] = useState<number | null>(initialSelectedId);
  // 지도 중심: 끌면 따라감(재조회 없음), 가게 선택 시 그 가게, 새 검색 시 검색 위치.
  const [viewCenter, setViewCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  // 지도를 옮긴 뒤에만 [이 지역에서 검색] 표시.
  const [movedByUser, setMovedByUser] = useState(false);
  useEffect(() => {
    if (searchLocation) setViewCenter(searchLocation);
    setMovedByUser(false);
  }, [searchLocation]);
  const previousQuery = useRef(query);
  useEffect(() => {
    if (previousQuery.current !== query) setSelectedId(null);
    previousQuery.current = query;
  }, [query]);
  // 정렬(기본: 서버 순서)·음식 종류. 음식 종류는 핀·카드에도 적용.
  const [sort, setSort] = useState<StoreSort>('default');
  // 홈 '오늘은 뭐가 당기세요?'에서 고른 음식 종류로 시작
  const [category, setCategory] = useState<FoodCategoryId | 'all'>(() => (routeState?.category ?? 'all'));
  const categories = useMemo(() => {
    const present = new Set(candidates.map((store) => foodCategoryOf(store)));
    return FOOD_CATEGORY_ORDER.filter((id) => present.has(id));
  }, [candidates]);
  useEffect(() => {
    if (category !== 'all' && candidates.length > 0 && !categories.includes(category)) setCategory('all');
  }, [categories, category, candidates.length]);
  const distanceSortable = !query.trim();
  const activeSort: StoreSort = sort === 'distance' && !distanceSortable ? 'default' : sort;
  const visible = useMemo(() => {
    const filtered = category === 'all' ? candidates : candidates.filter((store) => foodCategoryOf(store) === category);
    if (activeSort === 'default') return filtered;
    const far = Number.MAX_SAFE_INTEGER;
    return [...filtered].sort((a, b) => activeSort === 'distance'
      ? (a.distanceMeters ?? far) - (b.distanceMeters ?? far)
      : (b.reviewCount ?? 0) - (a.reviewCount ?? 0) || (a.distanceMeters ?? far) - (b.distanceMeters ?? far));
  }, [activeSort, candidates, category]);
  const selected = visible.find((store) => store.storeId === selectedId) ?? null;
  // 고른 가게를 지도 가운데로(카드에 가리지 않게, 마커 탭·카드 넘기기 공통).
  const selectStore = (storeId: number | null) => {
    setSelectedId(storeId);
    const store = candidates.find((item) => item.storeId === storeId);
    if (store) setViewCenter({ latitude: store.latitude, longitude: store.longitude });
  };
  const searchHere = () => {
    if (!viewCenter) return;
    setSelectedId(null);
    searchAt(viewCenter);
  };
  const searchNearMe = () => {
    setMovedByUser(false);
    // 이미 현재 위치 결과면 재조회 없이 지도만 복귀.
    if (searchOrigin === 'current-location' && searchLocation && locationStatus === 'ready') setViewCenter({ ...searchLocation });
    else searchAtCurrentLocation();
  };
  // 지역 태그: 이름 검색 중이면 검색어 지우고 그 지역 중심에서 재조회.
  const currentArea = searchOrigin === 'current-location' ? null : areaAt(searchLocation);
  const searchArea = (area: SeoulArea) => {
    if (query) onQueryChange('');
    setSelectedId(null);
    searchAt({ latitude: area.latitude, longitude: area.longitude });
  };
  const mapCenter = viewCenter ?? searchLocation ?? (candidates[0] ? { latitude: candidates[0].latitude, longitude: candidates[0].longitude } : null);
  const mapStores = visible.map((store) => ({
    id: String(store.storeId),
    name: storeDisplayName(store),
    lat: store.latitude,
    lng: store.longitude,
  }));
  const goBack = useGoBack();

  const fallback = error ? (
    <div role="alert" className="px-1 py-6 text-center">
      <AlertCircle className="mx-auto mb-3 size-8 text-text-tertiary" aria-hidden="true" />
      <p className="text-base font-extrabold">{t('식당 목록을 불러오지 못했어요.', 'Could not load restaurants.', 'تعذر تحميل المطاعم.')}</p>
      <p className="mt-2 text-sm text-text-secondary">{t('연결 상태를 확인하고 다시 시도해 주세요.', 'Check your connection and try again.', 'تحقق من الاتصال وحاول مرة أخرى.')}</p>
      <button type="button" onClick={retrySearch} className="mt-4 min-h-11 rounded-[18px] border border-brand-primary px-4 text-sm font-bold text-brand-primary">{t('다시 시도', 'Try again', 'حاول مرة أخرى')}</button>
    </div>
  ) : candidates.length === 0 && isLoading ? (
    <div role="status" className="flex justify-center py-6">
      <Loader2 className="size-6 animate-spin text-brand-primary" aria-hidden="true" />
      <span className="sr-only">{translateText(language, { ko: '불러오는 중', en: 'Loading', ar: 'جارٍ التحميل', 'zh-CN': '加载中', ja: '読み込み中', 'zh-TW': '載入中', es: 'Cargando' })}</span>
    </div>
  ) : candidates.length === 0 ? (
    <div className="px-1 py-6 text-center">
      <p className="font-bold">{query.trim() ? t('검색된 식당이 없어요.', 'No restaurant matched.', 'لم يتم العثور على مطعم.') : t('주변에 등록된 식당이 아직 없어요.', 'No registered restaurants nearby yet.', 'لا توجد مطاعم مسجلة بالقرب منك بعد.')}</p>
      <button type="button" onClick={() => navigate('/scan')} className="mt-3 min-h-10 text-sm font-bold text-brand-primary">{t('식당 없이 스캔하기', 'Scan without a restaurant', 'المسح بدون مطعم')}</button>
    </div>
  ) : undefined;

  return (
    <div className="relative h-dvh overflow-hidden bg-[#e9eee5] text-soy-ink">
      {/* isolate: 네이버 지도 내부 요소(로고 등)가 목록 시트 위로 오지 않게 */}
      <div className="absolute inset-0 isolate">
        {mapCenter ? (
          <StoreMap
            language={language}
            stores={mapStores}
            center={{ lat: mapCenter.latitude, lng: mapCenter.longitude }}
            selectedId={selected ? String(selected.storeId) : null}
            onSelect={(mapStore) => selectStore(Number(mapStore.id))}
            onCenterChange={(center) => { setViewCenter({ latitude: center.lat, longitude: center.lng }); setMovedByUser(true); }}
            fitStores={false}
            demoMode={demoMode}
            // 가리는 높이: 위 검색창·지역 태그, 아래 카드·버튼 줄
            demoInsets={{ top: 112, bottom: 400 }}
            className="h-full w-full bg-[#e9eee5]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-surface-subtle px-8 text-center">
            {locationStatus === 'loading' ? (
              <div role="status" className="text-sm text-text-secondary">
                <Loader2 className="mx-auto mb-3 size-7 animate-spin text-brand-primary" />
                {t('현재 위치를 확인하고 있어요.', 'Finding your current location…', 'جارٍ تحديد موقعك الحالي…')}
              </div>
            ) : (
              <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                <AlertCircle className="mx-auto mb-2 size-6" />
                <p className="font-bold">{t('주변 식당을 찾으려면 위치 권한이 필요해요.', 'Location access is needed to find nearby restaurants.', 'يلزم إذن الموقع للعثور على المطاعم القريبة.')}</p>
                {locationStatus === 'denied' && <button type="button" onClick={retryLocation} className="mt-3 min-h-10 rounded-xl border border-amber-300 bg-white px-4 font-bold">{t('위치 다시 확인', 'Try location again', 'إعادة محاولة تحديد الموقع')}</button>}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-36 bg-gradient-to-b from-rice-cream/90 to-transparent" />

      <header className="absolute inset-x-0 top-0 z-30 flex h-16 items-center gap-3 px-4 pt-[env(safe-area-inset-top)]">
        <button
          type="button"
          onClick={goBack}
          aria-label={translateText(language, { ko: '뒤로', en: 'Back', ar: 'رجوع', 'zh-CN': '返回', ja: '戻る', 'zh-TW': '返回', es: 'Volver' })}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border-warm bg-rice-white/95 shadow-sm backdrop-blur"
        >
          <ArrowLeft className="size-5 rtl:rotate-180" />
        </button>
        <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-border-warm bg-rice-white/95 px-4 shadow-sm backdrop-blur">
          <Search className="size-4 shrink-0 text-text-secondary" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t('식당 이름 검색', 'Search by restaurant name', 'ابحث باسم المطعم')}
            aria-label={t('식당 검색', 'Search restaurants', 'ابحث عن مطعم')}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-text-tertiary"
          />
          {query && <button type="button" onClick={() => onQueryChange('')} aria-label={t('검색 지우기', 'Clear search', 'مسح البحث')} className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-subtle"><X className="size-4" /></button>}
        </label>
      </header>

      <nav
        aria-label={translateText(language, { ko: '지역으로 이동', en: 'Go to area', ar: 'انتقل إلى منطقة', 'zh-CN': '前往区域', ja: 'エリアへ移動', 'zh-TW': '前往區域', es: 'Ir a la zona' })}
        className="absolute inset-x-0 top-16 z-30 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]"
      >
        {SEOUL_AREAS.map((area) => (
          <button
            key={area.id}
            type="button"
            aria-pressed={currentArea?.id === area.id}
            onClick={() => searchArea(area)}
            className={`inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-xs font-bold shadow-sm ${
              currentArea?.id === area.id
                ? 'border-brand-primary bg-brand-primary text-white'
                : 'border-border-warm bg-rice-white/95 text-text-secondary backdrop-blur'
            }`}
          >
            {translateText(language, area.label)}
          </button>
        ))}
      </nav>

      {(searchLocation || query.trim()) && (
        <MapStorePanel
          language={language}
          stores={visible}
          selectedId={selected ? selected.storeId : null}
          onSelect={selectStore}
          origin={query.trim() ? null : searchOrigin}
          fallback={fallback}
          expandSignal={query.trim() || undefined}
          extras={extras}
          toolbar={candidates.length > 0 ? ({ expanded }) => (
            <div className="flex items-center gap-2 ps-4">
              <SortMenu
                language={language}
                value={activeSort}
                distanceSortable={distanceSortable}
                openUpward={!expanded}
                onChange={setSort}
              />
              <span aria-hidden="true" className="h-5 w-px shrink-0 bg-border-warm" />
              <div
                role="group"
                aria-label={translateText(language, { ko: '음식 종류', en: 'Cuisine', ar: 'نوع الطعام', 'zh-CN': '菜系', ja: '料理の種類', 'zh-TW': '菜系', es: 'Tipo de cocina' })}
                className="flex min-w-0 flex-1 gap-2 overflow-x-auto pe-4 [scrollbar-width:none]"
              >
                <FilterChip pressed={category === 'all'} onClick={() => { setCategory('all'); setSelectedId(null); }}>
                  {translateText(language, { ko: '전체', en: 'All', ar: 'الكل', 'zh-CN': '全部', ja: 'すべて', 'zh-TW': '全部', es: 'Todos' })}
                </FilterChip>
                {categories.map((id) => (
                  <FilterChip key={id} pressed={category === id} onClick={() => { setCategory(category === id ? 'all' : id); setSelectedId(null); }}>
                    <span aria-hidden="true" className="me-1">{FOOD_CATEGORY_ICONS[id]}</span>
                    {translateText(language, FOOD_CATEGORY_LABELS[id])}
                  </FilterChip>
                ))}
              </div>
              {isLoading && <Loader2 className="me-4 size-4 shrink-0 animate-spin text-brand-primary" aria-label={translateText(language, { ko: '불러오는 중', en: 'Loading', ar: 'جارٍ التحميل', 'zh-CN': '加载中', ja: '読み込み中', 'zh-TW': '載入中', es: 'Cargando' })} />}
            </div>
          ) : undefined}
          mapControls={{
            center: movedByUser && !query.trim() ? (
              <button type="button" onClick={searchHere} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-soy-ink px-4 text-xs font-bold text-white shadow-md">
                <RotateCw className="size-3.5" aria-hidden="true" />
                {translateText(language, { ko: '이 지역에서 검색', en: 'Search this area', ar: 'ابحث في هذه المنطقة', 'zh-CN': '搜索此区域', ja: 'このエリアで検索', 'zh-TW': '搜尋此區域', es: 'Buscar en esta zona' })}
              </button>
            ) : undefined,
            end: (
              <button type="button" onClick={searchNearMe} disabled={locationStatus === 'loading'} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border-warm bg-rice-white px-3.5 text-xs font-bold text-text-primary shadow-md disabled:opacity-70">
                {locationStatus === 'loading' ? <Loader2 className="size-4 animate-spin text-brand-primary" aria-hidden="true" /> : <LocateFixed className="size-4 text-brand-primary" aria-hidden="true" />}
                {locationStatus === 'denied'
                  ? t('위치 다시 확인', 'Try location again', 'إعادة محاولة تحديد الموقع')
                  : translateText(language, { ko: '내 주변', en: 'Near me', ar: 'بالقرب مني', 'zh-CN': '我的周边', ja: '現在地周辺', 'zh-TW': '我的周邊', es: 'Cerca de mí' })}
              </button>
            ),
          }}
          onOpenDetail={onOpenDetail}
          onScan={onScan}
        />
      )}
    </div>
  );
}
