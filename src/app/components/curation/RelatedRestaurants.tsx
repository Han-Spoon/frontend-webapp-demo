import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { findStoreCandidates, type StoreCandidate } from '../../../api/store';
import type { Language } from '../../App';
import { createTranslator } from '../../locales';
const keywords: Record<string, string> = { chimaek: '치킨', bunsik: '분식', 'grill-cut': '고기', 'shared-stew': '찌개', haejangguk: '해장국', 'seongsu-walk': '성수 식당', 'busan-seaside': '부산 식당', 'cafe-pause': '카페' };
export function RelatedRestaurants({ articleId, language }: { articleId: string; language: Language }) {
  const t = createTranslator(language);
  const navigate = useNavigate();
  const [query, setQuery] = useState(keywords[articleId] ?? '한식');
  const [items, setItems] = useState<StoreCandidate[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const search = async () => {
    if (!query.trim()) return;
    setState('loading');
    try { setItems(await findStoreCandidates({ query: query.trim(), limit: 6 })); setState('done'); }
    catch { setState('error'); }
  };
  return <section className="border-t border-white/10 px-6 py-6">
    <h2 className="text-xl font-bold">{t('이제 식당을 찾아볼까요?', 'Find a restaurant to visit', 'ابحث عن مطعم لزيارته')}</h2>
    <p className="mt-2 text-xs text-white/70">{t('검색 결과는 내 식단에 맞는지 확인된 추천이 아니에요. 방문 전 메뉴와 재료를 확인해 주세요.', 'Search results have not been verified for your diet. Check menus and ingredients before visiting.', 'لم يتم التحقق من ملاءمة نتائج البحث لنظامك الغذائي. تحقق من القائمة والمكونات قبل الزيارة.')}</p>
    <form onSubmit={event => { event.preventDefault(); void search(); }} className="my-3 flex gap-2"><input aria-label={t('식당 검색어', 'Restaurant search', 'بحث المطاعم')} value={query} onChange={event => setQuery(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl bg-white px-3 text-soy-ink" /><button disabled={state === 'loading' || !query.trim()} className="rounded-xl bg-brand-primary px-4 text-sm font-bold">{t('찾기', 'Search', 'بحث')}</button></form>
    {state === 'loading' && <p role="status">{t('불러오는 중…', 'Loading…', 'جار التحميل…')}</p>}
    {state === 'error' && <p role="alert">{t('식당을 불러오지 못했어요. 다시 찾아 주세요.', 'Could not load restaurants. Search again to retry.', 'تعذر تحميل المطاعم. أعد البحث.')}</p>}
    {state === 'done' && !items.length && <p>{t('다른 검색어로 찾아보세요.', 'Try another search term.', 'جرّب عبارة بحث أخرى.')}</p>}
    {items.map(store => <button key={store.storeId} onClick={() => navigate('/map', { state: { searchCenter: { latitude: store.latitude, longitude: store.longitude }, selectedStoreId: store.storeId, initialQuery: store.name } })} className="mt-2 block min-h-14 w-full rounded-xl bg-white/10 p-3 text-start"><strong>{store.name}</strong><span className="mt-1 block text-xs text-white/70">{store.roadAddress}</span></button>)}
  </section>;
}
