import { Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LoginScreen } from './components/LoginScreen';
import { LandingScreen } from './components/LandingScreen';
import { HomeScreen } from './components/HomeScreen';
import { writeDemo } from './demo/storage';
import { FILMING_PROFILE as RESULT_PREVIEW_PROFILE } from './results/filmingProfile';
import { getAccessToken } from '../api/auth';
import { appliedScanProfile, getScanResult, mapMenuResult } from '../api/scan';
import type { StoreCandidate } from '../api/store';
import type { HistoryItem, PendingMenuImage } from './types';
import { ScreenErrorBoundary, ScreenErrorFallback, ScreenLoading } from './components/ScreenErrorBoundary';
import { lazyScreen, retryFailedScreens } from './lazyScreen';
import { useAccount } from './hooks/useAccount';
import { useDocumentLanguage } from './hooks/useDocumentLanguage';
import { EMPTY_RESULT, useResultSession } from './hooks/useResultSession';
import { useScanHistory } from './hooks/useScanHistory';

// 첫 화면(랜딩·로그인·홈) 밖 화면은 진입 시 코드 로드.
const PartnerMenuScreen = lazyScreen(() => import('./components/PartnerMenuScreen').then((module) => module.PartnerMenuScreen));
const OnboardingScreen = lazyScreen(() => import('./components/OnboardingScreen').then((module) => module.OnboardingScreen));
const ConsentScreen = lazyScreen(() => import('./components/ConsentScreen').then((module) => module.ConsentScreen));
const RestaurantMapScreen = lazyScreen(() => import('./components/RestaurantMapScreen').then((module) => module.RestaurantMapScreen));
const ScanScreen = lazyScreen(() => import('./components/ScanScreen').then((module) => module.ScanScreen));
const ScanHistoryScreen = lazyScreen(() => import('./components/ScanHistoryScreen').then((module) => module.ScanHistoryScreen));
const AnalyzingScreen = lazyScreen(() => import('./components/AnalyzingScreen').then((module) => module.AnalyzingScreen));
const ResultsScreen = lazyScreen(() => import('./components/ResultsScreen').then((module) => module.ResultsScreen));
const MyPageScreen = lazyScreen(() => import('./components/MyPageScreen').then((module) => module.MyPageScreen));
const SavedMenusScreen = lazyScreen(() => import('./components/SavedMenusScreen').then((module) => module.SavedMenusScreen));
const MyReviewsScreen = lazyScreen(() => import('./components/reviews/MyReviewsScreen').then((module) => module.MyReviewsScreen));
const CurationScreen = lazyScreen(() => import('./components/CurationScreen').then((module) => module.CurationScreen));
const CurationDetailScreen = lazyScreen(() => import('./components/CurationDetailScreen').then((module) => module.CurationDetailScreen));
const CardsScreen = lazyScreen(() => import('./components/CardsScreen').then((module) => module.CardsScreen));
// 홈 진입 뒤 미리 받는 스캔 흐름(식당 안 약한 통신 대비).
const SCAN_FLOW_SCREENS = [ScanScreen, AnalyzingScreen, ResultsScreen];

// 개발 서버 전용(운영 빌드에서 import 제외).
const DevResultsPreview = import.meta.env.DEV
  ? lazyScreen(() => import('./components/DevResultsPreview').then((module) => module.DevResultsPreview))
  : null;
const DevMapPreview = import.meta.env.DEV
  ? lazyScreen(() => import('./components/DevMapPreview').then((module) => module.DevMapPreview))
  : null;

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (location.pathname !== '/home') return;
    const run = () => SCAN_FLOW_SCREENS.forEach((screen) => screen.preload());
    // Safari는 requestIdleCallback이 없어 잠시 뒤 실행.
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(run, 1500);
    return () => clearTimeout(timer);
  }, [location.pathname]);
  // onSignedIn은 첫 로드 effect에서 호출되므로 그때는 scanHistory 준비됨.
  const account = useAccount({ onSignedIn: () => void scanHistory.loadHistory() });
  const { demoMode, language, setLanguage, userProfile, currentUser, consentAccepted } = account;
  const scanHistory = useScanHistory(language);
  const { result, showResult, clearPhoto } = useResultSession();
  const [analysisImage, setAnalysisImage] = useState<PendingMenuImage | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreCandidate | null>(null);
  useDocumentLanguage(language);

  const startDemo = () => {
    account.beginDemo();
    scanHistory.clearServerHistory();
    showResult(EMPTY_RESULT);
    setSelectedStore(null);
    navigate('/terms?demo=1');
  };

  // 기록 열기: 서버 상세 조회 → 결과 화면.
  const openHistory = async (item: HistoryItem) => {
    clearPhoto();
    const local = scanHistory.localRecords.find(record => record.id === item.id);
    if (local) {
      showResult({
        menus: local.menus,
        scanId: local.sourceScanId,
        recordId: local.id,
        store: null,
        record: null,
        profile: local.profileSnapshot,
        profileUnknown: false,
        photoUrl: null,
      });
      writeDemo('selected-restaurant', local.restaurantId);
      navigate('/results');
      return;
    }
    try {
      const scan = await getScanResult(item.id);
      const snapshot = appliedScanProfile(scan.dietSnapshot, userProfile, scan.locale ?? language);
      setAnalysisImage(null);
      // 스캔 당시 식단 기준, 없으면 '판정 기준 확인 불가'.
      showResult({
        menus: (scan.menus ?? []).map((menu, index) => mapMenuResult(menu, index, scan.locale ?? language, snapshot)),
        scanId: item.id,
        store: scan.record?.store ?? scan.store ?? null,
        record: scan.record ?? null,
        profile: snapshot ?? undefined,
        profileUnknown: snapshot === null,
        photoUrl: null,
      });
      writeDemo('selected-restaurant', null);
      navigate('/results');
    } catch (error) {
      console.error('Unable to open scan:', error);
      // 목록의 실패 알림용으로 다시 던짐.
      throw error;
    }
  };

  if (!demoMode && !['/', '/login', '/terms'].includes(location.pathname)) {
    if (!getAccessToken()) return <Navigate to="/login" replace />;
    if (consentAccepted === null) return <div className="min-h-dvh bg-rice-cream" />;
    if (!consentAccepted) return <Navigate to="/terms" replace />;
  }

  return (
    <div className="min-h-dvh bg-[var(--shell-background)] flex items-center justify-center sm:px-6">
      <div className="mobile-container w-full max-w-[430px] min-h-dvh bg-rice-cream shadow-[0_24px_80px_rgba(41,54,46,0.16)] relative overflow-hidden sm:border-x sm:border-border-warm">
        <ScreenErrorBoundary
          resetKey={location.pathname}
          onReset={retryFailedScreens}
          fallback={(reset) => (
            <ScreenErrorFallback
              language={language}
              pathname={location.pathname}
              onRetry={reset}
              onHome={location.pathname === '/home' ? undefined : () => navigate('/home')}
            />
          )}
        >
        <Suspense fallback={<ScreenLoading language={language} />}>
        <Routes>
          <Route
            path="/"
            element={<LandingScreen language={language} setLanguage={setLanguage} onTryDemo={startDemo} />}
          />
          <Route
            path="/login"
            element={
              <LoginScreen
                language={language}
                setLanguage={setLanguage}
                onLogin={account.completeLogin}
                demoMode={demoMode}
                onTryDemo={startDemo}
                onExitDemo={account.exitDemo}
              />
            }
          />
          <Route
            path="/terms"
            element={<ConsentScreen language={language} demoMode={demoMode} onComplete={account.completeConsent} onBack={() => navigate((location.state as { returnTo?: string } | null)?.returnTo ?? '/login')} />}
          />
          <Route
            path="/onboarding"
            element={
              !demoMode && !getAccessToken() ? <Navigate to="/login" replace /> : consentAccepted === null ? <div className="p-6">Loading...</div> : !consentAccepted ? <Navigate to="/terms" replace /> : <OnboardingScreen
                language={language}
                setLanguage={setLanguage}
                initialProfile={userProfile ?? undefined}
                onComplete={account.saveProfile}
              />
            }
          />
          <Route
            path="/home"
            element={!demoMode && consentAccepted === false ? <Navigate to="/terms" replace /> : <HomeScreen language={language} userProfile={userProfile} demoMode={demoMode} selectedStore={selectedStore} onSelectStore={setSelectedStore} />}
          />
          <Route
            path="/map"
            element={<RestaurantMapScreen language={language} userProfile={userProfile} demoMode={demoMode} selectedStore={selectedStore} onSelectStore={setSelectedStore} />}
          />
          <Route path="/restaurants/map" element={<Navigate to={`/map${window.location.search}`} replace />} />
          <Route path="/restaurant/map" element={<Navigate to={`/map${window.location.search}`} replace />} />
          <Route path="/restaurants/:id/menu" element={<PartnerMenuScreen language={language} userProfile={userProfile} />} />
          <Route path="/history" element={<ScanHistoryScreen language={language} history={scanHistory.history} loadFailed={scanHistory.loadFailed} onRetryLoad={() => void scanHistory.loadHistory()} onOpen={openHistory} onDelete={scanHistory.deleteHistory} onRename={scanHistory.renameHistory} />} />
          <Route
            path="/scan"
            element={
              <ScanScreen
                language={language}
                demoMode={demoMode}
                selectedStore={selectedStore}
                onSelectStore={setSelectedStore}
                onScan={(image) => {
                  setAnalysisImage(image);
                  navigate('/analyzing');
                }}
                onHistory={openHistory}
                onMyPage={() => navigate('/mypage')}
                history={scanHistory.history}
                onDeleteHistory={scanHistory.deleteHistory}
                onRenameHistory={scanHistory.renameHistory}
              />
            }
          />
          <Route
            path="/curation"
            element={<CurationScreen language={language} onMyPage={() => navigate('/mypage')} />}
          />
          <Route path="/curation/:id" element={<CurationDetailScreen language={language} />} />
          <Route
            path="/cards"
            element={<CardsScreen language={language} demoMode={demoMode} onMyPage={() => navigate('/mypage')} />}
          />
          <Route
            path="/analyzing"
            element={
              <AnalyzingScreen
                language={language}
                image={analysisImage}
                userProfile={userProfile}
                fixedResults={demoMode}
                onComplete={(_scanId, menus, store, appliedProfile) => {
                  showResult({
                    menus,
                    scanId: _scanId ?? undefined,
                    store,
                    record: null,
                    // 새 스캔의 판정 기준: 스캔 당시 식단(없으면 지금 식단).
                    profile: _scanId === null ? { ...(userProfile ?? RESULT_PREVIEW_PROFILE), languageCode: language } : appliedProfile ?? undefined,
                    profileUnknown: false,
                    photoUrl: analysisImage?.previewUrl ?? null,
                  });
                  setAnalysisImage(null);
                  navigate('/results');
                  // 저장된 최신 기록으로 목록 갱신.
                  if (_scanId !== null) void scanHistory.loadHistory();
                }}
                onRetryWithNewImage={() => {
                  if (analysisImage?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(analysisImage.previewUrl);
                  setAnalysisImage(null);
                  navigate('/scan');
                }}
                onCancel={() => {
                  if (analysisImage?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(analysisImage.previewUrl);
                  setAnalysisImage(null);
                  navigate('/home');
                }}
              />
            }
          />
          <Route
            path="/results"
            element={
              <ResultsScreen
                language={language}
                menus={result.menus}
                userProfile={result.profile === undefined ? userProfile : result.profile}
                currentUserProfile={userProfile}
                sourceScanId={result.scanId}
                onSavedRecord={scanHistory.loadHistory}
                store={result.store}
                record={result.record}
                savedRecordId={result.recordId}
                demoMode={demoMode}
                menuPhotoUrl={result.photoUrl}
                scanProfileUnknown={result.profileUnknown}
                onBack={() => { clearPhoto(); navigate('/home'); }}
                onRescan={() => { clearPhoto(); navigate('/scan'); }}
              />
            }
          />
          {import.meta.env.DEV && (
            <Route
              path="/dev/results-preview"
              element={DevResultsPreview && <DevResultsPreview fallbackLanguage={language} />}
            />
          )}
          {import.meta.env.DEV && (
            <Route
              path="/dev/map-preview"
              element={DevMapPreview && <DevMapPreview fallbackLanguage={language} />}
            />
          )}
          <Route
            path="/mypage"
            element={
              <MyPageScreen
                language={language}
                demoMode={demoMode}
                setLanguage={account.changeLanguage}
                currentUser={currentUser}
                userProfile={userProfile}
                history={scanHistory.history}
                historyLoadFailed={scanHistory.loadFailed}
                onRetryHistory={() => void scanHistory.loadHistory()}
                onBack={() => navigate('/home')}
                onEditProfile={(section) =>
                  navigate('/onboarding', section ? { state: { editSection: section } } : undefined)
                }
                onHistoryClick={openHistory}
                onEditHistoryTitle={scanHistory.renameHistory}
                onDeleteHistory={scanHistory.deleteHistory}
                onTerms={() => navigate('/terms', { state: { returnTo: '/mypage' } })}
                onLogout={account.clearSession}
              />
            }
          />
          <Route path="/mypage/saved-menus" element={<SavedMenusScreen language={language} demoMode={demoMode} />} />
          <Route path="/mypage/reviews" element={<MyReviewsScreen language={language} profile={userProfile} demoMode={demoMode} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </Suspense>
        </ScreenErrorBoundary>
      </div>
    </div>
  );
}
