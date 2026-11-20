import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Language } from '../App';
import { isLanguage } from '../locales';
import { MAP_PREVIEW_STORES } from '../demo/mapPreviewStores';
import { StoreMap } from './discovery/StoreMap';

/** 개발 서버 전용. 실제 네이버 지도로 마커 묶음·이름표 충돌을 확인한다. */
export function DevMapPreview({ fallbackLanguage }: { fallbackLanguage: Language }) {
  const [searchParams] = useSearchParams();
  const requested = searchParams.get('lang');
  const language = isLanguage(requested) ? requested : fallbackLanguage;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = MAP_PREVIEW_STORES.find((store) => store.id === selectedId);

  return (
    <div className="relative h-dvh">
      <StoreMap
        language={language}
        stores={MAP_PREVIEW_STORES}
        center={{ lat: 37.5312, lng: 126.9636 }}
        fitStores={false}
        selectedId={selectedId}
        onSelect={(store) => setSelectedId(store.id)}
        className="h-full w-full"
      />
      <p className="absolute inset-x-3 bottom-3 rounded-xl bg-white/95 p-3 text-sm font-bold shadow">
        {selected ? selected.name : `가상 가게 ${MAP_PREVIEW_STORES.length}곳 · 선택 없음`}
      </p>
    </div>
  );
}
