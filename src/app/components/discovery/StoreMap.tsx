import { useEffect, useMemo, useRef, useState } from 'react';
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
  demoInsets,
  focusOffsetY = 0,
  className = 'h-56 w-full overflow-hidden rounded-2xl',
}: {
  language: Language;
  stores: MapStore[];
  /** 보통 사용자 현재 위치. 없으면 첫 후보 기준. */
  center?: { lat: number; lng: number };
  selectedId?: string | null;
  onSelect?: (store: MapStore) => void;
  /** 사용자가 옮긴 뒤 중심 좌표(프로그램 이동에는 호출 안 함) */
  onCenterChange?: (center: { lat: number; lng: number }) => void;
  /** false면 후보가 바뀌어도 보던 지도 영역 유지 */
  fitStores?: boolean;
  /** 시연 모드: 지도 키 없이 fixture 위치 개요 */
  demoMode?: boolean;
  /** 시연 개요에서 위(검색창)·아래(카드)가 가리는 높이(px). 안내 칩·핀은 그 사이에만. */
  demoInsets?: { top: number; bottom: number };
  /** 중심 좌표를 지도 가운데보다 이만큼(px) 위에 보이게(아래 시트에 가리지 않게) */
  focusOffsetY?: number;
  className?: string;
}) {
  const t = createTranslator(language);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const placementsRef = useRef<Placement[]>([]);
  const listenersRef = useRef<unknown[]>([]);
  const mapListenersRef = useRef<unknown[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // 지도 라벨 언어는 앱 언어가 아닌 사용자 설정. 바뀌면 SDK 재로드라 지도도 새로 생성.
  const mapLanguage = useMapLanguage();

  // 콜백은 ref로(마커 재생성 없이 최신 값).
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onCenterChangeRef = useRef(onCenterChange);
  // 사용자가 끌어 놓은 중심. 호출부가 이 좌표를 그대로 돌려주면 다시 옮기지 않는다.
  const draggedCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  onCenterChangeRef.current = onCenterChange;

  const clearMarkers = () => {
    // 인증 실패 시 SDK가 내부 객체를 먼저 폐기할 수 있어 객체마다 한 번만 정리.
    const listeners = listenersRef.current.splice(0);
    const markers = markersRef.current.splice(0);
    placementsRef.current = [];
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

    // 키·도메인 문제는 스크립트 로드 성공 뒤 드러나 별도 훅으로 받아 폴백.
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
            draggedCenterRef.current = { lat: nextCenter.lat(), lng: nextCenter.lng() };
            onCenterChangeRef.current?.(draggedCenterRef.current);
          }),
          naver.maps.Event.addListener(map, 'idle', () => layoutLabelsRef.current()),
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
    // 중심 좌표는 지도 생성 때만. 이후 변경은 아래 effect.
  }, [mapLanguage, demoMode]);

  // 호출부가 중심을 바꿀 때만 이동(사용자 dragend 좌표는 이미 지도 중심이라 제외).
  useEffect(() => {
    const map = mapRef.current;
    if (status !== 'ready' || !map || !center) return;
    const dragged = draggedCenterRef.current;
    if (dragged && dragged.lat === center.lat && dragged.lng === center.lng) return;
    const current = map.getCenter();
    if (
      focusOffsetY !== 0 ||
      Math.abs(current.lat() - center.lat) > 0.000001 ||
      Math.abs(current.lng() - center.lng) > 0.000001
    ) {
      map.setCenter(new naver.maps.LatLng(center.lat, center.lng));
      if (focusOffsetY) map.panBy(new naver.maps.Point(0, focusOffsetY));
    }
  }, [center?.lat, center?.lng, status, focusOffsetY]);

  // 이름표 배치. 지도 이동·확대가 끝난(idle) 뒤에만 다시 계산.
  const layoutLabels = () => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const projection = map.getProjection();
      const items = placementsRef.current.map((item) => {
        const point = projection.fromCoordToOffset(item.position);
        return { item, x: point.x, y: point.y };
      });
      const pins = items.map(({ item, x, y }) => (item.selected ? null : pinBox(x, y)));
      // 선택 가게 말풍선 먼저.
      const placed: Box[] = items.filter(({ item }) => item.selected).map(({ item, x, y }) => selectedBox(x, y, item.selectedWidth));
      // 우선순위: 선택 > 후보 순서(검증 가게 먼저)
      items.forEach(({ item, x, y }, index) => {
        if (item.selected) return;
        const box = nameBox(x, y, item.nameWidth, item.nameLines);
        const free =
          !placed.some((other) => overlaps(box, other)) &&
          !pins.some((pin, other) => other !== index && pin !== null && overlaps(box, pin));
        if (free) placed.push(box);
        const mode = free ? 'label' : 'dot';
        if (mode === item.mode) return;
        item.mode = mode;
        item.marker.setIcon({ content: mode === 'label' ? item.labelHtml : item.pinHtml, anchor: new naver.maps.Point(0, 0) });
        item.marker.setZIndex(mode === 'label' ? 100 : 10);
      });
    } catch { /* 인증 실패 등으로 지도가 폐기된 경우 */ }
  };
  const layoutLabelsRef = useRef(layoutLabels);
  layoutLabelsRef.current = layoutLabels;

  // 후보가 바뀌면 마커 다시 그림.
  const storeKey = useMemo(() => stores.map((s) => s.id).join('|'), [stores]);

  useEffect(() => {
    const map = mapRef.current;
    if (status !== 'ready' || !map) return;

    clearMarkers();
    try {
      const bounds = new naver.maps.LatLngBounds();
      groupNearbyStores(stores, selectedId).forEach((group) => {
        const lead = group.find((store) => store.id === selectedId) ?? group[0];
        const selected = lead.id === selectedId;
        const position = new naver.maps.LatLng(lead.lat, lead.lng);
        bounds.extend(position);
        const pinHtml = markerPinHtml(group.length);
        const marker = new naver.maps.Marker({
          position,
          map,
          title: group.map((store) => store.name).join(', '),
          icon: { content: selected ? markerSelectedHtml(lead.name, group.length - 1) : pinHtml, anchor: new naver.maps.Point(0, 0) },
          zIndex: selected ? 1000 : 10,
        });
        // 같은 건물 묶음은 누를 때마다 다음 가게.
        listenersRef.current.push(
          naver.maps.Event.addListener(marker, 'click', () => {
            const index = group.findIndex((store) => store.id === selectedId);
            onSelectRef.current?.(group[(index + 1) % group.length]);
          }),
        );
        markersRef.current.push(marker);
        const name = measureName(lead.name);
        placementsRef.current.push({
          marker,
          position,
          selected,
          mode: 'dot',
          pinHtml,
          labelHtml: markerLabelHtml(lead.name, group.length),
          nameWidth: name.width,
          nameLines: name.lines,
          selectedWidth: selectedWidth(lead.name, group.length - 1),
        });
      });

      if (fitStores) {
        if (center) bounds.extend(new naver.maps.LatLng(center.lat, center.lng));
        if (stores.length > 0) map.fitBounds(bounds, 48);
        else if (center) { map.setCenter(new naver.maps.LatLng(center.lat, center.lng)); map.setZoom(15); }
      }
      layoutLabelsRef.current();
    } catch {
      disposeMap();
      setStatus('error');
    }
  }, [fitStores, storeKey, selectedId, status, center, stores]);

  // key로 에러·지도 전환 시 DOM 새로 생성(네이버가 넣은 에러 화면·타일 겹침 방지).
  if (demoMode) {
    return <DemoStoreMap language={language} stores={stores} selectedId={selectedId} onSelect={onSelect} insets={demoInsets} className={className} />;
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

/** 개요 핀 세로 위치. 기본 28–73%, 가리는 높이가 있으면 그 사이에 같은 비율. */
function demoPinTop(y: number, insets?: { top: number; bottom: number }) {
  const percent = Math.min(73, Math.max(28, y));
  if (!insets) return `${percent}%`;
  const top = insets.top + 48;
  return `calc(${top}px + (100% - ${top + insets.bottom}px) * ${((percent - 28) / 45).toFixed(3)})`;
}

function DemoStoreMap({ language, stores, selectedId, onSelect, insets, className }: {
  insets?: { top: number; bottom: number };
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

  return <div className={`${className} relative isolate overflow-hidden bg-[#EEF3F0]`} role="group" aria-label={t('시연용 식당 위치 개요', 'Demo restaurant location overview', 'نظرة عامة على مواقع المطاعم التجريبية')}>
    {/* 강 · 공원 · 길(디자인 보드의 지도 그림) */}
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute -inset-x-10 top-[30%] h-[70px] -rotate-12 bg-[#DCEBF5]" />
      <div className="absolute end-[3%] top-[15%] h-[110px] w-[150px] rounded-[40px] bg-[#D4ECDF]" />
      <div className="absolute start-[5%] top-[52%] h-[90px] w-[120px] rounded-[36px] bg-[#D4ECDF]" />
      <div className="absolute -inset-x-10 top-[20%] h-3.5 -rotate-12 bg-white" />
      <div className="absolute -inset-x-10 top-[47%] h-3 rotate-6 bg-white" />
      <div className="absolute -inset-x-10 top-[68%] h-2.5 -rotate-3 bg-white" />
      <div className="absolute -inset-y-10 start-[31%] w-3 rotate-[10deg] bg-white" />
      <div className="absolute -inset-y-10 start-[72%] w-2.5 -rotate-6 bg-white" />
    </div>
    <span style={{ top: (insets?.top ?? 0) + 8 }} className="absolute end-3 z-10 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-hs-ink-500 shadow-sm">{t('시연용 위치 개요', 'Demo location overview', 'خريطة مواقع تجريبية')}</span>
    {coordinates.map(({ store, x, y }) => {
      const selected = store.id === selectedId;
      // 버튼 = 핀 자리(22px, 좌표가 가운데). 이름표 · 선택 말풍선은 그 위아래로.
      return <button key={store.id} type="button" disabled={!onSelect} onClick={() => onSelect?.(store)} aria-pressed={selected} aria-label={store.name} className={`absolute size-[22px] -translate-x-1/2 -translate-y-1/2 ${selected ? 'z-20' : 'z-10'}`} style={{ left: `${Math.min(85, Math.max(15, x))}%`, top: demoPinTop(y, insets) }}>
        {selected ? <>
          <span dir="auto" className="absolute bottom-[calc(50%+8px)] left-1/2 flex h-8 -translate-x-1/2 items-center whitespace-nowrap rounded-full bg-hs-pin-selected px-3.5 text-[14px] font-extrabold text-white shadow-[0_4px_12px_rgba(0,0,0,.25)]">{store.name}</span>
          <span className="absolute bottom-1/2 left-1/2 -ms-[7px] border-x-[7px] border-t-[9px] border-x-transparent border-t-hs-pin-selected" />
        </> : <>
          <span className="flex size-[22px] items-center justify-center rounded-full border-2 border-white bg-hs-pin-default shadow-[0_1px_4px_rgba(0,0,0,.3)]"><span className="size-[7px] rounded-full bg-white" /></span>
          <span dir="auto" className="absolute left-1/2 top-[24px] line-clamp-2 w-max max-w-[112px] -translate-x-1/2 text-center text-[12px] leading-[15px] font-bold text-[#20231F] [text-shadow:0_0_2px_#fff,0_0_2px_#fff,0_0_3px_#fff,0_0_3px_#fff]">{store.name}</span>
        </>}
      </button>;
    })}
  </div>;
}

/** 같은 건물로 보는 거리. 층만 다른 가게는 좌표가 거의 같다. */
const SAME_BUILDING_METERS = 5;
/** 핀 반지름. 핀 가운데가 가게 좌표다. */
const PIN_RADIUS = 11;
/** 핀 아래 가게 이름 최대 폭(두 줄까지) */
const NAME_MAX_WIDTH = 112;
const NAME_LINE_HEIGHT = 15;
const NAME_GAP = 2;
/** 선택 가게 말풍선(핀 위, 꼬리가 좌표를 가리킨다) */
const SELECTED_HEIGHT = 32;
const SELECTED_TAIL = 8;
const PIN_COLOR = '#176449';
const SELECTED_COLOR = '#D86632';
const FONT = 'Pretendard, system-ui, sans-serif';

interface Placement {
  marker: naver.maps.Marker;
  position: naver.maps.LatLng;
  selected: boolean;
  mode: 'label' | 'dot';
  pinHtml: string;
  labelHtml: string;
  nameWidth: number;
  nameLines: number;
  selectedWidth: number;
}

interface Box { left: number; top: number; right: number; bottom: number }

function distanceMeters(a: MapStore, b: MapStore) {
  const dLat = (a.lat - b.lat) * 111_320;
  const dLng = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

/** 후보 순서대로 5m 안 가게 묶음. 선택 가게의 묶음이 맨 앞. */
export function groupNearbyStores(stores: MapStore[], selectedId?: string | null) {
  const groups: MapStore[][] = [];
  stores.forEach((store) => {
    const group = groups.find((items) => distanceMeters(items[0], store) <= SAME_BUILDING_METERS);
    if (group) group.push(store);
    else groups.push([store]);
  });
  return groups.sort((a, b) => Number(b.some((s) => s.id === selectedId)) - Number(a.some((s) => s.id === selectedId)));
}

function pinBox(x: number, y: number): Box {
  return { left: x - PIN_RADIUS, right: x + PIN_RADIUS, top: y - PIN_RADIUS, bottom: y + PIN_RADIUS };
}

function nameBox(x: number, y: number, width: number, lines: number): Box {
  const top = y + PIN_RADIUS + NAME_GAP;
  return { left: x - width / 2, right: x + width / 2, top, bottom: top + lines * NAME_LINE_HEIGHT };
}

function selectedBox(x: number, y: number, width: number): Box {
  return { left: x - width / 2, right: x + width / 2, top: y - SELECTED_TAIL - SELECTED_HEIGHT, bottom: y };
}

function overlaps(a: Box, b: Box) {
  const margin = 2;
  return a.left < b.right + margin && b.left < a.right + margin && a.top < b.bottom + margin && b.top < a.bottom + margin;
}

let measureContext: CanvasRenderingContext2D | null | undefined;
function textWidth(text: string, font: string, fallbackPerChar: number) {
  if (measureContext === undefined) measureContext = document.createElement('canvas').getContext('2d');
  if (!measureContext) return text.length * fallbackPerChar;
  measureContext.font = font;
  return measureContext.measureText(text).width;
}

/** 핀 아래 이름 대략 크기(최대 폭 넘으면 두 줄) */
function measureName(name: string) {
  const width = Math.ceil(textWidth(name, `700 12px ${FONT}`, 12)) + 4;
  return width > NAME_MAX_WIDTH ? { width: NAME_MAX_WIDTH, lines: 2 } : { width, lines: 1 };
}

function selectedWidth(name: string, extra: number) {
  const badge = extra > 0 ? 6 + 12 + String(extra).length * 8 : 0;
  return Math.ceil(textWidth(name, `800 14px ${FONT}`, 14)) + 28 + badge;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** 가게 핀. 같은 건물 여러 곳이면 가운데에 가게 수. */
function markerPinHtml(count: number) {
  const size = PIN_RADIUS * 2;
  const inner = count > 1
    ? `<span style="font:800 11px/1 ${FONT};color:#fff">${count}</span>`
    : '<span style="width:7px;height:7px;border-radius:999px;background:#fff"></span>';
  return (
    `<div style="position:relative;width:0;height:0;cursor:pointer">` +
    `<span style="position:absolute;left:-${PIN_RADIUS}px;top:-${PIN_RADIUS}px;width:${size}px;height:${size}px;` +
    `display:flex;align-items:center;justify-content:center;box-sizing:border-box;border-radius:999px;` +
    `background:${PIN_COLOR};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)">${inner}</span>` +
    `</div>`
  );
}

/** 핀 + 아래 가게 이름(흰 테두리 글자). 우리 데이터라 사용자 언어 그대로. */
function markerLabelHtml(name: string, count: number) {
  return (
    markerPinHtml(count).replace(/<\/div>$/, '') +
    `<div dir="auto" style="position:absolute;left:0;top:${PIN_RADIUS + NAME_GAP}px;transform:translateX(-50%);` +
    `width:max-content;max-width:${NAME_MAX_WIDTH}px;text-align:center;font:700 12px/${NAME_LINE_HEIGHT}px ${FONT};color:#20231F;` +
    `word-break:keep-all;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;` +
    `text-shadow:0 0 2px #fff,0 0 2px #fff,0 0 3px #fff,0 0 3px #fff">${escapeHtml(name)}</div>` +
    `</div>`
  );
}

/** 선택 가게: 꼬리 달린 말풍선. 같은 건물 가게가 더 있으면 '+N'. */
function markerSelectedHtml(name: string, extra: number) {
  const badge = extra > 0
    ? `<span style="margin-inline-start:6px;border-radius:999px;padding:1px 6px;background:rgba(255,255,255,.25);font:700 12px/16px ${FONT}">+${extra}</span>`
    : '';
  return (
    `<div style="position:relative;width:0;height:0;cursor:pointer">` +
    `<div dir="auto" style="position:absolute;left:0;bottom:${SELECTED_TAIL}px;transform:translateX(-50%);height:${SELECTED_HEIGHT}px;` +
    `box-sizing:border-box;display:flex;align-items:center;padding:0 14px;border-radius:999px;background:${SELECTED_COLOR};color:#fff;` +
    `font:800 14px/18px ${FONT};white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.25)">${escapeHtml(name)}${badge}</div>` +
    `<span style="position:absolute;left:-7px;bottom:0;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;` +
    `border-top:${SELECTED_TAIL + 1}px solid ${SELECTED_COLOR}"></span>` +
    `</div>`
  );
}
