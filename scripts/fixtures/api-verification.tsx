// Explicit development fixture. No real API requests or account changes are made.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MyReviews, SavedMenus } from '../../src/app/components/mypage/RecordsTab';
import { ToastProvider } from '../../src/app/components/hs/Toast';
import '../../src/styles/index.css';
import { liveFeatures } from '../../src/app/featureAvailability';
// This explicit contract fixture tests future enabled responses, not production availability.
liveFeatures.savedMenus = true;
liveFeatures.reviews = true;

type Scenario = 'success' | 'empty' | 'unavailable' | 'invalid';
let scenario: Scenario = 'success';
if (!import.meta.env.DEV) throw new Error('Development fixture only');
window.fetch = async (input, init = {}) => {
  const path = String(input);
  if ((init.method ?? 'GET') !== 'GET') throw new Error('Fixture mutation disabled');
  if (!['/api/v1/saved-menus', '/api/v1/reviews/me'].includes(path)) throw new Error(`Unmocked fixture request: ${path}`);
  if (scenario === 'unavailable') return Response.json({ code: 'HTTP_404', detail: `No static resource ${path.slice(1)}` }, { status: 404 });
  if (scenario === 'invalid') return Response.json({ items: [] });
  if (scenario === 'empty') return Response.json([]);
  if (path.endsWith('saved-menus')) return Response.json([{ scanMenuId: 'fixture-menu', scanId: 'fixture-scan', displayName: '검증용 음식', translatedName: 'Fixture dish', riskLevel: 'caution', store: { storeId: 1, name: '검증용 가게' }, savedAt: '2026-11-23T00:00:00Z' }]);
  return Response.json([{ reviewId: 'fixture-review', storeId: 1, storeName: '검증용 가게', scanId: null, menus: [{ name: '검증용 음식', answers: {}, comment: '프론트 검증용 후기', commentLocale: 'ko' }], mine: true, hidden: true, createdAt: '2026-11-23T00:00:00Z', updatedAt: '2026-11-23T00:00:00Z' }]);
};
function Verification() {
  const [screen, setScreen] = useState<'saved' | 'reviews'>('saved');
  const [selected, setSelected] = useState<Scenario>('success');
  const [arabic, setArabic] = useState(false);
  return <><aside className="fixed left-0 top-0 z-50 max-w-52 space-y-2 bg-white p-3 text-sm text-black"><strong>LOCAL FIXTURE — no server</strong><div>{(['saved', 'reviews'] as const).map(value => <button key={value} onClick={() => setScreen(value)} className="m-1 rounded border p-2">{value}</button>)}</div><div>{(['success', 'empty', 'unavailable', 'invalid'] as const).map(value => <button key={value} onClick={() => { scenario = value; setSelected(value); }} className="m-1 rounded border p-2">{value}</button>)}</div><button onClick={() => setArabic(value => !value)} className="rounded border p-2">Toggle Arabic</button><p>{screen} / {selected}</p></aside><div className="mx-auto max-w-[430px]" dir={arabic ? 'rtl' : 'ltr'} key={`${screen}-${selected}-${arabic}`}>{screen === 'saved' ? <ToastProvider><SavedMenus language={arabic ? 'ar' : 'ko'} demoMode={false}/></ToastProvider> : <ToastProvider><MyReviews language={arabic ? 'ar' : 'ko'} profile={null} demoMode={false}/></ToastProvider>}</div></>;
}
createRoot(document.getElementById('root')!).render(<BrowserRouter><Verification/></BrowserRouter>);
