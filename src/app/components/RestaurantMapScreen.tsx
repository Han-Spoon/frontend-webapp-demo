import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { StoreCandidate } from '../../api/store';
import type { Language } from '../types';
import { AREAS, RESTAURANTS, type AreaId } from '../demo/restaurants';
import { demoAreaName, demoRestaurantOf, demoStoreId, searchDemoStores } from '../demo/mapDemoStores';
import { useDemoValue } from '../demo/storage';
import { useStoreCandidates, type StoreCoordinates, type StoreLocationStatus, type StoreSearchOrigin } from '../hooks/useStoreCandidates';
import { StoreMap } from './discovery/StoreMap';
import { FOOD_CATEGORY_LABELS, FOOD_CATEGORY_ORDER, foodCategoryOf, type FoodCategoryId } from './discovery/foodCategories';
import { BottomNav, EmptyState, ErrorState, OfflineBanner, HsButton, HsIcon, HsIconButton, PillTabs, SearchField, SkeletonCard, StoreCard, tx, useToast, type AllText } from './hs';
import { BowlTile } from './hs/RiskBadge';
import { translateText } from '../locales';
import { ChipMenu } from './map/ChipMenu';
import { MapAreaSheet } from './map/MapAreaSheet';
import { DEFAULT_MAP_AREA, MAP_AREAS, mapAreaAt } from './map/mapAreas';
import { useStoreDetail } from '../hooks/useStoreDetail';
import { ContainPhoto } from './store/StoreMenuRow';
import { storeMetaLine } from './store/storeFormat';
import { STORE_TEXT } from './store/storeText';
import { MenuTags } from './hs/MenuTag';
import type { StoreDetailRouteState } from './store/StoreDetailScreen';
import { storeCategoryText, storeDisplayName, storeDistrict, useSavedStores } from './map/savedStores';

/** 지도 검색 반경 · 핀 수. 서버 최대값. */
const MAP_SEARCH_RADIUS_METERS = 3000;
const MAP_SEARCH_LIMIT = 100;
/** 지도 위에 겹치는 높이(px): 위 검색 · 칩 줄, 아래 가게 목록 시트 */
const TOP_OVERLAY = 128;
const LIST_SHEET_HEIGHT = 280;
/** 가게를 고르면 상세 시트에 가리지 않게 핀을 이만큼 위로 */
const DETAIL_FOCUS_OFFSET = 150;

const T = {
  search: { ko: '식당 이름 검색', en: 'Search restaurant names', ar: 'ابحث باسم المطعم', 'zh-CN': '搜索餐厅名称', ja: '店名で検索', 'zh-TW': '搜尋餐廳名稱', es: 'Buscar por nombre' },
  showList: { ko: '목록 보기', en: 'Show list', ar: 'عرض القائمة', 'zh-CN': '查看列表', ja: 'リストを見る', 'zh-TW': '查看列表', es: 'Ver lista' },
  showMap: { ko: '지도 보기', en: 'Show map', ar: 'عرض الخريطة', 'zh-CN': '查看地图', ja: '地図を見る', 'zh-TW': '查看地圖', es: 'Ver mapa' },
  area: { ko: '지역', en: 'Area', ar: 'المنطقة', 'zh-CN': '区域', ja: 'エリア', 'zh-TW': '區域', es: 'Zona' },
  nearMe: { ko: '내 주변', en: 'Near me', ar: 'بالقرب مني', 'zh-CN': '我的周边', ja: '現在地周辺', 'zh-TW': '我的周邊', es: 'Cerca de mí' },
  chooseArea: { ko: '지역 고르기', en: 'Choose an area', ar: 'اختر منطقة', 'zh-CN': '选择区域', ja: 'エリアを選ぶ', 'zh-TW': '選擇區域', es: 'Elegir zona' },
  all: { ko: '전체', en: 'All', ar: 'الكل', 'zh-CN': '全部', ja: 'すべて', 'zh-TW': '全部', es: 'Todo' },
  cuisine: { ko: '음식 종류', en: 'Cuisine', ar: 'نوع الطعام', 'zh-CN': '菜系', ja: '料理の種類', 'zh-TW': '菜系', es: 'Tipo de cocina' },
  searchHere: { ko: '이 지역에서 검색', en: 'Search this area', ar: 'ابحث في هذه المنطقة', 'zh-CN': '搜索此区域', ja: 'このエリアで検索', 'zh-TW': '搜尋此區域', es: 'Buscar en esta zona' },
  locate: { ko: '내 위치로 이동', en: 'Go to my location', ar: 'انتقل إلى موقعي', 'zh-CN': '前往我的位置', ja: '現在地へ移動', 'zh-TW': '前往我的位置', es: 'Ir a mi ubicación' },
  nearby: { ko: '주변 가게', en: 'Nearby', ar: 'مطاعم قريبة', 'zh-CN': '附近店铺', ja: '近くのお店', 'zh-TW': '附近店家', es: 'Cerca' },
  saved: { ko: '저장한 가게', en: 'Saved', ar: 'المحفوظة', 'zh-CN': '收藏的店铺', ja: '保存したお店', 'zh-TW': '收藏的店家', es: 'Guardados' },
  results: { ko: '검색 결과', en: 'Results', ar: 'النتائج', 'zh-CN': '搜索结果', ja: '検索結果', 'zh-TW': '搜尋結果', es: 'Resultados' },
  listTabs: { ko: '가게 목록', en: 'Restaurant lists', ar: 'قوائم المطاعم', 'zh-CN': '店铺列表', ja: 'お店のリスト', 'zh-TW': '店家列表', es: 'Listas de restaurantes' },
  sort: { ko: '정렬', en: 'Sort', ar: 'الترتيب', 'zh-CN': '排序', ja: '並び替え', 'zh-TW': '排序', es: 'Ordenar' },
  deviceNote: { ko: '이 기기에만 저장돼요. 저장 당시 정보이며 다른 기기와 동기화되지 않아요.', en: 'Saved on this device only. Details are from when you saved them and do not sync to other devices.', ar: 'محفوظة على هذا الجهاز فقط. المعلومات من وقت الحفظ ولا تتزامن مع الأجهزة الأخرى.', 'zh-CN': '仅保存在此设备上，为保存时的信息，不会与其他设备同步。', ja: 'この端末にのみ保存されます。保存した時点の情報で、他の端末とは同期されません。', 'zh-TW': '僅儲存在此裝置上，為儲存時的資訊，不會與其他裝置同步。', es: 'Se guarda solo en este dispositivo, con los datos del momento en que lo guardaste. No se sincroniza con otros dispositivos.' },
  noSaved: { ko: '저장한 가게가 없어요', en: 'No saved restaurants yet', ar: 'لا توجد مطاعم محفوظة بعد', 'zh-CN': '还没有收藏的店铺', ja: '保存したお店はまだありません', 'zh-TW': '還沒有收藏的店家', es: 'Aún no hay restaurantes guardados' },
  noSavedBody: { ko: '가게 카드의 책갈피를 누르면 여기에 모여요.', en: 'Tap the bookmark on a restaurant card to keep it here.', ar: 'اضغط على علامة الحفظ في بطاقة المطعم ليظهر هنا.', 'zh-CN': '点击店铺卡片上的书签，即可收藏到这里。', ja: 'お店カードのしおりを押すとここに集まります。', 'zh-TW': '點擊店家卡片上的書籤，即可收藏到這裡。', es: 'Toca el marcador de una tarjeta para guardarlo aquí.' },
  noResult: { ko: '검색된 식당이 없어요', en: 'No restaurants found', ar: 'لم يتم العثور على مطاعم', 'zh-CN': '没有找到餐厅', ja: 'お店が見つかりません', 'zh-TW': '沒有找到餐廳', es: 'No se encontraron restaurantes' },
  noNearby: { ko: '주변에 등록된 식당이 아직 없어요', en: 'No registered restaurants nearby yet', ar: 'لا توجد مطاعم مسجلة بالقرب بعد', 'zh-CN': '附近还没有登记的餐厅', ja: '近くに登録されたお店はまだありません', 'zh-TW': '附近還沒有登記的餐廳', es: 'Aún no hay restaurantes registrados cerca' },
  noResultBody: { ko: '다른 이름으로 찾거나\n다른 지역을 둘러보세요.', en: 'Try another name\nor look around another area.', ar: 'جرّب اسمًا آخر\nأو تصفح منطقة أخرى.', 'zh-CN': '换个名称搜索，\n或看看其他地区。', ja: '別の名前で探すか、\n別のエリアを見てみましょう。', 'zh-TW': '換個名稱搜尋，\n或看看其他地區。', es: 'Prueba con otro nombre\no explora otra zona.' },
  noCategory: { ko: '이 음식 종류의 가게가 없어요', en: 'No restaurants of this type here', ar: 'لا توجد مطاعم من هذا النوع هنا', 'zh-CN': '这里没有这类店铺', ja: 'この種類のお店はありません', 'zh-TW': '這裡沒有這類店家', es: 'No hay restaurantes de este tipo aquí' },
  loadFailed: { ko: '식당 목록을 불러오지 못했어요', en: 'Could not load restaurants', ar: 'تعذر تحميل المطاعم', 'zh-CN': '无法加载餐厅列表', ja: 'お店の一覧を読み込めませんでした', 'zh-TW': '無法載入餐廳列表', es: 'No se pudieron cargar los restaurantes' },
  checkConnection: { ko: '연결 상태를 확인하고 다시 시도해 주세요.', en: 'Check your connection and try again.', ar: 'تحقق من الاتصال وحاول مرة أخرى.', 'zh-CN': '请检查网络连接后重试。', ja: '接続を確認してもう一度お試しください。', 'zh-TW': '請檢查網路連線後重試。', es: 'Revisa tu conexión e inténtalo de nuevo.' },
  locating: { ko: '현재 위치를 확인하고 있어요.', en: 'Finding your location…', ar: 'جارٍ تحديد موقعك…', 'zh-CN': '正在确认当前位置…', ja: '現在地を確認しています…', 'zh-TW': '正在確認目前位置…', es: 'Buscando tu ubicación…' },
  locationNeeded: { ko: '주변 식당을 찾으려면\n위치 권한이 필요해요', en: 'Location access is needed\nto find nearby restaurants', ar: 'يلزم إذن الموقع\nللعثور على المطاعم القريبة', 'zh-CN': '需要位置权限\n才能查找附近餐厅', ja: '近くのお店を探すには\n位置情報の許可が必要です', 'zh-TW': '需要位置權限\n才能尋找附近餐廳', es: 'Necesitamos tu ubicación\npara encontrar restaurantes cercanos' },
  locationNeededBody: { ko: '허용하지 않아도 지역을 골라 둘러볼 수 있어요.', en: 'You can still pick an area to browse without it.', ar: 'يمكنك اختيار منطقة للتصفح حتى بدون الإذن.', 'zh-CN': '不允许也可以选择区域浏览。', ja: '許可しなくてもエリアを選んで見て回れます。', 'zh-TW': '不允許也可以選擇區域瀏覽。', es: 'También puedes elegir una zona para explorar sin permiso.' },
  retryLocation: { ko: '위치 다시 확인', en: 'Check location again', ar: 'التحقق من الموقع مجددًا', 'zh-CN': '重新确认位置', ja: '位置情報を再確認', 'zh-TW': '重新確認位置', es: 'Volver a comprobar la ubicación' },
  goToArea: { ko: '지역으로 이동', en: 'Go to an area', ar: 'الانتقال إلى منطقة', 'zh-CN': '前往区域', ja: 'エリアへ移動', 'zh-TW': '前往區域', es: 'Ir a una zona' },
  locationDenied: { ko: '위치를 확인하지 못했어요. 지역을 골라 둘러보세요.', en: 'Could not get your location. Pick an area to browse.', ar: 'تعذر تحديد موقعك. اختر منطقة للتصفح.', 'zh-CN': '无法确认位置，请选择区域浏览。', ja: '位置情報を取得できませんでした。エリアを選んでください。', 'zh-TW': '無法確認位置，請選擇區域瀏覽。', es: 'No pudimos obtener tu ubicación. Elige una zona.' },
  scanStore: { ko: '이 식당 메뉴 스캔', en: "Scan this restaurant's menu", ar: 'امسح قائمة هذا المطعم', 'zh-CN': '扫描这家店的菜单', ja: 'このお店のメニューをスキャン', 'zh-TW': '掃描這家店的菜單', es: 'Escanear la carta de este restaurante' },
  closeDetail: { ko: '가게 정보 닫기', en: 'Close restaurant details', ar: 'إغلاق تفاصيل المطعم', 'zh-CN': '关闭店铺信息', ja: 'お店の情報を閉じる', 'zh-TW': '關閉店家資訊', es: 'Cerrar detalles' },
  save: { ko: '가게 저장', en: 'Save restaurant', ar: 'حفظ المطعم', 'zh-CN': '收藏店铺', ja: 'お店を保存', 'zh-TW': '收藏店家', es: 'Guardar restaurante' },
  unsave: { ko: '가게 저장 해제', en: 'Remove saved restaurant', ar: 'إزالة المطعم المحفوظ', 'zh-CN': '取消收藏店铺', ja: 'お店の保存を解除', 'zh-TW': '取消收藏店家', es: 'Quitar restaurante guardado' },
  savedToast: { ko: '가게를 저장했어요', en: 'Restaurant saved', ar: 'تم حفظ المطعم', 'zh-CN': '已收藏店铺', ja: 'お店を保存しました', 'zh-TW': '已收藏店家', es: 'Restaurante guardado' },
} satisfies Record<string, AllText>;

const DISTANCE: Record<Language, (d: string) => string> = {
  ko: (d) => `내 위치에서 ${d}`, en: (d) => `${d} from you`, ar: (d) => `على بُعد ${d} منك`, 'zh-CN': (d) => `距你 ${d}`, ja: (d) => `現在地から ${d}`, 'zh-TW': (d) => `距你 ${d}`, es: (d) => `A ${d} de ti`,
};
const formatDistance = (meters: number) => (meters >= 1000 ? `${(meters / 1000).toFixed(1).replace(/\.0$/, '')}km` : `${Math.round(meters)}m`);

type StoreSort = 'default' | 'distance' | 'reviews';
const SORT_LABELS: Record<StoreSort, AllText> = {
  // 기본순: 서버 순서(검증 가게 먼저). 개인화 · 안전 순위가 아니다.
  default: { ko: '기본순', en: 'Default', ar: 'الترتيب الافتراضي', 'zh-CN': '默认排序', ja: '標準', 'zh-TW': '預設排序', es: 'Predeterminado' },
  distance: { ko: '거리순', en: 'Nearest', ar: 'الأقرب', 'zh-CN': '距离最近', ja: '近い順', 'zh-TW': '距離最近', es: 'Más cerca' },
  reviews: { ko: '후기 많은순', en: 'Most reviewed', ar: 'الأكثر مراجعة', 'zh-CN': '评价最多', ja: 'レビューが多い順', 'zh-TW': '評價最多', es: 'Más reseñas' },
};

/** 칩에 쓰는 음식 종류(기타 제외) */
const CATEGORY_CHIPS = FOOD_CATEGORY_ORDER.filter((id) => id !== 'other');

function isAreaId(value: string | null): value is AreaId {
  return AREAS.some((area) => area.id === value);
}

export function RestaurantMapScreen({
  language,
  demoMode,
  selectedStore,
  onSelectStore,
}: {
  language: Language;
  demoMode: boolean;
  selectedStore: StoreCandidate | null;
  onSelectStore: (store: StoreCandidate | null) => void;
}) {
  if (!demoMode) {
    return <LiveRestaurantMapScreen language={language} selectedStore={selectedStore} onSelectStore={onSelectStore} />;
  }
  return <DemoRestaurantMapScreen language={language} />;
}

function DemoRestaurantMapScreen({ language }: { language: Language }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routeState = useLocation().state as { searchCenter?: StoreCoordinates } | null;
  const requestedArea = searchParams.get('area');
  const requestedRestaurant = RESTAURANTS.find((restaurant) => restaurant.id === searchParams.get('restaurant')) ?? null;
  // 첫 위치: 식당 지정 → 그 식당, 홈에서 고른 지역 → 그 중심, 지역 지정 → 그 중심, 없으면 용산·삼각지. '내 주변'은 위치를 한 번 요청.
  const [initial] = useState(() => {
    if (requestedRestaurant) return { location: { latitude: requestedRestaurant.lat, longitude: requestedRestaurant.lng }, selectedId: demoStoreId(requestedRestaurant) };
    if (routeState?.searchCenter) return { location: routeState.searchCenter, selectedId: null };
    const area = isAreaId(requestedArea) && requestedArea !== 'nearby' ? MAP_AREAS.find((item) => item.id === requestedArea) : null;
    return { location: (area ?? DEFAULT_MAP_AREA).center, selectedId: null };
  });
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState<{ location: StoreCoordinates; origin: StoreSearchOrigin }>({ location: initial.location, origin: 'map-center' });
  const [locationStatus, setLocationStatus] = useState<StoreLocationStatus>('ready');
  const [version, setVersion] = useState(0);
  const [, setSelectedRestaurant] = useDemoValue<string | null>('selected-restaurant', null);

  const searchAtCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocationStatus('unsupported'); return; }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSearch({ location: { latitude: position.coords.latitude, longitude: position.coords.longitude }, origin: 'current-location' });
        setLocationStatus('ready');
      },
      // 실패해도 보던 지역은 그대로 둔다.
      () => setLocationStatus('denied'),
      { timeout: 8000, maximumAge: 300000 },
    );
  }, []);
  useEffect(() => {
    if (!requestedRestaurant && requestedArea === 'nearby') searchAtCurrentLocation();
  }, []);

  const candidates = useMemo(
    () => searchDemoStores(language, { query, location: search.location }),
    [language, query, search, version],
  );
  return (
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
        retrySearch: () => setVersion((value) => value + 1),
        searchAt: (location) => setSearch({ location, origin: 'map-center' }),
        searchAtCurrentLocation,
        searchLocation: search.location,
        searchOrigin: search.origin,
      }}
      initialSelectedId={initial.selectedId}
      districtFallback={(store) => {
        const restaurant = demoRestaurantOf(store);
        return restaurant ? demoAreaName(restaurant, language) : null;
      }}
      onScan={(store) => {
        const restaurant = demoRestaurantOf(store);
        if (!restaurant) return;
        setSelectedRestaurant(restaurant.id);
        navigate('/scan');
      }}
    />
  );
}

function LiveRestaurantMapScreen({
  language,
  selectedStore,
  onSelectStore,
}: {
  language: Language;
  selectedStore: StoreCandidate | null;
  onSelectStore: (store: StoreCandidate | null) => void;
}) {
  const navigate = useNavigate();
  const incoming = useLocation().state as { searchCenter?: StoreCoordinates; initialQuery?: string; selectedStoreId?: number; selectedStore?: StoreCandidate } | null;
  const initialSearchCenter = incoming?.searchCenter;
  const [query, setQuery] = useState(incoming?.initialQuery ?? '');
  const discovery = useStoreCandidates(query, {
    initialSearchLocation: initialSearchCenter,
    locateUser: !initialSearchCenter,
    radiusMeters: MAP_SEARCH_RADIUS_METERS,
    limit: MAP_SEARCH_LIMIT,
  });
  // 다른 화면에서 가게를 넘겨받았으면, 처음 결과 맨 앞에 둔다(반경 밖이어도 선택 가능).
  const atInitialCenter = discovery.searchLocation?.latitude === initialSearchCenter?.latitude && discovery.searchLocation?.longitude === initialSearchCenter?.longitude;
  const candidates = incoming?.selectedStore && !query.trim() && atInitialCenter
    ? [incoming.selectedStore, ...discovery.candidates.filter((item) => item.storeId !== incoming.selectedStore?.storeId)]
    : discovery.candidates;
  return (
    <StoreMapView
      language={language}
      query={query}
      onQueryChange={setQuery}
      discovery={{ ...discovery, candidates }}
      initialSelectedId={incoming?.selectedStoreId ?? selectedStore?.storeId ?? null}
      onScan={(store) => {
        onSelectStore(store);
        navigate('/scan');
      }}
    />
  );
}

type StoreDiscovery = Pick<
  ReturnType<typeof useStoreCandidates>,
  'candidates' | 'error' | 'isLoading' | 'locationStatus' | 'retryLocation' | 'retrySearch' | 'searchAt' | 'searchAtCurrentLocation' | 'searchLocation' | 'searchOrigin'
>;

/**
 * 흐름 2 지도에서 가게 찾기(F2-01~07). 데이터는 호출부가 준다(후보 API · 시연 · 개발 미리보기).
 * - 지도 모드: 검색 · 지역 칩 · 음식 종류 칩 · 핀 · [이 지역에서 검색] · 내 위치 · 가게 목록 시트
 * - 핀을 고르면 미리보기 시트(F2-04: 가게 사진 · 층 · 대표 메뉴 · [가게 상세 ›] · [이 식당 메뉴 스캔])
 * - 목록 · 저장한 가게 카드를 누르면 가게 상세(`/stores/:storeId`)
 * - 목록 모드: 주변 가게 | 저장한 가게(이 기기에만 저장)
 */
export function StoreMapView({
  language,
  query,
  onQueryChange,
  discovery,
  initialSelectedId = null,
  demoMode = false,
  districtFallback,
  onScan,
}: {
  language: Language;
  query: string;
  onQueryChange: (query: string) => void;
  discovery: StoreDiscovery;
  initialSelectedId?: number | null;
  /** 시연 모드: 네이버 지도 대신 위치 개요 */
  demoMode?: boolean;
  /** 주소가 없는 가게의 지역 이름(시연) */
  districtFallback?: (store: StoreCandidate) => string | null;
  onScan: (store: StoreCandidate) => void;
}) {
  const toast = useToast();
  const routeState = useLocation().state as { category?: FoodCategoryId } | null;
  const { candidates, error, isLoading, locationStatus, retryLocation, retrySearch, searchAt, searchAtCurrentLocation, searchLocation, searchOrigin } = discovery;
  const { isSaved, toggle, savedStores } = useSavedStores();

  const [selected, setSelected] = useState<StoreCandidate | null>(null);
  const pendingSelectId = useRef<number | null>(initialSelectedId);
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [listTab, setListTab] = useState<'nearby' | 'saved'>('nearby');
  const [areaSheet, setAreaSheet] = useState(false);

  // 지도 중심: 끌면 따라감(다시 찾지 않음), 가게를 고르면 그 가게, 새로 찾으면 찾은 위치.
  const [viewCenter, setViewCenter] = useState<StoreCoordinates | null>(null);
  const [movedByUser, setMovedByUser] = useState(false);
  useEffect(() => {
    if (searchLocation) setViewCenter(searchLocation);
    setMovedByUser(false);
  }, [searchLocation]);

  // 이름 검색을 바꾸면 고른 가게를 놓는다.
  const previousQuery = useRef(query);
  useEffect(() => {
    if (previousQuery.current !== query) setSelected(null);
    previousQuery.current = query;
  }, [query]);

  // 다른 화면에서 넘겨받은 가게: 후보에 나타나면 고른다.
  useEffect(() => {
    const id = pendingSelectId.current;
    if (id === null) return;
    const store = candidates.find((item) => item.storeId === id);
    if (store) {
      pendingSelectId.current = null;
      setSelected(store);
      setViewCenter({ latitude: store.latitude, longitude: store.longitude });
    }
  }, [candidates]);

  // 위치를 직접 요청했는데 막히면 알림(보던 지도는 그대로).
  const askedLocation = useRef(false);
  useEffect(() => {
    if (!askedLocation.current || locationStatus === 'loading') return;
    askedLocation.current = false;
    if ((locationStatus === 'denied' || locationStatus === 'unsupported') && searchLocation) toast.show(tx(language, T.locationDenied), { tone: 'error' });
  }, [locationStatus]);

  // 정렬 · 음식 종류. 음식 종류는 핀에도 적용. 홈 '오늘은 뭐가 당기세요?'에서 고른 종류로 시작.
  const distanceSortable = !query.trim();
  const [sort, setSort] = useState<StoreSort>('distance');
  const activeSort: StoreSort = sort === 'distance' && !distanceSortable ? 'default' : sort;
  const [category, setCategory] = useState<FoodCategoryId | 'all'>(() => routeState?.category ?? 'all');
  const visible = useMemo(() => {
    const filtered = category === 'all' ? candidates : candidates.filter((store) => foodCategoryOf(store) === category);
    if (activeSort === 'default') return filtered;
    const far = Number.MAX_SAFE_INTEGER;
    return [...filtered].sort((a, b) => activeSort === 'distance'
      ? (a.distanceMeters ?? far) - (b.distanceMeters ?? far)
      : (b.reviewCount ?? 0) - (a.reviewCount ?? 0) || (a.distanceMeters ?? far) - (b.distanceMeters ?? far));
  }, [activeSort, candidates, category]);

  const selectStore = (store: StoreCandidate | null) => {
    setSelected(store);
    if (store) setViewCenter({ latitude: store.latitude, longitude: store.longitude });
  };
  const searchHere = () => {
    if (!viewCenter) return;
    setSelected(null);
    searchAt(viewCenter);
  };
  const searchNearMe = () => {
    setMovedByUser(false);
    setSelected(null);
    if (query) onQueryChange('');
    // 이미 현재 위치 결과면 다시 찾지 않고 지도만 돌아온다.
    if (searchOrigin === 'current-location' && searchLocation && locationStatus === 'ready') setViewCenter({ ...searchLocation });
    else {
      askedLocation.current = true;
      searchAtCurrentLocation();
    }
  };
  const goToArea = (center: StoreCoordinates) => {
    if (query) onQueryChange('');
    setSelected(null);
    setMode('map');
    searchAt(center);
  };

  const currentArea = mapAreaAt(searchLocation);
  const areaLabel = searchOrigin === 'current-location' && searchLocation
    ? tx(language, T.nearMe)
    : currentArea ? tx(language, currentArea.label) : tx(language, T.area);

  const mapCenter = viewCenter ?? searchLocation ?? (candidates[0] ? { latitude: candidates[0].latitude, longitude: candidates[0].longitude } : null);
  const pinStores = selected && !visible.some((store) => store.storeId === selected.storeId) ? [selected, ...visible] : visible;
  const mapStores = pinStores.map((store) => ({ id: String(store.storeId), name: storeDisplayName(store), lat: store.latitude, lng: store.longitude }));

  // 가게 상세로(목록 · 저장한 가게 카드, 미리보기 시트 [가게 상세]). 거리는 내 위치 기준일 때만 넘긴다.
  const navigate = useNavigate();
  const showDistance = searchOrigin === 'current-location' && !query.trim();
  const openDetail = (store: StoreCandidate) => {
    const state: StoreDetailRouteState = { candidate: { ...store, distanceMeters: showDistance ? store.distanceMeters : null } };
    navigate(`/stores/${store.storeId}`, { state });
  };

  const cardFor = (store: StoreCandidate, onClick: () => void) => (
    <StoreCard
      key={store.storeId}
      language={language}
      name={storeDisplayName(store)}
      reviewCount={store.reviewCount ?? 0}
      district={storeDistrict(store, districtFallback?.(store))}
      category={storeCategoryText(store, language)}
      distanceMeters={showDistance ? store.distanceMeters : null}
      saved={isSaved(store.storeId)}
      onToggleSave={() => toggleSave(store)}
      onClick={onClick}
    />
  );
  const toggleSave = (store: StoreCandidate) => {
    const wasSaved = isSaved(store.storeId);
    toggle(store);
    if (!wasSaved) toast.show(tx(language, T.savedToast), { tone: 'success' });
  };

  const sortMenu = candidates.length > 0 && (
    <ChipMenu
      menuLabel={tx(language, T.sort)}
      value={activeSort}
      onChange={setSort}
      align="end"
      options={(distanceSortable ? (['distance', 'reviews', 'default'] as StoreSort[]) : (['default', 'reviews'] as StoreSort[])).map((value) => ({ value, label: tx(language, SORT_LABELS[value]) }))}
      className="inline-flex h-9 items-center gap-1 rounded-hs-pill bg-hs-surface-100 px-3 text-[13px] font-extrabold text-hs-ink-700"
    >
      <HsIcon name="sort" size={14} strokeWidth={2.4} />
      {tx(language, SORT_LABELS[activeSort])}
    </ChipMenu>
  );
  const listTitle = (
    <h2 className="text-[18px] font-black text-hs-ink-900">
      {tx(language, query.trim() ? T.results : T.nearby)} <span dir="ltr" className="text-hs-brand-700">{visible.length}</span>
    </h2>
  );

  // 목록 대신 보여 줄 상태(오류 · 불러오는 중 · 결과 없음 · 음식 종류에 없음)
  const listFallback: ReactNode = error ? (
    <ErrorState language={language} title={tx(language, T.loadFailed)} description={tx(language, T.checkConnection)} onRetry={retrySearch} />
  ) : candidates.length === 0 && isLoading ? (
    <div className="space-y-2.5">
      <SkeletonCard language={language} className="border-[1.5px] border-hs-line-200" />
      <SkeletonCard language={language} className="border-[1.5px] border-hs-line-200" />
    </div>
  ) : candidates.length > 0 && visible.length === 0 ? (
    <EmptyState icon="search" title={tx(language, T.noCategory)} action={<HsButton variant="outline" size="md" onClick={() => setCategory('all')}>{tx(language, T.all)}</HsButton>} />
  ) : null;
  const noResult = !error && !isLoading && candidates.length === 0 && (searchLocation || query.trim());

  const searchRow = (inList: boolean) => (
    <div className="flex gap-2">
      <SearchField
        value={query}
        onChange={onQueryChange}
        language={language}
        label={tx(language, T.search)}
        placeholder={tx(language, T.search)}
        className={`min-w-0 flex-1 ${inList ? '' : 'bg-hs-surface-0! shadow-[0_4px_14px_rgba(23,32,28,0.10)]'}`}
      />
      <HsIconButton
        icon={inList ? 'map' : 'list'}
        label={tx(language, inList ? T.showMap : T.showList)}
        tone={inList ? 'soft' : 'white'}
        iconSize={22}
        onClick={() => { setSelected(null); setMode(inList ? 'map' : 'list'); }}
        className={`size-[52px]! ${inList ? '' : 'shadow-[0_4px_14px_rgba(23,32,28,0.10)]'}`}
      />
    </div>
  );

  const chipClass = (on: boolean) => `inline-flex h-[38px] flex-none items-center gap-[5px] whitespace-nowrap rounded-hs-pill px-3.5 text-[13px] font-extrabold shadow-[0_2px_8px_rgba(23,32,28,0.08)] ${on ? 'bg-hs-ink-900 text-hs-surface-0' : 'bg-hs-surface-0 text-hs-ink-700'}`;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-hs-surface-0 text-hs-ink-900">
      {/* isolate: 지도 영역 안 겹침(시트 · 안내)이 하단 내비의 촬영 버튼을 덮지 않게 */}
      <div className="relative isolate min-h-0 flex-1 overflow-hidden">
        {/* isolate: 네이버 지도 안 요소(로고 등)가 시트 위로 오지 않게 */}
        <div className="absolute inset-0 isolate">
          {mapCenter ? (
            <StoreMap
              language={language}
              stores={mapStores}
              center={{ lat: mapCenter.latitude, lng: mapCenter.longitude }}
              selectedId={selected ? String(selected.storeId) : null}
              onSelect={(mapStore) => selectStore(pinStores.find((store) => String(store.storeId) === mapStore.id) ?? null)}
              onCenterChange={(center) => { setViewCenter({ latitude: center.lat, longitude: center.lng }); setMovedByUser(true); }}
              fitStores={false}
              demoMode={demoMode}
              demoInsets={{ top: TOP_OVERLAY, bottom: selected ? 420 : LIST_SHEET_HEIGHT + 20 }}
              focusOffsetY={selected ? DETAIL_FOCUS_OFFSET : 0}
              className="h-full w-full bg-[#EEF3F0]"
            />
          ) : (
            <div className="h-full w-full bg-[#EEF3F0]" aria-hidden="true" />
          )}
        </div>

        {/* 위: 검색 · 지역 · 음식 종류 */}
        <div className="absolute inset-x-0 top-0 z-30 px-4 pt-[max(18px,env(safe-area-inset-top))]">
          {searchRow(false)}
          <div role="group" aria-label={tx(language, T.cuisine)} className="-mx-4 mt-2.5 flex gap-1.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
            <button type="button" onClick={() => setAreaSheet(true)} aria-haspopup="dialog" aria-label={`${tx(language, T.chooseArea)}: ${areaLabel}`} className={chipClass(true)}>
              <HsIcon name={searchOrigin === 'current-location' && searchLocation ? 'locate' : 'pin'} size={14} strokeWidth={2.4} />
              {areaLabel}
              <HsIcon name="chevronDown" size={14} strokeWidth={2.6} />
            </button>
            {/* 전체는 눌린 상태여도 흰 칩(디자인 보드: 진한 칩은 지역 · 고른 음식 종류만) */}
            <button type="button" aria-pressed={category === 'all'} onClick={() => { setCategory('all'); setSelected(null); }} className={chipClass(false)}>{tx(language, T.all)}</button>
            {CATEGORY_CHIPS.map((id) => (
              <button key={id} type="button" aria-pressed={category === id} onClick={() => { setCategory(category === id ? 'all' : id); setSelected(null); }} className={chipClass(category === id)}>
                {translateText(language, FOOD_CATEGORY_LABELS[id])}
              </button>
            ))}
          </div>
          <OfflineBanner language={language} onRetry={retrySearch} className="mt-1" />
        </div>

        {/* 위치를 아직 모를 때(F2-07) */}
        {!mapCenter && (
          locationStatus === 'loading' ? (
            <div role="status" className="absolute inset-x-5 top-[38%] z-20 text-center text-[14px] font-bold text-hs-ink-500">
              <span className="mx-auto mb-3 block size-7 animate-spin rounded-full border-[3px] border-hs-mint-200 border-t-hs-brand-700 motion-reduce:animate-none" aria-hidden="true" />
              {tx(language, T.locating)}
            </div>
          ) : (
            <>
              <div className="absolute inset-0 z-20 bg-[rgba(238,243,240,0.75)]" aria-hidden="true" />
              <section role="alert" className="absolute inset-x-5 top-1/2 z-30 -translate-y-1/2 rounded-[32px] bg-hs-surface-0 px-[22px] pt-[26px] pb-5 text-center shadow-[0_16px_40px_rgba(23,32,28,0.14)]">
                <BowlTile className="mx-auto h-[74px] w-[84px] bg-hs-mint-100 text-hs-brand-700"><HsIcon name="locate" size={34} /></BowlTile>
                <h2 className="mt-4 whitespace-pre-line text-[19px] leading-[1.35] font-black">{tx(language, T.locationNeeded)}</h2>
                <p className="mt-2 text-[14px] leading-[1.5] font-semibold text-hs-ink-500">{tx(language, T.locationNeededBody)}</p>
                <HsButton block className="mt-[18px] h-[52px]!" onClick={retryLocation}>{tx(language, T.retryLocation)}</HsButton>
                <HsButton block variant="outline" size="md" className="mt-2 h-12!" onClick={() => setAreaSheet(true)}>{tx(language, T.goToArea)}</HsButton>
              </section>
            </>
          )
        )}

        {/* 지도 버튼: 이 지역에서 검색 · 내 위치 */}
        {mapCenter && !selected && (
          <div className="pointer-events-none absolute inset-x-0 z-30 grid grid-cols-[1fr_auto_1fr] items-center px-4" style={{ bottom: noResult ? 'calc(min(60%, 360px) + 14px)' : LIST_SHEET_HEIGHT + 14 }}>
            <span />
            <div className="pointer-events-auto">
              {movedByUser && !query.trim() && (
                <button type="button" onClick={searchHere} className="inline-flex h-10 items-center gap-1.5 rounded-hs-pill bg-hs-brand-700 px-4 text-[13px] font-black text-hs-surface-0 shadow-[0_6px_16px_rgba(23,107,77,0.3)]">
                  <HsIcon name="refresh" size={15} strokeWidth={2.6} />
                  {tx(language, T.searchHere)}
                </button>
              )}
            </div>
            <div className="pointer-events-auto justify-self-end">
              <button type="button" onClick={searchNearMe} disabled={locationStatus === 'loading'} aria-label={tx(language, T.locate)} className="flex size-12 items-center justify-center rounded-hs-pill bg-hs-surface-0 text-hs-brand-700 shadow-[0_4px_14px_rgba(23,32,28,0.12)] disabled:opacity-60">
                {locationStatus === 'loading'
                  ? <span className="size-5 animate-spin rounded-full border-[3px] border-hs-mint-200 border-t-hs-brand-700 motion-reduce:animate-none" aria-hidden="true" />
                  : <HsIcon name="locate" size={22} />}
              </button>
            </div>
          </div>
        )}

        {/* 아래: 가게 목록 시트(F2-01) · 결과 없음(F2-03) · 가게 상세(F2-04) */}
        {mapCenter && !selected && (noResult ? (
          <NoResultSheet language={language} searched={Boolean(query.trim())} onGoToArea={() => setAreaSheet(true)} />
        ) : (
          <ListSheet language={language} title={listTitle} sortMenu={sortMenu} onExpand={() => setMode('list')}>
            {listFallback ?? <div className="space-y-2.5">{visible.map((store) => cardFor(store, () => openDetail(store)))}</div>}
          </ListSheet>
        ))}
        {selected && (
          <StoreDetailSheet
            language={language}
            store={selected}
            demoMode={demoMode}
            districtFallback={districtFallback?.(selected) ?? null}
            showDistance={showDistance}
            saved={isSaved(selected.storeId)}
            onToggleSave={() => toggleSave(selected)}
            onDetail={() => openDetail(selected)}
            onClose={() => setSelected(null)}
            onScan={() => onScan(selected)}
          />
        )}

        {/* 목록 모드(F2-06) */}
        {mode === 'list' && (
          <div className="absolute inset-0 z-50 flex flex-col bg-hs-surface-0">
            <div className="flex-none px-4 pt-[max(18px,env(safe-area-inset-top))]">{searchRow(true)}</div>
            <PillTabs
              label={tx(language, T.listTabs)}
              value={listTab}
              onChange={setListTab}
              items={[
                { value: 'nearby', label: tx(language, query.trim() ? T.results : T.nearby) },
                { value: 'saved', label: `${tx(language, T.saved)} ${savedStores.length}` },
              ]}
              className="mx-5 mt-4 flex-none"
            />
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3.5 pb-6">
              {listTab === 'saved' ? (
                <>
                  <p className="flex items-start gap-2 rounded-[18px] bg-hs-surface-100 px-3.5 py-3 text-[12px] leading-[1.5] font-semibold text-hs-ink-700">
                    <HsIcon name="alert" size={16} strokeWidth={2.4} className="mt-px flex-none text-hs-brand-700" />
                    <span>{tx(language, T.deviceNote)}</span>
                  </p>
                  <div className="mt-3.5 space-y-2.5">
                    {savedStores.length === 0
                      ? <EmptyState icon="bookmark" title={tx(language, T.noSaved)} description={tx(language, T.noSavedBody)} />
                      : savedStores.map((store) => cardFor(store, () => openDetail(store)))}
                  </div>
                </>
              ) : noResult ? (
                <NoResultBody language={language} searched={Boolean(query.trim())} onGoToArea={() => setAreaSheet(true)} />
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">{listTitle}{sortMenu}</div>
                  <div className="mt-3">
                    {listFallback ?? <div className="space-y-2.5">{visible.map((store) => cardFor(store, () => openDetail(store)))}</div>}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>

      <BottomNav language={language} />

      {areaSheet && (
        <MapAreaSheet
          language={language}
          currentAreaId={searchOrigin === 'current-location' ? null : currentArea?.id ?? null}
          onClose={() => setAreaSheet(false)}
          onNearMe={() => { setAreaSheet(false); setMode('map'); searchNearMe(); }}
          onSelect={(area) => { setAreaSheet(false); goToArea(area.center); }}
        />
      )}
    </div>
  );
}

/** 끌어 올리거나 손잡이를 누르면 목록 모드로 */
function useDragUp(onUp: () => void) {
  const start = useRef<number | null>(null);
  return {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => { start.current = event.clientY; },
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => {
      if (start.current !== null && start.current - event.clientY > 30) onUp();
      start.current = null;
    },
    onPointerCancel: () => { start.current = null; },
  };
}

function SheetHandle({ label, onActivate, drag }: { label: string; onActivate: () => void; drag?: ReturnType<typeof useDragUp> }) {
  return (
    <div className="flex flex-none touch-none justify-center pt-1" {...drag}>
      <button type="button" aria-label={label} onClick={onActivate} className="flex h-6 w-16 items-center justify-center">
        <i aria-hidden="true" className="h-[5px] w-10 rounded-hs-pill bg-hs-line-300" />
      </button>
    </div>
  );
}

function ListSheet({ language, title, sortMenu, onExpand, children }: { language: Language; title: ReactNode; sortMenu: ReactNode; onExpand: () => void; children: ReactNode }) {
  const drag = useDragUp(onExpand);
  return (
    <section className="absolute inset-x-0 bottom-0 z-40 flex max-h-[55%] flex-col rounded-t-hs-sheet bg-hs-surface-0 shadow-[0_-10px_30px_rgba(23,32,28,0.12)]" style={{ height: LIST_SHEET_HEIGHT }}>
      <SheetHandle label={tx(language, T.showList)} onActivate={onExpand} drag={drag} />
      <div className="flex flex-none items-center justify-between gap-2 px-5 pt-1.5" {...drag}>{title}{sortMenu}</div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-4">{children}</div>
    </section>
  );
}

/** F2-03 결과 없음. 스캔에는 식당 선택이 필수라(2026-11-25) [식당 없이 스캔하기] 대신 [지역으로 이동]. */
function NoResultBody({ language, searched, onGoToArea }: { language: Language; searched: boolean; onGoToArea: () => void }) {
  return (
    <div className="flex flex-col items-center px-3 pt-7 text-center">
      <BowlTile className="h-[84px] w-24 bg-hs-mint-100 text-hs-brand-700"><HsIcon name="search" size={36} /></BowlTile>
      <h2 className="mt-[18px] text-[20px] font-black text-hs-ink-900">{tx(language, searched ? T.noResult : T.noNearby)}</h2>
      <p className="mt-2 whitespace-pre-line text-[14px] leading-[1.55] font-semibold text-hs-ink-500">{tx(language, T.noResultBody)}</p>
      <HsButton variant="outline" size="lg" icon="pin" className="mt-6" onClick={onGoToArea}>{tx(language, T.goToArea)}</HsButton>
    </div>
  );
}

function NoResultSheet(props: { language: Language; searched: boolean; onGoToArea: () => void }) {
  return (
    <section className="absolute inset-x-0 bottom-0 z-40 max-h-[60%] overflow-y-auto rounded-t-hs-sheet bg-hs-surface-0 px-5 pt-2.5 pb-6 shadow-[0_-10px_30px_rgba(23,32,28,0.12)]">
      <div className="flex justify-center" aria-hidden="true"><i className="h-[5px] w-10 rounded-hs-pill bg-hs-line-300" /></div>
      <NoResultBody {...props} />
    </section>
  );
}

/**
 * F2-04 가게 선택 · 미리보기 시트: 가게 사진 84(contain) · 이름 · 저장 / 후기 · 구 · 종류 · 층 / 거리 /
 * '대표 메뉴' 메뉴 태그 / [가게 상세 ›] + [이 식당 메뉴 스캔]. 사진 · 층 · 메뉴는 가게 상세 API에서(실패하면 숨김).
 */
function StoreDetailSheet({ language, store, demoMode, districtFallback, showDistance, saved, onToggleSave, onDetail, onClose, onScan }: {
  language: Language;
  store: StoreCandidate;
  demoMode: boolean;
  districtFallback: string | null;
  showDistance: boolean;
  saved: boolean;
  onToggleSave: () => void;
  onDetail: () => void;
  onClose: () => void;
  onScan: () => void;
}) {
  const sheetRef = useRef<HTMLElement>(null);
  const dragStart = useRef<number | null>(null);
  const detailState = useStoreDetail(store.storeId, demoMode);
  const detail = detailState.detail;
  const menus = detail?.menus ?? [];
  const meta = storeMetaLine({ ...store, floorInfo: detail?.floorInfo ?? store.floorInfo }, language, districtFallback);

  useEffect(() => {
    sheetRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented && !document.querySelector('[role="dialog"]')) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [store.storeId, onClose]);

  const photoBox = 'size-[84px] flex-none rounded-[20px]';
  const photo = detailState.status === 'loading'
    ? <div aria-hidden="true" className={`${photoBox} bg-[#E6ECE9]`} />
    : detail?.thumbnailUrl
      ? <ContainPhoto src={detail.thumbnailUrl} alt={`${tx(language, STORE_TEXT.photo)} · ${storeDisplayName(store)}`} className={photoBox} fallback={null} />
      : null;

  return (
    <section
      ref={sheetRef}
      tabIndex={-1}
      aria-labelledby="map-store-name"
      className="absolute inset-x-0 bottom-0 z-40 flex max-h-[calc(100%-120px)] flex-col rounded-t-hs-sheet bg-hs-surface-0 shadow-[0_-10px_30px_rgba(23,32,28,0.12)] focus:outline-none"
    >
      <div
        className="flex-none touch-none"
        onPointerDown={(event) => { dragStart.current = event.clientY; }}
        onPointerUp={(event) => { if (dragStart.current !== null && event.clientY - dragStart.current > 50) onClose(); dragStart.current = null; }}
        onPointerCancel={() => { dragStart.current = null; }}
      >
        <SheetHandle label={tx(language, T.closeDetail)} onActivate={onClose} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex gap-3.5 px-5 pt-2">
          {photo}
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-1.5">
              <h2 id="map-store-name" className="min-w-0 flex-1 text-[22px] leading-tight font-black break-words text-hs-ink-900">{storeDisplayName(store)}</h2>
              <HsIconButton
                icon="bookmark"
                tone="ghost"
                label={tx(language, saved ? T.unsave : T.save)}
                aria-pressed={saved}
                onClick={onToggleSave}
                className={`-mt-1.5 -me-2 ${saved ? 'text-hs-brand-700 [&_svg]:fill-current' : 'text-hs-ink-500'}`}
              />
            </div>
            {meta && <p className="mt-1 text-[13px] font-semibold text-hs-ink-500">{meta}</p>}
            {showDistance && typeof store.distanceMeters === 'number' && (
              <p className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-extrabold text-hs-brand-700">
                <HsIcon name="pin" size={13} strokeWidth={2.4} />
                {(DISTANCE[language] ?? DISTANCE.en)(formatDistance(store.distanceMeters))}
              </p>
            )}
          </div>
        </div>
        {menus.length > 0 && (
          <div className="px-5 pt-3.5">
            <h3 id="map-store-menus" className="text-[13px] font-black text-hs-ink-900">{tx(language, STORE_TEXT.featuredMenus)}</h3>
            <MenuTags language={language} names={menus.map((menu) => menu.name)} label={tx(language, STORE_TEXT.featuredMenus)} className="mt-2" />
          </div>
        )}
      </div>
      <div className="flex flex-none gap-2 px-5 pt-[18px] pb-4">
        {/* 긴 언어에서 주 버튼이 넘치지 않게: [가게 상세]는 글자 폭, 주 버튼은 남은 폭(두 줄까지) */}
        <HsButton variant="outline" trailingIcon="forward" className="h-auto! min-h-[52px] flex-none px-5 whitespace-nowrap" onClick={onDetail}>{tx(language, STORE_TEXT.openDetail)}</HsButton>
        <HsButton icon="scan" className="h-auto! min-h-[52px] min-w-0 flex-1 py-2 text-center" onClick={onScan}>{tx(language, T.scanStore)}</HsButton>
      </div>
    </section>
  );
}
