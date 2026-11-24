import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { StoreCandidate } from '../../api/store';
import type { Language } from '../types';
import { isLanguage } from '../locales';
import { MAP_PREVIEW_CANDIDATES, MAP_PREVIEW_CENTER } from '../demo/mapPreviewStores';
import { useToast } from './hs';
import { storeDisplayName } from './map/savedStores';
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
  const toast = useToast();
  // ?location=denied: 위치 권한이 없는 첫 화면(F2-07) 확인용
  const [search, setSearch] = useState<{ location: { latitude: number; longitude: number }; origin: 'current-location' | 'map-center' } | null>(
    () => searchParams.get('location') === 'denied' ? null : { location: MAP_PREVIEW_CENTER, origin: 'current-location' },
  );

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
    : search ? MAP_PREVIEW_CANDIDATES.map((store) => ({ ...store, distanceMeters: previewDistance(store, search.location) })) : [];

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
          locationStatus: search ? 'ready' : 'denied',
          retryLocation: () => setSearch({ location: MAP_PREVIEW_CENTER, origin: 'current-location' }),
          retrySearch: noop,
          searchAt: (location) => setSearch({ location, origin: 'map-center' }),
          searchAtCurrentLocation: () => setSearch({ location: MAP_PREVIEW_CENTER, origin: 'current-location' }),
          searchLocation: search?.location ?? null,
          searchOrigin: search?.origin ?? 'current-location',
        }}
        onScan={(store) => toast.show(`메뉴 스캔(미리보기): ${storeDisplayName(store)}`)}
      />
    </>
  );
}
