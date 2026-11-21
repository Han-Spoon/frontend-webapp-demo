import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearAuthData, getAccessToken } from '../../api/auth';
import { getConsentStatus } from '../../api/consent';
import { ApiError, createProfile, getMe, getProfile, updateMe, updateProfile } from '../../api/user';
import type { CurrentUser, UserProfilePayload } from '../../api/user';
import { readDemo, writeDemo } from '../demo/storage';
import { isBackendLanguage, isLanguage, toBackendLanguage, type Language } from '../locales';
import { FILMING_PROFILE as RESULT_PREVIEW_PROFILE } from '../results/filmingProfile';
import type { UserProfile } from '../types';

/**
 * 계정 상태: 시연 세션, 언어, 사용자·식단 프로필, 필수 동의.
 * `onSignedIn`: 첫 로드에서 로그인·동의가 확인되면 호출(기록 목록 불러오기).
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
    const saved = localStorage.getItem('han-spoon-language');
    return isLanguage(saved) ? saved : 'ko';
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => demoMode
    ? window.location.pathname === '/dev/results-preview' ? RESULT_PREVIEW_PROFILE : readDemo<UserProfile | null>('profile', null)
    : null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [consentAccepted, setConsentAccepted] = useState<boolean | null>(demoMode ? true : null);

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

  /** 마이페이지 언어 변경(로그인 시 서버에도 저장) */
  const changeLanguage = async (languageValue: Language) => {
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

    const wasEdit = Boolean(userProfile);
    setUserProfile(profile);
    setLanguage(profile.languageCode);
    localStorage.setItem('han-spoon-language', profile.languageCode);
    await loadCurrentUser();
    navigate(wasEdit ? '/mypage' : '/home');
  };

  /** 로그인 뒤 이동: 동의 전 → 약관, 프로필 있음 → 홈, 없음 → 온보딩 */
  const completeLogin = async (hasProfile: boolean) => {
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
    const user = await getMe();
    setCurrentUser(user);
    if (user.hasProfile) {
      await loadUserProfile();
      navigate('/home');
    } else {
      navigate('/onboarding');
    }
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
