import { Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LoginScreen } from './components/LoginScreen';
import { LandingScreen } from './components/LandingScreen';
import { HomeScreen } from './components/HomeScreen';
import { readDemo, useDemoValue, writeDemo } from './demo/storage';
import type { VisitRecord } from './demo/records';
import { FILMING_PROFILE as RESULT_PREVIEW_PROFILE } from './results/filmingProfile';
import { ApiError, createProfile, getMe, getProfile, updateMe, updateProfile } from '../api/user';
import { getConsentStatus } from '../api/consent';
import { clearAuthData, getAccessToken } from '../api/auth';
import type { CurrentUser, UserProfilePayload } from '../api/user';
import { appliedScanProfile, deleteScan, getScanHistory, getScanResult, mapMenuResult, updateScanTitle } from '../api/scan';
import type { ScanRecordResponse } from '../api/scan';
import type { RiskLevel } from '../api/riskLevel';
import type { StoreCandidate, StoreSummary } from '../api/store';
import { isBackendLanguage, isLanguage, LANGUAGE_LOCALES, toBackendLanguage, translateText, type Language } from './locales';
import { ScreenErrorBoundary, ScreenErrorFallback, ScreenLoading } from './components/ScreenErrorBoundary';
import { lazyScreen, retryFailedScreens } from './lazyScreen';

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

export type { Language } from './locales';

export interface UserAllergy {
  allergy_name_ko: string;
  allergy_name_en?: string;
  allergy_name_ar?: string;
  allergy_name?: string;
}

export interface UserProfile {
  /** ISO 3166-1 alpha-2 (대문자, 예: "SA") */
  nationality: string;
  languageCode: Language;
  isFirstTime: boolean;
  isVegan: boolean;
  /** VegetarianType 코드값 (vegan|lacto|ovo|lacto_ovo|pesco) */
  veganType?: string | null;
  hasReligion: boolean;
  /** ReligionType 코드값 (halal|kosher|hindu) */
  religionType?: string | null;
  hasAllergies: boolean;
  /** AllergyCode 코드값 배열 (egg, milk, ...) */
  allergies: string[];
  noSpicy: boolean;
  noAlcohol: boolean;
}

export interface LocalizedMenuText {
  ko: string;
  en?: string;
  ar?: string;
  'zh-CN'?: string;
  ja?: string;
  'zh-TW'?: string;
  es?: string;
}

export type EvidenceConfidence = 'high' | 'medium' | 'limited';
export type EvidenceSourceType =
  | 'menu-description'
  | 'menu-context'
  | 'trusted-cooking'
  | 'demo-recipe'
  | 'web'
  | 'staff';

export interface MenuIngredientEvidence {
  name: LocalizedMenuText;
  /** 0–100. 주의 판정 + 해당 프로필일 때만 표시. */
  inclusionProbability?: number;
  profileIds?: string[];
  /** 서버 제공 시에만 표시(프론트 계산 없음) */
  inclusionLikelihood?: 'high' | 'medium' | 'low';
  confidence?: EvidenceConfidence;
  /** 이 재료에 직접 연결된 출처만(메뉴 전체 출처 배분 금지) */
  sourceTypes?: EvidenceSourceType[];
  staffEvidence?: {
    usedCount?: number;
    checkedCount?: number;
    sampleSufficient?: boolean;
  };
  sourcesConflict?: boolean;
}

export interface MenuEvidenceSource {
  type: EvidenceSourceType;
  title?: LocalizedMenuText;
  confidence?: EvidenceConfidence;
}

/** 결과 화면 판정 근거(선택). 값이 없으면 해당 영역 생략. */
export interface MenuExplainability {
  /** 분석 관점별 사용자용 확인 결과(추론 로그 아님) */
  checks?: {
    kind: 'menu' | 'recipe' | 'profile' | 'cross-contact';
    status: 'observed' | 'inferred' | 'unverified';
    finding: LocalizedMenuText;
  }[];
  decisionReason?: LocalizedMenuText;
  profileRelatedItems?: LocalizedMenuText[];
  ingredients?: MenuIngredientEvidence[];
  hiddenIngredientPaths?: LocalizedMenuText[][];
  sources?: MenuEvidenceSource[];
  uncertainties?: LocalizedMenuText[];
  curationId?: string;
}

export interface MenuAnalysis {
  id: string;
  image?: string;
  imagePosition?: string;
  imageScale?: number;
  imageCredit?: { author: string; url: string; license: string };
  imageAttribution?: string;
  /** fixture 표시. 실제 API 매퍼는 채우지 않음. */
  demoScenario?: 'bunsik-vegan-shrimp';
  menuName: string;
  menuNameEn: string;
  menuNameAr?: string;
  menuNameLocalized?: LocalizedMenuText;
  description: string;
  descriptionEn?: string;
  descriptionAr?: string;
  descriptionLocalized?: LocalizedMenuText;
  price?: string;
  riskLevel: RiskLevel;
  staffQuestions?: import('../api/scan').MenuResult['staffQuestions'];
  riskReasons: string[];
  riskReasonsEn?: string[];
  riskReasonsAr?: string[];
  isSpicy: boolean;
  is_spicy?: boolean;
  isAlcohol?: boolean;
  is_alcohol?: boolean;
  explainability?: MenuExplainability;
}

export interface PendingMenuImage {
  file: File | null;
  previewUrl: string;
  source: 'camera' | 'upload';
  storage?: {
    provider: 's3';
    key?: string;
  };
  store?: StoreCandidate | null;
}

export interface HistoryItem {
  id: string;
  title: string;
  date: string;
  menuCount: number;
  /** 서버 미제공 시 null. 0으로 채우지 않음(위험 없음 오해 방지). */
  dangerCount?: number | null;
  cautionCount?: number | null;
  menus: MenuAnalysis[];
  store?: StoreSummary | null;
}

const formatHistoryTitle = (language: Language, date: Date) => {
  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

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
  const [demoMode, setDemoMode] = useState(() => import.meta.env.VITE_DEMO_MODE === 'true'
    || sessionStorage.getItem('han-spoon-demo-session') === '1'
    || (import.meta.env.DEV && (new URLSearchParams(window.location.search).get('demo') === '1' || window.location.pathname === '/dev/results-preview')));
  const [language, setLanguage] = useState<Language>(() => {
    const requested = new URLSearchParams(window.location.search).get('lang');
    if (isLanguage(requested)) return requested;
    const saved = localStorage.getItem('han-spoon-language');
    return isLanguage(saved) ? saved : 'ko';
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => demoMode
    ? window.location.pathname === '/dev/results-preview' ? RESULT_PREVIEW_PROFILE : readDemo<UserProfile | null>('profile', null)
    : null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [consentAccepted, setConsentAccepted] = useState<boolean | null>(demoMode ? true : null);
  const [currentAnalysis, setCurrentAnalysis] = useState<MenuAnalysis[]>([]);
  const [analysisImage, setAnalysisImage] = useState<PendingMenuImage | null>(null);
  const [resultPhotoUrl, setResultPhotoUrl] = useState<string | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<HistoryItem[]>([]);
  // 서버 기록 목록 불러오기 실패. 빈 목록과 구분해 다시 시도 표시.
  const [historyLoadFailed, setHistoryLoadFailed] = useState(false);
  const [localRecords, setLocalRecords] = useDemoValue<VisitRecord[]>('records', []);

  const startDemo = () => {
    clearAuthData();
    sessionStorage.setItem('han-spoon-demo-session', '1');
    writeDemo('profile', null);
    writeDemo('records', []);
    writeDemo('saved-menus', []);
    writeDemo('cards', []);
    writeDemo('selected-restaurant', null);
    setDemoMode(true);
    setUserProfile(null);
    setCurrentUser(null);
    setAnalysisHistory([]);
    setCurrentAnalysis([]);
    setSelectedStore(null);
    setConsentAccepted(false);
    navigate('/terms?demo=1');
  };

  const exitDemo = () => {
    sessionStorage.removeItem('han-spoon-demo-session');
    setDemoMode(false);
    setUserProfile(null);
    setConsentAccepted(null);
    navigate('/login');
  };

  useEffect(() => {
    document.title = translateText(language, {
      ko: '한스푼 | 낯선 메뉴도, 안심하고 한 스푼',
      en: 'Han Spoon | Discover Korean food with confidence',
      ar: 'Han Spoon | اكتشف الطعام الكوري بثقة',
      'zh-CN': 'Han Spoon | 安心探索韩国美食',
      ja: 'Han Spoon | 韓国のメニューを安心して楽しむ',
      'zh-TW': 'Han Spoon | 安心探索韓國美食',
      es: 'Han Spoon | Descubre la comida coreana con confianza',
    });
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute(
      'content',
      translateText(language, {
        ko: '낯선 한국 메뉴도 안심하고 발견하도록 돕는 여행 식탁 가이드',
        en: 'A dining guide that helps travelers explore unfamiliar Korean menus with confidence.',
        ar: 'دليل طعام يساعد المسافرين على استكشاف القوائم الكورية بثقة.',
        'zh-CN': '帮助旅客安心探索陌生韩国菜单的餐饮指南。',
        ja: '旅行者が初めての韓国メニューを安心して楽しむための食事ガイド。',
        'zh-TW': '幫助旅客安心探索陌生韓國菜單的用餐指南。',
        es: 'Una guía para descubrir menús coreanos desconocidos con confianza.',
      }),
    );
  }, [language]);
  const [activeScanId, setActiveScanId] = useState<string | undefined>();
  const [activeRecordId, setActiveRecordId] = useState<string | undefined>();
  const [selectedStore, setSelectedStore] = useState<StoreCandidate | null>(null);
  const [activeScanStore, setActiveScanStore] = useState<StoreSummary | null>(null);
  const [activeScanRecord, setActiveScanRecord] = useState<ScanRecordResponse | null>(null);
  const [historyProfile, setHistoryProfile] = useState<UserProfile | null | undefined>();
  // 기록의 판정 당시 식단 없음(dietSnapshot null).
  const [scanProfileUnknown, setScanProfileUnknown] = useState(false);
  useEffect(() => () => {
    if (resultPhotoUrl?.startsWith('blob:')) URL.revokeObjectURL(resultPhotoUrl);
  }, [resultPhotoUrl]);
  const combinedHistory = [...localRecords, ...analysisHistory.filter(item => !localRecords.some(record => record.sourceScanId === item.id))];

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('han-spoon-language', language);
  }, [language]);

  const loadCurrentUser = async () => {
    try {
      const user = await getMe();
      setCurrentUser(user);
      const locallySelected = localStorage.getItem('han-spoon-language');
      if (isLanguage(locallySelected) && !isBackendLanguage(locallySelected)) {
        setLanguage(locallySelected);
      } else if (isLanguage(user.languageCode)) {
        setLanguage(user.languageCode);
      }
    } catch (error) {
      console.warn('Unable to fetch current user:', error);
      setCurrentUser(null);
    }
  };

  const loadUserProfile = async () => {
    try {
      const profile = await getProfile();
      // ProfileResponse에 languageCode가 없어 현재 앱 언어 사용.
      setUserProfile({
        nationality: profile.nationality ?? '',
        languageCode: (profile.languageCode as Language) ?? language,
        isFirstTime: Boolean(profile.isFirstTime),
        isVegan: Boolean(profile.isVegan),
        veganType: profile.veganType ?? null,
        hasReligion: Boolean(profile.hasReligion),
        religionType: profile.religionType ?? null,
        hasAllergies: Boolean(profile.hasAllergies),
        allergies: profile.allergies ?? [],
        noSpicy: Boolean(profile.noSpicy),
        noAlcohol: Boolean(profile.noAlcohol),
      });
    } catch (error) {
      console.warn('Unable to fetch profile:', error);
      setUserProfile(null);
    }
  };

  const loadHistory = async () => {
    try {
      setHistoryLoadFailed(false);
      const items = await getScanHistory();
      setAnalysisHistory(
        items.map((item) => ({
          id: item.scanId,
          title:
            item.title ??
            formatHistoryTitle(language, item.scannedAt ? new Date(item.scannedAt) : new Date()),
          date: item.scannedAt ?? new Date().toISOString(),
          menuCount: item.menuCount ?? 0,
          dangerCount: item.dangerCount ?? null,
          cautionCount: item.cautionCount ?? null,
          menus: [],
          store: item.store ?? null,
        })),
      );
    } catch (error) {
      console.warn('Unable to fetch scan history:', error);
      setHistoryLoadFailed(true);
    }
  };

  // 기록 열기: 서버 상세 조회 → 결과 화면.
  const openHistory = async (item: HistoryItem) => {
    setResultPhotoUrl(null);
    const local = localRecords.find(record => record.id === item.id);
    if (local) {
      setCurrentAnalysis(local.menus);
      setActiveRecordId(local.id);
      setActiveScanId(local.sourceScanId);
      setHistoryProfile(local.profileSnapshot);
      setScanProfileUnknown(false);
      setActiveScanStore(null);
      setActiveScanRecord(null);
      writeDemo('selected-restaurant', local.restaurantId);
      navigate('/results');
      return;
    }
    try {
      const result = await getScanResult(item.id);
      const snapshot = appliedScanProfile(result.dietSnapshot, userProfile, result.locale ?? language);
      setCurrentAnalysis((result.menus ?? []).map((menu, index) => mapMenuResult(menu, index, result.locale ?? language, snapshot)));
      setAnalysisImage(null);
      setActiveScanId(item.id);
      setActiveRecordId(undefined);
      // 스캔 당시 식단 기준, 없으면 '판정 기준 확인 불가'.
      setHistoryProfile(snapshot ?? undefined);
      setScanProfileUnknown(snapshot === null);
      setActiveScanStore(result.record?.store ?? result.store ?? null);
      setActiveScanRecord(result.record ?? null);
      writeDemo('selected-restaurant', null);
      navigate('/results');
    } catch (error) {
      console.error('Unable to open scan:', error);
      // 목록의 실패 알림용으로 다시 던짐.
      throw error;
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (localRecords.some(record => record.id === id)) { setLocalRecords(localRecords.filter(record => record.id !== id)); return; }
    try {
      await deleteScan(id);
      setAnalysisHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Delete scan failed:', error);
      throw error;
    }
  };

  const handleRenameHistory = async (id: string, title: string) => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle || normalizedTitle.length > 30) return;
    if (localRecords.some(record => record.id === id)) { setLocalRecords(localRecords.map(record => record.id === id ? { ...record, title: normalizedTitle } : record)); return; }
    try {
      await updateScanTitle(id, normalizedTitle);
      setAnalysisHistory((prev) => prev.map((item) => (item.id === id ? { ...item, title: normalizedTitle } : item)));
    } catch (error) {
      console.error('Rename scan failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (demoMode) return;
    if (getAccessToken()) {
      loadCurrentUser();
      getConsentStatus().then(status => {
        setConsentAccepted(status.hasRequiredConsents);
        if (status.hasRequiredConsents) {
          loadUserProfile();
          loadHistory();
        }
      }).catch(() => setConsentAccepted(false));
    }

    return () => {
      if (analysisImage?.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(analysisImage.previewUrl);
      }
    };
  }, []);

  const handleLanguageChange = async (languageValue: Language) => {
    setLanguage(languageValue);
    localStorage.setItem('han-spoon-language', languageValue);
    if (demoMode) return;

    try {
      const backendLanguage = toBackendLanguage(languageValue);
      await updateMe({ languageCode: backendLanguage });
      setCurrentUser((prev) => (prev ? { ...prev, languageCode: backendLanguage } : prev));
    } catch (error) {
      console.error('Language update failed:', error);
    }
  };

  const handleProfileSave = async (profile: UserProfile) => {
    if (demoMode) { writeDemo('profile', profile); setUserProfile(profile); setLanguage(profile.languageCode); navigate('/home'); return; }
    const payload: UserProfilePayload = {
      nationality: profile.nationality.toUpperCase(),
      languageCode: toBackendLanguage(profile.languageCode),
      isFirstTime: profile.isFirstTime,
      isVegan: profile.isVegan,
      veganType: profile.isVegan ? profile.veganType ?? null : null,
      hasReligion: profile.hasReligion,
      religionType: profile.hasReligion ? profile.religionType ?? null : null,
      hasAllergies: profile.hasAllergies,
      allergies: profile.hasAllergies ? profile.allergies : [],
      noSpicy: profile.noSpicy,
      noAlcohol: profile.noAlcohol,
    };

    // 신규 POST, 기존 PATCH. 신규인데 서버에 이미 있으면(409) PATCH.
    if (userProfile) {
      await updateProfile(payload);
    } else {
      try {
        await createProfile(payload);
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          await updateProfile(payload);
        } else {
          throw error;
        }
      }
    }

    const wasEdit = Boolean(userProfile);
    setUserProfile(profile);
    setLanguage(profile.languageCode);
    localStorage.setItem('han-spoon-language', profile.languageCode);
    await loadCurrentUser();
    navigate(wasEdit ? '/mypage' : '/home');
  };

  const handleLogin = async (hasProfile: boolean) => {
    await loadCurrentUser();
    const status = await getConsentStatus();
    setConsentAccepted(status.hasRequiredConsents);
    if (!status.hasRequiredConsents) {
      navigate('/terms');
      return;
    }

    if (hasProfile) {
      await loadUserProfile();
      navigate('/home');
      return;
    }

    navigate('/onboarding');
  };

  const handleConsentComplete = async () => {
    setConsentAccepted(true);
    if (demoMode) {
      const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
      navigate(returnTo === '/mypage' ? '/mypage' : '/onboarding');
      return;
    }
    const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
    if (returnTo === '/mypage') {
      navigate('/mypage');
      return;
    }
    const user = await getMe();
    setCurrentUser(user);
    if (user.hasProfile) {
      await loadUserProfile();
      navigate('/home');
    } else {
      navigate('/onboarding');
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
                onLogin={handleLogin}
                demoMode={demoMode}
                onTryDemo={startDemo}
                onExitDemo={exitDemo}
              />
            }
          />
          <Route
            path="/terms"
            element={<ConsentScreen language={language} demoMode={demoMode} onComplete={handleConsentComplete} onBack={() => navigate((location.state as { returnTo?: string } | null)?.returnTo ?? '/login')} />}
          />
          <Route
            path="/onboarding"
            element={
              !demoMode && !getAccessToken() ? <Navigate to="/login" replace /> : consentAccepted === null ? <div className="p-6">Loading...</div> : !consentAccepted ? <Navigate to="/terms" replace /> : <OnboardingScreen
                language={language}
                setLanguage={setLanguage}
                initialProfile={userProfile ?? undefined}
                onComplete={handleProfileSave}
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
          <Route path="/history" element={<ScanHistoryScreen language={language} history={combinedHistory} loadFailed={historyLoadFailed} onRetryLoad={() => void loadHistory()} onOpen={openHistory} onDelete={handleDeleteHistory} onRename={handleRenameHistory} />} />
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
                history={combinedHistory}
                onDeleteHistory={handleDeleteHistory}
                onRenameHistory={handleRenameHistory}
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
                  setActiveScanId(_scanId ?? undefined);
                  setActiveRecordId(undefined);
                  // 새 스캔의 판정 기준: 스캔 당시 식단(없으면 지금 식단).
                  setHistoryProfile(_scanId === null ? { ...(userProfile ?? RESULT_PREVIEW_PROFILE), languageCode: language } : appliedProfile ?? undefined);
                  setScanProfileUnknown(false);
                  setCurrentAnalysis(menus);
                  setActiveScanStore(store);
                  setActiveScanRecord(null);
                  setResultPhotoUrl(analysisImage?.previewUrl ?? null);
                  setAnalysisImage(null);
                  navigate('/results');
                  // 저장된 최신 기록으로 목록 갱신.
                  if (_scanId !== null) loadHistory();
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
                menus={currentAnalysis}
                userProfile={historyProfile === undefined ? userProfile : historyProfile}
                currentUserProfile={userProfile}
                sourceScanId={activeScanId}
                onSavedRecord={loadHistory}
                store={activeScanStore}
                record={activeScanRecord}
                savedRecordId={activeRecordId}
                demoMode={demoMode}
                menuPhotoUrl={resultPhotoUrl}
                scanProfileUnknown={scanProfileUnknown}
                onBack={() => { setResultPhotoUrl(null); navigate('/home'); }}
                onRescan={() => { setResultPhotoUrl(null); navigate('/scan'); }}
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
                setLanguage={handleLanguageChange}
                currentUser={currentUser}
                userProfile={userProfile}
                history={combinedHistory}
                historyLoadFailed={historyLoadFailed}
                onRetryHistory={() => void loadHistory()}
                onBack={() => navigate('/home')}
                onEditProfile={(section) =>
                  navigate('/onboarding', section ? { state: { editSection: section } } : undefined)
                }
                onHistoryClick={openHistory}
                onEditHistoryTitle={handleRenameHistory}
                onDeleteHistory={handleDeleteHistory}
                onTerms={() => navigate('/terms', { state: { returnTo: '/mypage' } })}
                onLogout={() => {
                  setUserProfile(null);
                  setCurrentUser(null);
                  navigate('/login');
                }}
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
