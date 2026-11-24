import { useState } from 'react';
import type { StoreCandidate } from '../../../api/store';
import type { Language } from '../../types';
import { RESTAURANTS, restaurantsInArea, type Restaurant } from '../../demo/restaurants';
import { localizeMenuText } from '../../results/resultViewModel';
import { translateText } from '../../locales';
import { useStoreCandidates } from '../../hooks/useStoreCandidates';
import { EmptyState, ErrorState, HsButton, HsIcon, HsLinkButton, HsSheet, SearchField, SkeletonCard, StoreCard, districtOf, tx, type AllText } from '../hs';
import { FOOD_CATEGORY_LABELS, foodCategoryOf } from './foodCategories';
import { StoreMap } from './StoreMap';

interface RestaurantPickerProps {
  language: Language;
  demoMode: boolean;
  selectedId?: string | null;
  selectedStore?: StoreCandidate | null;
  selectedStoreId?: number | null;
  onSelectDemo?: (restaurant: Restaurant | null) => void;
  onSelectStore?: (store: StoreCandidate | null) => void;
  onClose: () => void;
  /** 예전 [식당 없이 계속하기] 버튼. 새 디자인은 닫기가 곧 식당 없이 계속이라 쓰지 않는다. */
  allowSkip?: boolean;
}

const P = {
  title: { ko: '어느 식당에 계세요?', en: 'Where are you dining?', ar: 'أين تتناول الطعام؟', 'zh-CN': '你在哪家餐厅？', ja: 'どのお店にいますか？', 'zh-TW': '你在哪家餐廳？', es: '¿En qué restaurante estás?' },
  why: { ko: '식당을 연결하면 오늘의 메뉴를 방문 기록으로 모을 수 있어요. 안 골라도 돼요.', en: 'Link a restaurant to keep today’s menu in your visit history. You can skip this.', ar: 'اربط مطعمًا لحفظ قائمة اليوم في سجل زياراتك. يمكنك تخطي ذلك.', 'zh-CN': '关联餐厅后，可以把今天的菜单存入到访记录。不选也可以。', ja: 'お店をつなぐと、今日のメニューを訪問記録にまとめられます。選ばなくても大丈夫です。', 'zh-TW': '連結餐廳後，可以把今天的菜單存入造訪紀錄。不選也可以。', es: 'Vincula un restaurante para guardar el menú de hoy en tus visitas. Puedes omitirlo.' },
  search: { ko: '식당 이름으로 검색', en: 'Search by restaurant name', ar: 'ابحث باسم المطعم', 'zh-CN': '按餐厅名称搜索', ja: 'お店の名前で検索', 'zh-TW': '依餐廳名稱搜尋', es: 'Buscar por nombre' },
  nearby: { ko: '현재 위치 주변', en: 'Near you', ar: 'بالقرب منك', 'zh-CN': '当前位置附近', ja: '現在地の周辺', 'zh-TW': '目前位置附近', es: 'Cerca de ti' },
  results: { ko: '이름 검색 결과', en: 'Search results', ar: 'نتائج البحث', 'zh-CN': '搜索结果', ja: '検索結果', 'zh-TW': '搜尋結果', es: 'Resultados' },
  showMap: { ko: '지도로 보기', en: 'Show map', ar: 'عرض الخريطة', 'zh-CN': '在地图上查看', ja: '地図で見る', 'zh-TW': '在地圖上查看', es: 'Ver mapa' },
  listOnly: { ko: '목록만 보기', en: 'List only', ar: 'القائمة فقط', 'zh-CN': '只看列表', ja: 'リストだけ見る', 'zh-TW': '只看列表', es: 'Solo lista' },
  locating: { ko: '현재 위치를 확인하고 있어요', en: 'Finding your location…', ar: 'جارٍ تحديد موقعك…', 'zh-CN': '正在确认当前位置', ja: '現在地を確認しています', 'zh-TW': '正在確認目前位置', es: 'Buscando tu ubicación…' },
  needLocation: { ko: '주변 식당을 찾으려면 위치 권한이 필요해요', en: 'Location access is needed to find nearby restaurants', ar: 'يلزم إذن الموقع للعثور على المطاعم القريبة', 'zh-CN': '需要位置权限才能查找附近餐厅', ja: '近くのお店を探すには位置情報の許可が必要です', 'zh-TW': '需要位置權限才能尋找附近餐廳', es: 'Necesitamos tu ubicación para buscar restaurantes cercanos' },
  needLocationHint: { ko: '이름으로 검색하거나, 닫고 식당 없이 계속할 수 있어요.', en: 'Search by name, or close this to continue without a restaurant.', ar: 'ابحث بالاسم، أو أغلق هذه النافذة للمتابعة بدون مطعم.', 'zh-CN': '可以按名称搜索，或关闭后不选餐厅继续。', ja: '名前で検索するか、閉じてお店なしで続けられます。', 'zh-TW': '可以依名稱搜尋，或關閉後不選餐廳繼續。', es: 'Busca por nombre o cierra esto para seguir sin restaurante.' },
  retryLocation: { ko: '위치 다시 확인', en: 'Try location again', ar: 'إعادة تحديد الموقع', 'zh-CN': '重新确认位置', ja: '位置をもう一度確認', 'zh-TW': '重新確認位置', es: 'Reintentar ubicación' },
  loadFailed: { ko: '식당 목록을 불러오지 못했어요', en: 'Couldn’t load restaurants', ar: 'تعذر تحميل المطاعم', 'zh-CN': '无法加载餐厅列表', ja: 'お店の一覧を読み込めませんでした', 'zh-TW': '無法載入餐廳列表', es: 'No pudimos cargar los restaurantes' },
  noMatch: { ko: '검색된 식당이 없어요', en: 'No restaurant matched', ar: 'لم يتم العثور على مطعم', 'zh-CN': '没有找到餐厅', ja: '見つかったお店はありません', 'zh-TW': '沒有找到餐廳', es: 'Ningún restaurante coincide' },
  noMatchHint: { ko: '다른 이름으로 찾아보거나, 닫고 식당 없이 계속하세요.', en: 'Try another name, or close this to continue without a restaurant.', ar: 'جرّب اسمًا آخر، أو أغلق للمتابعة بدون مطعم.', 'zh-CN': '换个名称试试，或关闭后不选餐厅继续。', ja: '別の名前で探すか、閉じてお店なしで続けてください。', 'zh-TW': '換個名稱試試，或關閉後不選餐廳繼續。', es: 'Prueba otro nombre o cierra para seguir sin restaurante.' },
  noNearby: { ko: '주변에 등록된 식당이 아직 없어요', en: 'No registered restaurants nearby yet', ar: 'لا توجد مطاعم مسجلة بالقرب منك بعد', 'zh-CN': '附近还没有登记的餐厅', ja: '近くに登録されたお店はまだありません', 'zh-TW': '附近還沒有登記的餐廳', es: 'Aún no hay restaurantes registrados cerca' },
  clear: { ko: '연결 해제', en: 'Unlink', ar: 'إلغاء الربط', 'zh-CN': '取消关联', ja: '連携を解除', 'zh-TW': '取消連結', es: 'Desvincular' },
} satisfies Record<string, AllText>;

const categoryText = (store: { categoryCode?: string | null; categoryName?: string | null }, language: Language) => {
  const category = foodCategoryOf(store);
  return category !== 'other' ? translateText(language, FOOD_CATEGORY_LABELS[category]) : language === 'ko' ? store.categoryName?.trim() || null : null;
};

/** 머리 아래 안내 + 검색 + '현재 위치 주변' 줄(지도 전환) */
function PickerHeader({ language, query, setQuery, searching, showMap, setShowMap, canMap }: { language: Language; query: string; setQuery: (value: string) => void; searching: boolean; showMap: boolean; setShowMap: (value: boolean) => void; canMap: boolean }) {
  return (
    <>
      <p className="-mt-1 text-[13px] leading-[1.5] font-semibold text-hs-ink-500">{tx(language, P.why)}</p>
      <SearchField className="mt-4" language={language} label={tx(language, P.search)} placeholder={tx(language, P.search)} value={query} onChange={setQuery} autoComplete="off" />
      <div className="mt-4 mb-2 flex min-h-11 items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[14px] font-black text-hs-ink-900">
          <HsIcon name={searching ? 'search' : 'pin'} size={16} strokeWidth={2.4} className="text-hs-brand-700" />
          {tx(language, searching ? P.results : P.nearby)}
        </p>
        {canMap && (
          <HsLinkButton tone="brand" aria-pressed={showMap} onClick={() => setShowMap(!showMap)}>
            <HsIcon name={showMap ? 'cards' : 'pin'} size={15} strokeWidth={2.4} />
            {tx(language, showMap ? P.listOnly : P.showMap)}
          </HsLinkButton>
        )}
      </div>
    </>
  );
}

export function RestaurantPicker(props: RestaurantPickerProps) {
  return props.demoMode ? <DemoRestaurantPicker {...props} /> : <LiveRestaurantPicker {...props} />;
}

/** 시연: 고정 식당 목록(가까운 지역) + 이름 · 주소 검색 */
function DemoRestaurantPicker({ language, selectedId, onSelectDemo, onClose }: RestaurantPickerProps) {
  const [query, setQuery] = useState('');
  const [showMap, setShowMap] = useState(false);
  const q = query.trim().toLocaleLowerCase();
  const candidates = q
    ? RESTAURANTS.filter((r) => `${Object.values(r.name).join(' ')} ${r.address}`.toLocaleLowerCase().includes(q))
    : restaurantsInArea('nearby');
  const select = (restaurant: Restaurant) => onSelectDemo?.(selectedId === restaurant.id ? null : restaurant);
  return (
    <HsSheet language={language} onClose={onClose} title={tx(language, P.title)}>
      <PickerHeader language={language} query={query} setQuery={setQuery} searching={Boolean(q)} showMap={showMap} setShowMap={setShowMap} canMap={candidates.length > 0} />
      {showMap && candidates.length > 0 && (
        <StoreMap
          language={language}
          className="mb-3 h-52 w-full overflow-hidden rounded-hs-xl"
          stores={candidates.map((r) => ({ id: r.id, name: localizeMenuText(r.name, language), lat: r.lat, lng: r.lng }))}
          selectedId={selectedId}
          onSelect={(store) => { const picked = candidates.find((r) => r.id === store.id); if (picked) select(picked); }}
        />
      )}
      {candidates.length === 0 ? (
        <EmptyState icon="search" title={tx(language, P.noMatch)} description={tx(language, P.noMatchHint)} />
      ) : (
        <div className="space-y-2">
          {candidates.map((r) => (
            <PickerCard key={r.id} language={language} name={localizeMenuText(r.name, language)} district={districtOf(r.address)} category={localizeMenuText(r.category, language)} distanceMeters={null} selected={selectedId === r.id} onClick={() => select(r)} />
          ))}
        </div>
      )}
    </HsSheet>
  );
}

/** 운영: 가게 후보 API(현재 위치 주변 · 이름 검색) */
function LiveRestaurantPicker({ language, selectedStore, selectedStoreId, onSelectStore, onClose }: RestaurantPickerProps) {
  const selectedId = selectedStore?.storeId ?? selectedStoreId ?? null;
  const [query, setQuery] = useState('');
  const [showMap, setShowMap] = useState(false);
  const { candidates, error, isLoading, location, locationStatus, retryLocation } = useStoreCandidates(query);
  const searching = Boolean(query.trim());
  const storeName = (store: StoreCandidate) => (store.branchName ? `${store.name} ${store.branchName}` : store.name);
  const select = (store: StoreCandidate) => onSelectStore?.(selectedId === store.storeId ? null : store);
  const ready = locationStatus === 'ready' || searching;

  return (
    <HsSheet language={language} onClose={onClose} title={tx(language, P.title)}>
      <PickerHeader language={language} query={query} setQuery={setQuery} searching={searching} showMap={showMap} setShowMap={setShowMap} canMap={ready && candidates.length > 0} />

      {!searching && locationStatus === 'loading' && (
        <div role="status" className="space-y-2">
          <p className="text-[13px] font-bold text-hs-ink-500">{tx(language, P.locating)}</p>
          <SkeletonCard language={language} />
          <SkeletonCard language={language} />
        </div>
      )}

      {!searching && (locationStatus === 'denied' || locationStatus === 'unsupported') && (
        <div role="alert" className="rounded-3xl border-[1.5px] border-dashed border-hs-line-dash px-5 py-6 text-center">
          <HsIcon name="pin" size={24} className="mx-auto text-hs-brand-700" />
          <p className="mt-2 text-[15px] font-black text-hs-ink-900">{tx(language, P.needLocation)}</p>
          <p className="mt-1 text-[13px] font-semibold text-hs-ink-500">{tx(language, P.needLocationHint)}</p>
          {locationStatus === 'denied' && <HsButton variant="outline" size="md" className="mt-4" icon="pin" onClick={retryLocation}>{tx(language, P.retryLocation)}</HsButton>}
        </div>
      )}

      {ready && (
        <>
          {showMap && candidates.length > 0 && (
            <StoreMap
              language={language}
              className="mb-3 h-52 w-full overflow-hidden rounded-hs-xl"
              stores={candidates.map((store) => ({ id: String(store.storeId), name: storeName(store), lat: store.latitude, lng: store.longitude }))}
              center={location ? { lat: location.latitude, lng: location.longitude } : candidates[0] ? { lat: candidates[0].latitude, lng: candidates[0].longitude } : undefined}
              selectedId={selectedId === null ? null : String(selectedId)}
              onSelect={(mapStore) => { const picked = candidates.find((store) => String(store.storeId) === mapStore.id); if (picked) select(picked); }}
            />
          )}
          {isLoading ? (
            <div role="status" className="space-y-2"><SkeletonCard language={language} /><SkeletonCard language={language} /></div>
          ) : error ? (
            <ErrorState language={language} title={tx(language, P.loadFailed)} onRetry={searching ? undefined : retryLocation} />
          ) : candidates.length === 0 ? (
            <EmptyState icon="search" title={tx(language, searching ? P.noMatch : P.noNearby)} description={tx(language, P.noMatchHint)} />
          ) : (
            <div className="space-y-2">
              {candidates.map((store) => (
                <PickerCard
                  key={store.storeId}
                  language={language}
                  name={storeName(store)}
                  reviewCount={store.reviewCount}
                  district={districtOf(store.roadAddress)}
                  category={categoryText(store, language)}
                  distanceMeters={store.distanceMeters}
                  selected={selectedId === store.storeId}
                  onClick={() => select(store)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </HsSheet>
  );
}

/** 가게 카드(흐름 2 형식). 고른 가게는 민트 바탕 + ✓, 다시 누르면 연결 해제. */
function PickerCard({ language, name, reviewCount, district, category, distanceMeters, selected, onClick }: { language: Language; name: string; reviewCount?: number; district: string | null; category: string | null; distanceMeters: number | null; selected: boolean; onClick: () => void }) {
  return (
    <div className="relative">
      <StoreCard
        language={language}
        name={name}
        reviewCount={reviewCount}
        district={district ?? undefined}
        category={category ?? undefined}
        distanceMeters={distanceMeters ?? undefined}
        selected={selected}
        onClick={onClick}
        className={selected ? 'bg-hs-mint-100 pe-12' : ''}
      />
      {selected && (
        <span className="pointer-events-none absolute end-4 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-hs-pill bg-hs-brand-700 text-hs-surface-0">
          <HsIcon name="check" size={14} strokeWidth={3} label={tx(language, P.clear)} />
        </span>
      )}
    </div>
  );
}
