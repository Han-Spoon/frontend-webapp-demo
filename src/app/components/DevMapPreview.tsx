import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { StoreCandidate } from '../../api/store';
import type { Language } from '../types';
import { isLanguage } from '../locales';
import { MAP_PREVIEW_CANDIDATES, MAP_PREVIEW_CENTER, MAP_PREVIEW_EXTRAS } from '../demo/mapPreviewStores';
import { BottomSheet } from './discovery/BottomSheet';
import { storeDisplayName } from './discovery/MapStorePanel';
import { StoreMapView } from './RestaurantMapScreen';

const noop = () => {};

function previewDistance(store: StoreCandidate, from: { latitude: number; longitude: number }) {
  const dLat = (store.latitude - from.latitude) * 111_320;
  const dLng = (store.longitude - from.longitude) * 111_320 * Math.cos((store.latitude * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

/** 개발 서버 전용. 실제 네이버 지도 + 가상 가게로 전체 지도 확인. */
export function DevMapPreview({ fallbackLanguage }: { fallbackLanguage: Language }) {
  const [searchParams] = useSearchParams();
  const requested = searchParams.get('lang');
  const language = isLanguage(requested) ? requested : fallbackLanguage;
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<StoreCandidate | null>(null);
  const [scanned, setScanned] = useState<StoreCandidate | null>(null);
  const [search, setSearch] = useState<{ location: { latitude: number; longitude: number }; origin: 'current-location' | 'map-center' }>({ location: MAP_PREVIEW_CENTER, origin: 'current-location' });

  useEffect(() => {
    const previous = { lang: document.documentElement.lang, dir: document.documentElement.dir };
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    return () => {
      document.documentElement.lang = previous.lang;
      document.documentElement.dir = previous.dir;
    };
  }, [language]);

  const candidates = query.trim()
    ? MAP_PREVIEW_CANDIDATES.filter((store) => store.name.includes(query.trim())).map((store) => ({ ...store, distanceMeters: null }))
    : MAP_PREVIEW_CANDIDATES.map((store) => ({ ...store, distanceMeters: previewDistance(store, search.location) }));

  return (
    <>
      <StoreMapView
        language={language}
        query={query}
        onQueryChange={setQuery}
        discovery={{
          candidates,
          error: false,
          isLoading: false,
          locationStatus: 'ready',
          retryLocation: noop,
          retrySearch: noop,
          searchAt: (location) => setSearch({ location, origin: 'map-center' }),
          searchAtCurrentLocation: () => setSearch({ location: MAP_PREVIEW_CENTER, origin: 'current-location' }),
          searchLocation: search.location,
          searchOrigin: search.origin,
        }}
        extras={(store) => MAP_PREVIEW_EXTRAS.get(store.storeId)}
        onOpenDetail={setDetail}
        onScan={setScanned}
      />
      {detail && (
        <BottomSheet language={language} title={storeDisplayName(detail)} description="가게 상세(미리보기) — 실제 화면에서는 후기 목록" onClose={() => setDetail(null)}>
          <p className="text-sm">storeId {detail.storeId}</p>
        </BottomSheet>
      )}
      {scanned && (
        <BottomSheet language={language} title={storeDisplayName(scanned)} description="메뉴 스캔(미리보기) — 실제 화면에서는 /scan 이동" onClose={() => setScanned(null)}>
          <p className="text-sm">storeId {scanned.storeId}</p>
        </BottomSheet>
      )}
    </>
  );
}
