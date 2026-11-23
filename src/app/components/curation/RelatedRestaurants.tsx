import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { findStoreCandidates, type StoreCandidate } from '../../../api/store';
import type { Language } from '../../types';
import { createTranslator, translateText } from '../../locales';
export function RelatedRestaurants({ language }: { articleId: string; language: Language }) {
  const t = createTranslator(language);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<StoreCandidate[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const search = async () => {
    if (!query.trim()) return;
    setItems([]);
    setState('loading');
    try { setItems(await findStoreCandidates({ query: query.trim(), limit: 6 })); setState('done'); }
    catch { setState('error'); }
  };
  return <section className="border-t border-white/10 px-6 py-6">
    <h2 className="text-xl font-bold">{t('이제 식당을 찾아볼까요?', 'Find a restaurant to visit', 'ابحث عن مطعم لزيارته')}</h2>
    <p className="mt-2 text-xs text-white/70">{t('검색 결과는 내 식단에 맞는지 확인된 추천이 아니에요. 방문 전 메뉴와 재료를 확인해 주세요.', 'Search results have not been verified for your diet. Check menus and ingredients before visiting.', 'لم يتم التحقق من ملاءمة نتائج البحث لنظامك الغذائي. تحقق من القائمة والمكونات قبل الزيارة.')}</p>
    <p className="mt-2 text-xs text-white/70">{translateText(language, { ko: '식당 이름으로 검색해요. 음식 종류나 지역 검색은 지도에서 시작해 주세요.', en: 'Search by restaurant name. Start on the map to explore areas or food categories.', ar: 'ابحث باسم المطعم. ابدأ من الخريطة لاستكشاف المناطق أو أنواع الطعام.', 'zh-CN': '按餐厅名称搜索。探索地区或菜系请前往地图。', 'zh-TW': '依餐廳名稱搜尋。探索地區或菜系請前往地圖。', ja: '店名で検索します。地域や料理の種類は地図から探してください。', es: 'Busca por nombre del restaurante. Explora zonas y tipos de comida en el mapa.' })}</p><button type="button" onClick={() => navigate('/map')} className="mt-3 min-h-11 rounded-xl border border-white/30 px-3">{translateText(language, { ko: '지도에서 둘러보기', en: 'Explore the map', ar: 'استكشف الخريطة', 'zh-CN': '浏览地图', 'zh-TW': '瀏覽地圖', ja: '地図を見る', es: 'Explorar el mapa' })}</button>
    <form onSubmit={event => { event.preventDefault(); void search(); }} className="my-3 flex gap-2"><input aria-label={t('식당 이름 검색', 'Restaurant name', 'اسم المطعم')} placeholder={t('식당 이름 검색', 'Restaurant name', 'اسم المطعم')} value={query} onChange={event => setQuery(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl bg-white px-3 text-soy-ink" /><button disabled={state === 'loading' || !query.trim()} className="rounded-xl bg-brand-primary px-4 text-sm font-bold">{t('찾기', 'Search', 'بحث')}</button></form>
    {state === 'loading' && <p role="status">{t('불러오는 중…', 'Loading…', 'جار التحميل…')}</p>}
    {state === 'error' && <p role="alert">{t('식당을 불러오지 못했어요. 다시 찾아 주세요.', 'Could not load restaurants. Search again to retry.', 'تعذر تحميل المطاعم. أعد البحث.')}</p>}
    {state === 'done' && !items.length && <p>{t('다른 검색어로 찾아보세요.', 'Try another search term.', 'جرّب عبارة بحث أخرى.')}</p>}
    {items.map(store => <button key={store.storeId} onClick={() => navigate('/map', { state: { searchCenter: { latitude: store.latitude, longitude: store.longitude }, selectedStoreId: store.storeId, selectedStore: store } })} className="mt-2 block min-h-14 w-full rounded-xl bg-white/10 p-3 text-start"><strong>{store.name}</strong><span className="mt-1 block text-xs text-white/70">{store.roadAddress}</span></button>)}
  </section>;
}
