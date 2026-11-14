import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { createTranslator, type Language } from '../../locales';
import { loadNaverMaps, onNaverMapsAuthFailure } from '../../../lib/naverMap';
import { useMapLanguage } from '../../../lib/mapLanguage';

export interface MapStore {
  id: string;
  /** 호출부에서 이미 현지화한 표시용 이름 */
  name: string;
  lat: number;
  lng: number;
}

export function StoreMap({
  language,
  stores,
  center,
  selectedId,
  onSelect,
  onCenterChange,
  fitStores = true,
  demoMode = false,
  className = 'h-56 w-full overflow-hidden rounded-2xl',
}: {
  language: Language;
  stores: MapStore[];
  /** 보통 사용자의 현재 위치. 없으면 첫 후보에 맞춘다. */
  center?: { lat: number; lng: number };
  selectedId?: string | null;
  onSelect?: (store: MapStore) => void;
  /** 사용자가 지도를 옮긴 뒤의 중심 좌표. 프로그램에 의한 이동에는 호출하지 않는다. */
  onCenterChange?: (center: { lat: number; lng: number }) => void;
  /** false이면 후보가 바뀌어도 사용자가 보고 있는 지도 영역을 유지한다. */
  fitStores?: boolean;
  /** 시연 모드에서는 외부 지도 키 없이 fixture 위치를 선택할 수 있는 개요를 그린다. */
  demoMode?: boolean;
  className?: string;
}) {
  const t = createTranslator(language);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const listenersRef = useRef<unknown[]>([]);
  const mapListenersRef = useRef<unknown[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // 지도 라벨 언어는 앱 언어가 아니라 사용자 설정(기본 한국어)을 따른다.
  // 설정이 바뀌면 SDK 를 다시 받아야 하므로 지도도 새로 만든다.
  const mapLanguage = useMapLanguage();

  // 콜백은 ref 로 넘겨 마커 재생성 없이 최신 값을 쓴다.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onCenterChangeRef = useRef(onCenterChange);
  onCenterChangeRef.current = onCenterChange;

  const clearMarkers = () => {
    // 인증 실패 시 SDK가 내부 객체를 먼저 폐기할 수 있다. 각 객체는 한 번만 정리한다.
    const listeners = listenersRef.current.splice(0);
    const markers = markersRef.current.splice(0);
    listeners.forEach((listener) => {
      try { window.naver?.maps?.Event?.removeListener(listener); } catch { /* SDK already disposed */ }
    });
    markers.forEach((marker) => {
      try { marker.setMap(null); } catch { /* SDK already disposed */ }
    });
  };

  const disposeMap = () => {
    clearMarkers();
    mapListenersRef.current.splice(0).forEach((listener) => {
      try { window.naver?.maps?.Event?.removeListener(listener); } catch { /* SDK already disposed */ }
    });
    const map = mapRef.current;
    mapRef.current = null;
    try { map?.destroy(); } catch { /* Authentication failure can invalidate the map. */ }
  };

  useEffect(() => {
    if (demoMode) return;
    let cancelled = false;
    setStatus('loading');

    // 키/도메인 문제는 스크립트 로드 성공 후에 드러난다. 별도 훅으로 받아 폴백으로 전환한다.
    const offAuthFailure = onNaverMapsAuthFailure(() => {
      if (!cancelled) {
        disposeMap();
        setStatus('error');
      }
    });

    loadNaverMaps(mapLanguage)
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const map = new naver.maps.Map(containerRef.current, {
          center: new naver.maps.LatLng(center?.lat ?? 37.5665, center?.lng ?? 126.978),
          zoom: 17,
          logoControl: true,
          mapDataControl: false,
          scaleControl: false,
          zoomControl: false,
        });
        mapRef.current = map;
        mapListenersRef.current.push(
          naver.maps.Event.addListener(map, 'dragend', () => {
            const nextCenter = map.getCenter();
            onCenterChangeRef.current?.({ lat: nextCenter.lat(), lng: nextCenter.lng() });
          }),
        );
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      offAuthFailure();
      disposeMap();
    };
    // 지도 생성 시 중심 좌표만 사용한다. 이후 변경은 아래 effect에서 필요한 경우에만 반영한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLanguage, demoMode]);

  // 현재 위치로 돌아가기처럼 호출부가 명시적으로 중심을 바꿀 때만 지도를 이동한다.
  // 사용자의 dragend가 전달한 좌표는 이미 지도 중심과 같으므로 재이동하지 않는다.
  useEffect(() => {
    const map = mapRef.current;
    if (status !== 'ready' || !map || !center) return;
    const current = map.getCenter();
    if (
      Math.abs(current.lat() - center.lat) > 0.000001 ||
      Math.abs(current.lng() - center.lng) > 0.000001
    ) {
      map.setCenter(new naver.maps.LatLng(center.lat, center.lng));
    }
  }, [center?.lat, center?.lng, status]);

  // 후보가 바뀌면 마커를 다시 그린다.
  const storeKey = useMemo(() => stores.map((s) => s.id).join('|'), [stores]);

  useEffect(() => {
    const map = mapRef.current;
    if (status !== 'ready' || !map) return;

    clearMarkers();
    try {
      const bounds = new naver.maps.LatLngBounds();
      stores.forEach((store) => {
        const position = new naver.maps.LatLng(store.lat, store.lng);
        bounds.extend(position);
        const marker = new naver.maps.Marker({
          position,
          map,
          title: store.name,
          icon: { content: markerHtml(store.name, store.id === selectedId) },
        });
        listenersRef.current.push(
          naver.maps.Event.addListener(marker, 'click', () => onSelectRef.current?.(store)),
        );
        markersRef.current.push(marker);
      });

      if (fitStores) {
        if (center) bounds.extend(new naver.maps.LatLng(center.lat, center.lng));
        if (stores.length > 0) map.fitBounds(bounds, 48);
        else if (center) { map.setCenter(new naver.maps.LatLng(center.lat, center.lng)); map.setZoom(15); }
      }
    } catch {
      disposeMap();
      setStatus('error');
    }
  }, [fitStores, storeKey, selectedId, status, center, stores]);

  // key 를 달아 에러/지도 전환 시 DOM 을 새로 만든다.
  // 같은 div 를 재사용하면 네이버가 컨테이너에 직접 주입한 노드(에러 화면·타일)가 남아 겹친다.
  if (demoMode) {
    return <DemoStoreMap language={language} stores={stores} selectedId={selectedId} onSelect={onSelect} className={className} />;
  }

  if (status === 'error') {
    return (
      <div
        key="store-map-error"
        role="status"
        className={`${className} flex items-center justify-center bg-surface-subtle px-4 text-center text-xs text-text-secondary`}
      >
        {t(
          '지도를 불러오지 못했어요. 아래 목록에서 찾아주세요.',
          'Map unavailable — pick from the list below.',
          'تعذر تحميل الخريطة. اختر من القائمة أدناه.',
        )}
      </div>
    );
  }

  return <div key="store-map" ref={containerRef} className={className} aria-busy={status === 'loading'} />;
}

function DemoStoreMap({ language, stores, selectedId, onSelect, className }: {
  language: Language;
  stores: MapStore[];
  selectedId?: string | null;
  onSelect?: (store: MapStore) => void;
  className: string;
}) {
  const t = createTranslator(language);
  const coordinates = useMemo(() => {
    const latitudes = stores.map(store => store.lat);
    const longitudes = stores.map(store => store.lng);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    const latSpan = Math.max(maxLat - minLat, 0.0005);
    const lngSpan = Math.max(maxLng - minLng, 0.0005);
    return stores.map((store, index) => ({
      store,
      x: stores.length === 1 ? 50 : 50 + ((store.lng - (minLng + maxLng) / 2) / lngSpan) * 55 + (index % 2 ? 2 : -2),
      y: stores.length === 1 ? 50 : 48 - ((store.lat - (minLat + maxLat) / 2) / latSpan) * 42 + (index % 3 - 1) * 2,
    }));
  }, [stores]);

  return <div className={`${className} relative isolate overflow-hidden bg-[#dce9df]`} role="group" aria-label={t('시연용 식당 위치 개요', 'Demo restaurant location overview', 'نظرة عامة على مواقع المطاعم التجريبية')}>
    <div className="absolute inset-0" aria-hidden="true" style={{ backgroundImage: 'linear-gradient(26deg, transparent 46%, #f9f7ed 46%, #f9f7ed 50%, transparent 50%), linear-gradient(111deg, transparent 44%, #f9f7ed 44%, #f9f7ed 49%, transparent 49%), linear-gradient(90deg, transparent 68%, #c8dece 68%, #c8dece 71%, transparent 71%)', backgroundSize: '140px 120px, 170px 130px, 100% 100%' }} />
    <span className="absolute start-3 top-3 z-10 rounded-full bg-rice-white/90 px-3 py-1.5 text-[10px] font-bold text-brand-green-900 shadow-sm">{t('시연용 위치 개요', 'Demo location overview', 'خريطة مواقع تجريبية')}</span>
    {coordinates.map(({ store, x, y }) => <button key={store.id} type="button" disabled={!onSelect} onClick={() => onSelect?.(store)} aria-pressed={store.id === selectedId} aria-label={store.name} className={`absolute z-10 flex max-w-[120px] -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full px-2.5 py-2 text-[10px] font-extrabold shadow-md ${store.id === selectedId ? 'bg-brand-primary text-white' : 'bg-rice-white text-soy-ink'}`} style={{ left: `${Math.min(85, Math.max(15, x))}%`, top: `${Math.min(73, Math.max(28, y))}%` }}>
      <MapPin className="size-3 shrink-0" aria-hidden="true" /><span className="truncate">{store.name}</span>
    </button>)}
  </div>;
}

/** 마커 라벨은 우리 데이터라 사용자 언어로 그대로 렌더링한다(지도 라벨과 별개). */
function markerHtml(name: string, selected: boolean) {
  const safe = name.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  const tone = selected ? 'background:#B45309;color:#fff' : 'background:#fff;color:#1F2937';
  return (
    `<div style="${tone};border:1px solid rgba(0,0,0,.12);border-radius:999px;` +
    `padding:4px 10px;font-size:12px;font-weight:600;white-space:nowrap;` +
    `box-shadow:0 1px 4px rgba(0,0,0,.18);transform:translate(-50%,-130%)">${safe}</div>`
  );
}
