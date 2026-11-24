import { useState } from 'react';
import type { Language } from '../../types';
import { HsButton } from '../hs/Button';
import { HsIcon } from '../hs/icons';
import { HsSheet } from '../hs/Sheet';
import { tx, type AllText } from '../hs/text';
import { MAP_AREAS, koreanTo, type MapArea } from './mapAreas';

const T = {
  title: { ko: '어느 지역을 볼까요?', en: 'Which area do you want to explore?', ar: 'أي منطقة تريد استكشافها؟', 'zh-CN': '想看哪个区域？', ja: 'どのエリアを見ますか？', 'zh-TW': '想看哪個區域？', es: '¿Qué zona quieres ver?' },
  nearMe: { ko: '내 주변', en: 'Near me', ar: 'بالقرب مني', 'zh-CN': '我的周边', ja: '現在地周辺', 'zh-TW': '我的周邊', es: 'Cerca de mí' },
  areas: { ko: '지역', en: 'Areas', ar: 'المناطق', 'zh-CN': '区域', ja: 'エリア', 'zh-TW': '區域', es: 'Zonas' },
} satisfies Record<string, AllText>;

const GO_TO: Record<Language, (area: string) => string> = {
  ko: (a) => `${koreanTo(a)} 이동`,
  en: (a) => `Go to ${a}`,
  ar: (a) => `الانتقال إلى ${a}`,
  'zh-CN': (a) => `前往${a}`,
  ja: (a) => `${a}へ移動`,
  'zh-TW': (a) => `前往${a}`,
  es: (a) => `Ir a ${a}`,
};

/** F2-02 지역 선택. [내 주변]은 바로 이동, 지역은 고른 뒤 아래 버튼으로 이동. */
export function MapAreaSheet({ language, currentAreaId, onNearMe, onSelect, onClose }: {
  language: Language;
  currentAreaId: string | null;
  onNearMe: () => void;
  onSelect: (area: MapArea) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<MapArea>(() => MAP_AREAS.find((area) => area.id === currentAreaId) ?? MAP_AREAS[0]);
  const pickedName = tx(language, picked.label);
  return (
    <HsSheet
      language={language}
      onClose={onClose}
      title={tx(language, T.title)}
      footer={<HsButton size="cta" onClick={() => onSelect(picked)}>{(GO_TO[language] ?? GO_TO.en)(pickedName)}</HsButton>}
    >
      <button
        type="button"
        onClick={onNearMe}
        className="flex h-[52px] w-full items-center justify-center gap-2 rounded-hs-pill border-[1.5px] border-hs-line-200 bg-hs-surface-0 text-[15px] font-black text-hs-brand-700"
      >
        <HsIcon name="locate" size={18} />
        {tx(language, T.nearMe)}
      </button>
      <div role="group" aria-label={tx(language, T.areas)} className="mt-3.5 grid grid-cols-3 gap-2">
        {MAP_AREAS.map((area) => {
          const on = area.id === picked.id;
          return (
            <button
              key={area.id}
              type="button"
              aria-pressed={on}
              onClick={() => setPicked(area)}
              className={`min-h-11 rounded-t-[16px] rounded-b-[22px] px-1.5 py-1 text-[13px] font-extrabold leading-tight text-hs-ink-900 ${on ? 'border-2 border-hs-brand-700 bg-hs-mint-100' : 'border-[1.5px] border-hs-line-200 bg-hs-surface-0'}`}
            >
              {tx(language, area.label)}
            </button>
          );
        })}
      </div>
    </HsSheet>
  );
}
