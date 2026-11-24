import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearAuthData, getAccessToken } from '../../api/auth';
import { getConsentStatus } from '../../api/consent';
import { ApiError, createProfile, getMe, getProfile, updateMe, updateProfile } from '../../api/user';
import type { CurrentUser, UserProfilePayload } from '../../api/user';
import { readDemo, writeDemo } from '../demo/storage';
import { isBackendLanguage, isLanguage, toBackendLanguage, type Language } from '../locales';
import { FILMING_PROFILE as RESULT_PREVIEW_PROFILE } from '../results/filmingProfile';
import type { UserProfile } from '../types';

/** 사용자가 이 기기에서 언어를 직접 고른 적이 있음(값은 'han-spoon-language') */
const LANGUAGE_CHOSEN_KEY = 'han-spoon-language-chosen';

/**
 * 계정 상태: 시연 세션, 언어, 사용자·식단 프로필, 필수 동의.
 * `onSignedIn`: 로그인·동의 확인 시 호출(첫 로드, 로그인 직후, 동의 직후). 기록 목록 불러오기.
 */
export function useAccount({ onSignedIn }: { onSignedIn: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [demoMode, setDemoMode] = useState(() => import.meta.env.VITE_DEMO_MODE === 'true'
    || sessionStorage.getItem('han-spoon-demo-session') === '1'
    || (import.meta.env.DEV && (new URLSearchParams(window.location.search).get('demo') === '1' || window.location.pathname === '/dev/results-preview')));
  const [language, setLanguage] = useState<Language>(() => {
    const requested = new URLSearchParams(window.location.search).get('lang');
    if (isLanguage(requested)) return requested;
    // 로그인 전에는 직접 고른 언어만 이어 쓴다(지난 계정의 서버 언어가 남아 첫 화면이 영어로 뜨지 않게). 기본은 한국어.
    const saved = localStorage.getItem('han-spoon-language');
    return isLanguage(saved) && (localStorage.getItem(LANGUAGE_CHOSEN_KEY) === '1' || getAccessToken()) ? saved : 'ko';
  });
  // loadCurrentUser(비동기)에서 지금 화면 언어를 읽기 위해
  const languageRef = useRef(language);
  languageRef.current = language;
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => demoMode
    ? window.location.pathname === '/dev/results-preview' ? RESULT_PREVIEW_PROFILE : readDemo<UserProfile | null>('profile', null)
    : null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [consentAccepted, setConsentAccepted] = useState<boolean | null>(demoMode ? true : null);

  const loadCurrentUser = async () => {
    try {
      const user = await getMe();
      setCurrentUser(user);
      // 화면 언어 정하기(문서 언어 훅이 지금 언어를 늘 기기에 적으므로 '직접 고름' 표시를 따로 본다):
      // - 이 기기에서 직접 고른 언어(랜딩 · 로그인 · 온보딩 · 마이페이지)는 그대로 두고 서버에도 맞춘다.
      // - 프로필이 아직 없는 새 계정(가입 중)은 지금 화면 언어(기본 한국어)를 유지하고 서버에 맞춘다.
      //   서버 기본값(en)이 한국어 화면을 덮던 문제(2026-11-25).
      // - 그 밖(다른 기기에서 쓰던 계정)은 서버 언어를 따른다.
      const chosen = localStorage.getItem(LANGUAGE_CHOSEN_KEY) === '1' ? localStorage.getItem('han-spoon-language') : null;
      const keep = isLanguage(chosen) ? chosen : !user.hasProfile ? languageRef.current : null;
      if (keep) {
        setLanguage(keep);
        if (isBackendLanguage(keep) && user.languageCode !== keep) {
          updateMe({ languageCode: keep })
            .then(() => setCurrentUser((prev) => (prev ? { ...prev, languageCode: keep } : prev)))
            .catch((syncError) => console.warn('Language sync failed:', syncError));
        }
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

  useEffect(() => {
    if (demoMode || !getAccessToken()) return;
    loadCurrentUser();
    getConsentStatus().then(status => {
      setConsentAccepted(status.hasRequiredConsents);
      if (status.hasRequiredConsents) {
        loadUserProfile();
        onSignedIn();
      }
    }).catch(() => setConsentAccepted(false));
  }, []);

  /** 시연 세션 시작: 로그인 토큰·시연 저장소 초기화. 이동은 호출부. */
  const beginDemo = () => {
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
    setConsentAccepted(false);
  };

  const exitDemo = () => {
    sessionStorage.removeItem('han-spoon-demo-session');
    setDemoMode(false);
    setUserProfile(null);
    setConsentAccepted(null);
    navigate('/login');
  };

  /** 로그인 전 · 온보딩 언어 선택: 화면 언어 + 이 기기에 기억(로그인 뒤 서버 언어가 덮지 않게). 서버 저장은 로그인 · 온보딩 저장 때. */
  const selectLanguage = (languageValue: Language) => {
    setLanguage(languageValue);
    localStorage.setItem('han-spoon-language', languageValue);
    localStorage.setItem(LANGUAGE_CHOSEN_KEY, '1');
  };

  /** 마이페이지 언어 변경(로그인 시 서버에도 저장) */
  const changeLanguage = async (languageValue: Language) => {
    selectLanguage(languageValue);
    if (demoMode) return;

    try {
      const backendLanguage = toBackendLanguage(languageValue);
      await updateMe({ languageCode: backendLanguage });
      setCurrentUser((prev) => (prev ? { ...prev, languageCode: backendLanguage } : prev));
    } catch (error) {
      console.error('Language update failed:', error);
    }
  };

  const saveProfile = async (profile: UserProfile) => {
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

    // 마이페이지에서 항목을 고친 경우만 마이페이지로, 처음 설정(약관 동의 뒤 온보딩)은 홈으로.
    const wasEdit = Boolean((location.state as { editSection?: string } | null)?.editSection);
    setUserProfile(profile);
    selectLanguage(profile.languageCode);
    await loadCurrentUser();
    navigate(wasEdit ? '/mypage' : '/home');
  };

  /** 로그인 뒤 이동: 동의 전 → 약관, 프로필 있음 → 홈, 없음 → 온보딩 */
  const completeLogin = async (hasProfile: boolean) => {
    // 로그인 화면에서 보던 언어(기본 한국어, 랜딩 · 로그인에서 바꿀 수 있음)를 그대로 이어 쓰고 서버에 맞춘다.
    selectLanguage(languageRef.current);
    await loadCurrentUser();
    const status = await getConsentStatus();
    setConsentAccepted(status.hasRequiredConsents);
    if (!status.hasRequiredConsents) {
      navigate('/terms');
      return;
    }
    onSignedIn();

    if (hasProfile) {
      await loadUserProfile();
      navigate('/home');
      return;
    }

    navigate('/onboarding');
  };

  const completeConsent = async () => {
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
    onSignedIn();
    // 약관 동의 뒤에는 항상 온보딩(흐름 1: 약관 → 언어 · 국가 · 식단). 이미 프로필이 있으면 채워 둔 채로 연다.
    const user = await getMe().catch(() => null);
    if (user) setCurrentUser(user);
    if (user?.hasProfile) await loadUserProfile();
    navigate('/onboarding');
  };

  /** 로그아웃·탈퇴 뒤 화면 상태 정리 */
  const clearSession = () => {
    setUserProfile(null);
    setCurrentUser(null);
    navigate('/login');
  };

  return {
    demoMode,
    language,
    setLanguage,
    selectLanguage,
    userProfile,
    currentUser,
    consentAccepted,
    beginDemo,
    exitDemo,
    changeLanguage,
    saveProfile,
    completeLogin,
    completeConsent,
    clearSession,
  };
}

export type Account = ReturnType<typeof useAccount>;
