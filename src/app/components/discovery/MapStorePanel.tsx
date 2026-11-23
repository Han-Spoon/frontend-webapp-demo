import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Bookmark, Camera, ChevronRight, Clock, List, Map as MapIcon, Star, Utensils } from 'lucide-react';
import type { StoreCandidate } from '../../../api/store';
import type { StoreSearchOrigin } from '../../hooks/useStoreCandidates';
import { createTranslator, translateText, type Language } from '../../locales';
import { groupNearbyStores } from './StoreMap';
import { FOOD_CATEGORY_LABELS, foodCategoryOf } from './foodCategories';
import { formatFloor } from './storeFloor';

/** 후보 API에 없는 카드 항목(fixture·시연 데이터 전용). 값이 없으면 해당 줄 숨김. */
export interface StoreCardExtras {
  /** 0–5 */
  rating?: number;
  photos?: string[];
  /** 예: "11:00–21:00" */
  hours?: string;
  /** 주소의 구·군 대신 보여 줄 지역 이름(시연 식당처럼 주소가 없을 때) */
  area?: string;
  /** 가게명 위 배지(시연의 입점·레시피 인증) */
  badge?: ReactNode;
  /** 'menu'면 아래 버튼이 [내 프로필로 메뉴 보기](레시피 인증 시연 식당) */
  primaryAction?: 'scan' | 'menu';
}

type ExtrasLookup = (store: StoreCandidate) => StoreCardExtras | undefined;

const SAVED_KEY = 'han-spoon-saved-stores';
/** 접힌 목록 시트에서 보이는 높이 */
const PEEK_HEIGHT = 150;

export function storeDisplayName(store: StoreCandidate) {
  return store.branchName ? `${store.name} ${store.branchName}` : store.name;
}

/** "서울 용산구 한강대로 23길" → "용산구". 구·군이 없으면 두 번째 토큰(예: "화성시"). */
function areaFromAddress(address?: string | null) {
  const tokens = address?.trim().split(/\s+/) ?? [];
  return tokens.find((token) => /[구군]$/.test(token)) ?? tokens[1] ?? null;
}

function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;
}

function validRating(rating?: number) {
  return typeof rating === 'number' && Number.isFinite(rating) && rating >= 0 && rating <= 5 ? rating : null;
}

function readSaved(): number[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === 'number') : [];
  } catch {
    return [];
  }
}

/** 가게 저장(저장 API 전까지 기기에만) */
function useSavedStores() {
  const [saved, setSaved] = useState<number[]>(readSaved);
  const [snapshots, setSnapshots] = useState<StoreCandidate[]>(() => {
    try { const data = JSON.parse(localStorage.getItem(`${SAVED_KEY}:details`) ?? '[]'); return Array.isArray(data) ? data.filter(item => item && typeof item.storeId === 'number' && typeof item.name === 'string') : []; } catch { return []; }
  });
  const remember = useCallback((stores: StoreCandidate[]) => {
    const next = stores.filter(store => saved.includes(store.storeId));
    const merged = [...next, ...snapshots.filter(store => saved.includes(store.storeId) && !next.some(item => item.storeId === store.storeId))];
    if (JSON.stringify(merged) === JSON.stringify(snapshots)) return;
    setSnapshots(merged);
    try { localStorage.setItem(`${SAVED_KEY}:details`, JSON.stringify(merged)); } catch { /* Keep this session usable. */ }
  }, [saved, snapshots]);
  const toggle = (storeId: number) => {
    setSaved((current) => {
      const next = current.includes(storeId) ? current.filter((id) => id !== storeId) : [...current, storeId];
      try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch { /* 저장이 막혀 있으면 이번 화면에서만 기억한다. */ }
      return next;
    });
  };
  return { saved, toggle, snapshots, remember };
}

function StoreCard({
  language,
  store,
  extras,
  origin,
  saved,
  onToggleSave,
  onOpenDetail,
  onScan,
}: {
  language: Language;
  store: StoreCandidate;
  extras?: StoreCardExtras;
  origin: StoreSearchOrigin | null;
  saved: boolean;
  onToggleSave: () => void;
  onOpenDetail: () => void;
  onScan: () => void;
}) {
  const t = createTranslator(language);
  const tr = (text: Parameters<typeof translateText>[1]) => translateText(language, text);
  const rating = validRating(extras?.rating);
  const reviewCount = store.reviewCount ?? 0;
  const category = foodCategoryOf(store);
  // 기타 분류는 '기타' 대신 한국어 화면에서만 원래 분류 이름.
  const categoryText = category !== 'other' ? translateText(language, FOOD_CATEGORY_LABELS[category]) : language === 'ko' ? store.categoryName?.trim() || null : null;
  const meta = [extras?.area ?? areaFromAddress(store.roadAddress), categoryText, formatFloor(store.floorInfo, language)].filter(Boolean);
  const photos = extras?.photos?.slice(0, 3) ?? [];
  const distance = store.distanceMeters !== null && origin ? formatDistance(store.distanceMeters) : null;

  return (
    <article className="min-w-0">
      {photos.length > 0 && (
        <div className="mb-3 flex h-24 gap-1 overflow-hidden rounded-2xl" aria-hidden="true">
          {photos.map((src) => <img key={src} src={src} alt="" loading="lazy" className="h-full min-w-0 flex-1 object-cover" />)}
        </div>
      )}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {extras?.badge && <div className="mb-1.5">{extras.badge}</div>}
          <button type="button" onClick={onOpenDetail} className="flex max-w-full items-center gap-0.5 text-start">
            <span className="truncate text-base font-extrabold text-text-primary">{storeDisplayName(store)}</span>
            <ChevronRight className="size-4 shrink-0 text-text-tertiary rtl:rotate-180" aria-hidden="true" />
          </button>
          <p className="mt-1 flex flex-wrap items-center gap-x-1 text-xs text-text-secondary">
            {rating !== null ? (
              <span className="inline-flex items-center gap-0.5">
                <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                <span className="sr-only">{tr({ ko: '별점', en: 'Rating', ar: 'التقييم', 'zh-CN': '评分', ja: '評価', 'zh-TW': '評分', es: 'Valoración' })}</span>
                <span className="font-bold text-text-primary">{rating.toFixed(1)}</span>
                <span>({reviewCount})</span>
              </span>
            ) : (
              <span>{tr({ ko: `후기 ${reviewCount}`, en: `${reviewCount} reviews`, ar: `${reviewCount} مراجعات`, 'zh-CN': `${reviewCount} 条评价`, ja: `口コミ${reviewCount}件`, 'zh-TW': `${reviewCount} 則評價`, es: `${reviewCount} reseñas` })}</span>
            )}
            {meta.map((item) => <span key={item}><span aria-hidden="true">· </span>{item}</span>)}
          </p>
          {distance && (
            <p className="mt-1 text-xs font-semibold text-brand-primary">
              {origin === 'current-location'
                ? tr({ ko: `내 위치에서 ${distance}`, en: `${distance} from you`, ar: `على بعد ${distance} منك`, 'zh-CN': `距你 ${distance}`, ja: `現在地から${distance}`, 'zh-TW': `距你 ${distance}`, es: `A ${distance} de ti` })
                : tr({ ko: `지도 중심에서 ${distance}`, en: `${distance} from map center`, ar: `على بعد ${distance} من مركز الخريطة`, 'zh-CN': `距地图中心 ${distance}`, ja: `地図の中心から${distance}`, 'zh-TW': `距地圖中心 ${distance}`, es: `A ${distance} del centro del mapa` })}
            </p>
          )}
          {extras?.hours && (
            <p className="mt-1 flex items-center gap-1 text-xs text-text-secondary">
              <Clock className="size-3.5 shrink-0" aria-hidden="true" />
              <span dir="ltr">{extras.hours}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleSave}
          aria-pressed={saved}
          aria-label={tr({ ko: '가게 저장', en: 'Save restaurant', ar: 'احفظ المطعم', 'zh-CN': '收藏餐厅', ja: 'お店を保存', 'zh-TW': '收藏餐廳', es: 'Guardar restaurante' })}
          className="-me-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-surface-subtle"
        >
          <Bookmark className={`size-5 ${saved ? 'fill-brand-primary text-brand-primary' : ''}`} />
        </button>
      </div>
      <button type="button" onClick={onScan} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-bold text-white">
        {extras?.primaryAction === 'menu' ? (
          <>
            <Utensils className="size-4" aria-hidden="true" />
            {t('내 프로필로 메뉴 보기', 'View menus for my profile', 'القائمة حسب ملفي')}
          </>
        ) : (
          <>
            <Camera className="size-4" aria-hidden="true" />
            {t('이 식당 메뉴 스캔', 'Scan this restaurant’s menu', 'امسح قائمة هذا المطعم')}
          </>
        )}
      </button>
    </article>
  );
}

interface MapStorePanelProps {
  language: Language;
  stores: StoreCandidate[];
  selectedId: number | null;
  /** 카드를 넘기면 그 가게 id, 목록으로 돌아가면 null */
  onSelect: (storeId: number | null) => void;
  origin: StoreSearchOrigin | null;
  /** 오류·빈 결과처럼 목록 대신 보여 줄 내용 */
  fallback?: ReactNode;
  /** 값이 생기면 목록 펼침(예: 이름 검색 시작) */
  expandSignal?: unknown;
  extras?: ExtrasLookup;
  /** 목록 맨 위 버튼 줄(정렬·음식 종류). 펼침 여부로 드롭다운 방향 결정. */
  toolbar?: (state: { expanded: boolean }) => ReactNode;
  /** 목록·카드 바로 위 지도 버튼(가운데: 이 지역에서 검색, 오른쪽: 내 주변) */
  mapControls?: { center?: ReactNode; end?: ReactNode };
  onOpenDetail: (store: StoreCandidate) => void;
  onScan: (store: StoreCandidate) => void;
}

/** 목록·카드 위 한 줄 [시작][가운데][끝]. 빈 곳은 지도로 누름 통과. */
function ControlRow({ start, center, end, className = '', style }: { start?: ReactNode; center?: ReactNode; end?: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div style={style} className={`pointer-events-none grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 ${className}`}>
      <div className="pointer-events-auto justify-self-start">{start}</div>
      <div className="pointer-events-auto">{center}</div>
      <div className="pointer-events-auto justify-self-end">{end}</div>
    </div>
  );
}

/**
 * 지도 아래 가게 영역.
 * - 선택 없음: 끌어 올리는 목록 시트(접힘/펼침).
 * - 선택 있음: 단일 카드. 옆으로 넘기면 주변 가게로 이동하고 지도 선택도 따라간다.
 */
export function MapStorePanel(props: MapStorePanelProps) {
  const { saved, toggle, snapshots, remember } = useSavedStores();
  const [savedOnly, setSavedOnly] = useState(false);
  useEffect(() => { remember(props.stores); }, [props.stores, remember]);
  const tr = (text: Parameters<typeof translateText>[1]) => translateText(props.language, text);
  const deviceNote = tr({ ko: '이 브라우저에만 저장돼요. 저장 당시 정보이며 다른 기기와 동기화되지 않아요.', en: 'Saved in this browser only. Details reflect when saved and do not sync across devices.', ar: 'محفوظة في هذا المتصفح فقط. المعلومات تعود لوقت الحفظ ولا تتزامن بين الأجهزة.', 'zh-CN': '仅保存在此浏览器中，为保存时的信息，不跨设备同步。', 'zh-TW': '僅儲存在此瀏覽器中，為儲存時的資訊，不跨裝置同步。', ja: 'このブラウザのみの保存です。保存時点の情報で、他の端末とは同期しません。', es: 'Guardado solo en este navegador, con los datos del momento de guardado. No se sincroniza entre dispositivos.' });
  const controls = <button type="button" onClick={() => setSavedOnly(!savedOnly)} aria-pressed={savedOnly} className="min-h-11 rounded-full border border-border-warm bg-surface-raised px-3 text-xs font-bold shadow-sm">{savedOnly ? tr({ ko: '검색 결과로', en: 'Search results', ar: 'نتائج البحث', 'zh-CN': '搜索结果', 'zh-TW': '搜尋結果', ja: '検索結果へ', es: 'Resultados' }) : tr({ ko: '이 기기에 저장한 가게', en: 'Saved on this device', ar: 'المحفوظة على هذا الجهاز', 'zh-CN': '本机收藏餐厅', 'zh-TW': '本機收藏餐廳', ja: 'この端末に保存した店', es: 'Guardados en este dispositivo' })} ({snapshots.filter(item => saved.includes(item.storeId)).length})</button>;
  if (savedOnly) return <><StoreListSheet {...props} stores={snapshots.filter(item => saved.includes(item.storeId))} selectedId={null} origin={null} expandSignal="saved" toolbar={() => <div className="space-y-2 px-4">{controls}<p className="text-xs text-text-secondary">{deviceNote}</p></div>} mapControls={undefined} fallback={snapshots.some(item => saved.includes(item.storeId)) ? undefined : <p className="p-4 text-sm">{tr({ ko: '저장한 가게가 없어요. 검색 결과의 북마크를 눌러 저장해 주세요.', en: 'No saved restaurants. Use the bookmark in search results.', ar: 'لا توجد مطاعم محفوظة. استخدم علامة الحفظ في نتائج البحث.', 'zh-CN': '还没有收藏的餐厅。请在搜索结果中点击收藏。', 'zh-TW': '尚未收藏餐廳。請在搜尋結果中點選收藏。', ja: '保存した店はありません。検索結果のブックマークから保存できます。', es: 'No hay restaurantes guardados. Usa el marcador en los resultados.' })}</p>} saved={saved} onToggleSave={toggle} /></>;
  const selected = props.selectedId === null ? null : props.stores.find((store) => store.storeId === props.selectedId) ?? null;
  return <>{selected
    ? <><div className="absolute end-3 top-28 z-40">{controls}</div><StoreCarousel {...props} selectedId={selected.storeId} saved={saved} onToggleSave={toggle} /></>
    : <StoreListSheet {...props} toolbar={state => <><div className="px-4 pb-2">{controls}</div>{props.toolbar?.(state)}</>} saved={saved} onToggleSave={toggle} />}</>;
}

function StoreListSheet({
  language,
  stores,
  origin,
  fallback,
  expandSignal,
  extras,
  toolbar,
  mapControls,
  saved,
  onToggleSave,
  onOpenDetail,
  onScan,
}: MapStorePanelProps & { saved: number[]; onToggleSave: (storeId: number) => void }) {
  const tr = (text: Parameters<typeof translateText>[1]) => translateText(language, text);
  const [expanded, setExpanded] = useState(false);
  const [drag, setDrag] = useState<{ startY: number; delta: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expandSignal) setExpanded(true);
  }, [expandSignal]);

  // 접을 때 목록 맨 위로. 접힌 동안 inert(화면 밖 카드 초점으로 화면이 밀리는 문제 방지).
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.inert = !expanded;
    if (!expanded) list.scrollTo({ top: 0 });
  }, [expanded]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ startY: event.clientY, delta: 0 });
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag) setDrag({ ...drag, delta: event.clientY - drag.startY });
  };
  const onPointerUp = () => {
    if (!drag) return;
    if (Math.abs(drag.delta) < 6) setExpanded(!expanded);
    else if (drag.delta < -40) setExpanded(true);
    else if (drag.delta > 40) setExpanded(false);
    setDrag(null);
  };

  const base = expanded ? '0px' : `calc(100% - ${PEEK_HEIGHT}px - env(safe-area-inset-bottom))`;
  const delta = drag ? Math.max(expanded ? 0 : -9999, drag.delta) : 0;
  const toggleLabel = expanded
    ? tr({ ko: '지도 보기', en: 'Show map', ar: 'عرض الخريطة', 'zh-CN': '查看地图', ja: '地図を見る', 'zh-TW': '查看地圖', es: 'Ver mapa' })
    : tr({ ko: '목록 보기', en: 'Show list', ar: 'عرض القائمة', 'zh-CN': '查看列表', ja: 'リストを見る', 'zh-TW': '查看列表', es: 'Ver lista' });

  return (
    <>
      {!expanded && !drag && (
        <ControlRow
          center={mapControls?.center}
          end={mapControls?.end}
          className="absolute inset-x-0 z-30"
          style={{ bottom: `calc(${PEEK_HEIGHT + 10}px + env(safe-area-inset-bottom))` }}
        />
      )}
      <section
        className="absolute inset-x-0 bottom-0 z-30 flex h-[calc(100dvh-112px)] flex-col rounded-t-[24px] border-t border-border-warm bg-rice-white shadow-[0_-8px_30px_rgba(35,42,37,.14)]"
        style={{ transform: `translateY(calc(${base} + ${delta}px))`, transition: drag ? 'none' : 'transform 220ms ease' }}
      >
        <div
          className="shrink-0 cursor-grab touch-none select-none px-4 pb-1 pt-2"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => setDrag(null)}
        >
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={toggleLabel}
            onClick={(event) => { if (event.detail === 0) setExpanded(!expanded); }}
            className="mx-auto flex h-5 w-16 items-center justify-center"
          >
            <span className="h-1 w-10 rounded-full bg-border-warm" />
          </button>
        </div>
        {toolbar && <div className="shrink-0 pb-2">{toolbar({ expanded })}</div>}
        <div ref={listRef} className={`min-h-0 flex-1 px-4 pb-[calc(72px+env(safe-area-inset-bottom))] ${expanded ? 'overflow-y-auto' : 'overflow-hidden'}`}>
          {fallback ?? (
            <ul className="divide-y divide-border-warm">
              {stores.map((store) => (
                <li key={store.storeId} className="py-4">
                  <StoreCard
                    language={language}
                    store={store}
                    extras={extras?.(store)}
                    origin={origin}
                    saved={saved.includes(store.storeId)}
                    onToggleSave={() => onToggleSave(store.storeId)}
                    onOpenDetail={() => onOpenDetail(store)}
                    onScan={() => onScan(store)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      {expanded && !drag && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="absolute bottom-[max(20px,env(safe-area-inset-bottom))] left-1/2 z-40 inline-flex min-h-11 -translate-x-1/2 items-center gap-1.5 rounded-full bg-soy-ink px-4 text-sm font-bold text-white shadow-lg"
        >
          <MapIcon className="size-4" aria-hidden="true" />
          {toggleLabel}
        </button>
      )}
    </>
  );
}

function StoreCarousel({
  language,
  stores,
  selectedId,
  onSelect,
  origin,
  extras,
  mapControls,
  saved,
  onToggleSave,
  onOpenDetail,
  onScan,
}: MapStorePanelProps & { selectedId: number; saved: number[]; onToggleSave: (storeId: number) => void }) {
  const tr = (text: Parameters<typeof translateText>[1]) => translateText(language, text);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<number, HTMLElement>());
  const settleTimer = useRef<number>();
  const firstScroll = useRef(true);

  // 같은 건물 가게가 이웃하도록 묶음 순서(묶음 안은 후보 순서).
  const ordered = useMemo(() => {
    const byId = new Map(stores.map((store) => [String(store.storeId), store]));
    return groupNearbyStores(stores.map((store) => ({ id: String(store.storeId), name: store.name, lat: store.latitude, lng: store.longitude })))
      .flat()
      .map((item) => byId.get(item.id)!);
  }, [stores]);

  // 넘기다 가운데 온 카드(카드 쪽 선택이라 다시 스크롤하지 않음).
  const fromSwipe = useRef<number | null>(null);
  const frame = useRef<number>();

  // 마커로 선택이 바뀌면 그 카드로 넘김.
  useEffect(() => {
    if (fromSwipe.current === selectedId) return;
    const card = cardRefs.current.get(selectedId);
    card?.scrollIntoView({ behavior: firstScroll.current ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    firstScroll.current = false;
  }, [selectedId]);

  useEffect(() => () => {
    window.clearTimeout(settleTimer.current);
    if (frame.current) cancelAnimationFrame(frame.current);
  }, []);

  const centeredCardId = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return null;
    const box = scroller.getBoundingClientRect();
    const middle = box.left + box.width / 2;
    let closest: { id: number; gap: number } | null = null as { id: number; gap: number } | null;
    cardRefs.current.forEach((card, id) => {
      const rect = card.getBoundingClientRect();
      const gap = Math.abs(rect.left + rect.width / 2 - middle);
      if (!closest || gap < closest.gap) closest = { id, gap };
    });
    return closest?.id ?? null;
  };

  // 사용자가 넘길 때만 가운데 카드 선택(마커 탭 뒤 부드러운 스크롤 중 지나가는 카드 제외).
  const userScrolling = useRef(false);
  const onScroll = () => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const id = centeredCardId();
      if (userScrolling.current && id !== null && id !== selectedId) {
        fromSwipe.current = id;
        onSelect(id);
      }
    });
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      userScrolling.current = false;
      const id = centeredCardId();
      if (id !== null && id !== selectedId) {
        fromSwipe.current = id;
        onSelect(id);
      }
    }, 150);
  };
  const markUserScroll = () => { userScrolling.current = true; };

  return (
    <section
      aria-label={tr({ ko: '주변 가게', en: 'Nearby restaurants', ar: 'مطاعم قريبة', 'zh-CN': '附近餐厅', ja: '近くのお店', 'zh-TW': '附近餐廳', es: 'Restaurantes cercanos' })}
      className="absolute inset-x-0 bottom-0 z-30 pb-[max(16px,env(safe-area-inset-bottom))]"
    >
      <ControlRow
        className="mb-2"
        start={(
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-label={tr({ ko: '목록 보기', en: 'Show list', ar: 'عرض القائمة', 'zh-CN': '查看列表', ja: 'リストを見る', 'zh-TW': '查看列表', es: 'Ver lista' })}
            className="flex size-11 items-center justify-center rounded-full border border-border-warm bg-rice-white text-text-primary shadow-md"
          >
            <List className="size-5" aria-hidden="true" />
          </button>
        )}
        center={mapControls?.center}
        end={mapControls?.end}
      />
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        onPointerDown={markUserScroll}
        onTouchStart={markUserScroll}
        onWheel={markUserScroll}
        onKeyDown={markUserScroll}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-[6%] pb-1 [scrollbar-width:none]"
      >
        {ordered.map((store) => (
          <div
            key={store.storeId}
            ref={(node) => { if (node) cardRefs.current.set(store.storeId, node); else cardRefs.current.delete(store.storeId); }}
            aria-current={store.storeId === selectedId ? 'true' : undefined}
            className="relative w-[88%] shrink-0 snap-center rounded-[22px] border border-border-warm bg-rice-white p-4 shadow-[0_14px_38px_rgba(35,42,37,.18)]"
          >
            <StoreCard
              language={language}
              store={store}
              extras={extras?.(store)}
              origin={origin}
              saved={saved.includes(store.storeId)}
              onToggleSave={() => onToggleSave(store.storeId)}
              onOpenDetail={() => onOpenDetail(store)}
              onScan={() => onScan(store)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

