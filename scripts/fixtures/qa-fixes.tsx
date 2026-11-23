// Explicit local fixture: no production requests or account changes.
import React, { Suspense, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SavedMenusScreen } from '../../src/app/components/SavedMenusScreen';
import { MyReviewsScreen } from '../../src/app/components/reviews/MyReviewsScreen';
import { OwnerCommunicationSheet } from '../../src/app/components/OwnerCommunicationSheet';
import { MapStorePanel } from '../../src/app/components/discovery/MapStorePanel';
import { ScreenErrorBoundary, ScreenErrorFallback } from '../../src/app/components/ScreenErrorBoundary';
import { lazyScreen, retryFailedScreens } from '../../src/app/lazyScreen';
import type { MenuAnalysis } from '../../src/app/types';
import type { StoreCandidate } from '../../src/api/store';
import '../../src/styles/index.css';
if (!import.meta.env.DEV) throw new Error('Development fixture only');
let requests = 0;
window.fetch = async () => { requests++; document.getElementById('requests')!.textContent = `Unexpected requests: ${requests}`; throw new Error('Network blocked by fixture'); };
const menu: MenuAnalysis = { id:'fixture', menuName:'Fixture rice', menuNameEn:'Fixture rice', description:'', riskLevel:'caution', riskReasons:[], isSpicy:false, explainability:{ingredients:[{name:{ko:'Shrimp',en:'Shrimp',ar:'روبيان'}}]} };
const stores: StoreCandidate[] = [{storeId:-20261123,name:'LOCAL QA restaurant',roadAddress:'Fixture address',latitude:37.5,longitude:127,distanceMeters:null,verified:false,matchMethod:'name_search'}];
const Failed = lazyScreen(async () => { throw new TypeError('Fixture obsolete chunk'); });
function QA() {
 const [screen,setScreen]=useState('saved'); const [ar,setAr]=useState(false); const [closed,setClosed]=useState(false);
 const language=ar?'ar':'ko';
 return <><aside style={{position:'fixed',left:0,top:0,zIndex:100,padding:8,background:'white',maxWidth:180}}><b>LOCAL QA ONLY</b>{['saved','reviews','owner','map','chunk'].map(s=><button style={{display:'block',padding:8}} key={s} onClick={()=>{setScreen(s);setClosed(false);}}>{s}</button>)}<button onClick={()=>setAr(!ar)}>Arabic</button><p id="requests">Unexpected requests: 0</p></aside><main dir={ar?'rtl':'ltr'} style={{position:'relative',margin:'auto',width:430,height:'100dvh'}} key={screen+ar}>
 {screen==='saved'&&<SavedMenusScreen language={language}/>}
 {screen==='reviews'&&<MyReviewsScreen language={language} profile={null}/>}
 {screen==='owner'&&(closed?<p>Sheet closed</p>:<OwnerCommunicationSheet language={language} menu={menu} userProfile={null} type="request" demoMode onClose={()=>setClosed(true)}/>)}
 {screen==='map'&&<MapStorePanel language={language} stores={stores} selectedId={-20261123} onSelect={()=>{}} origin={null} onOpenDetail={()=>{}} onScan={()=>{}}/>}
 {screen==='chunk'&&<ScreenErrorBoundary onReset={retryFailedScreens} fallback={reset=><ScreenErrorFallback language={language} pathname="/map" onRetry={reset}/>}><Suspense fallback={<p>Loading</p>}><Failed/></Suspense></ScreenErrorBoundary>}
 </main></>;
}
createRoot(document.getElementById('root')!).render(<BrowserRouter><QA/></BrowserRouter>);
