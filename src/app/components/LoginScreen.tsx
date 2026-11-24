import { useEffect, useState } from 'react';
import { ArrowLeft, Languages, LockKeyhole, LogIn, ScanLine } from 'lucide-react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import type { Language } from '../types';
import { googleLogin } from '../../api/auth';
import { createTranslator, LANGUAGE_LOCALES, LANGUAGE_OPTIONS } from '../locales';

const LOGIN_IMAGE =
  'https://commons.wikimedia.org/wiki/Special:FilePath/Samgyeopsal%20table.jpg?width=1200';
const GOOGLE_BUTTON_SCALE = 1.25;
const googleButtonWidthForViewport = () =>
  Math.floor(Math.min(350, window.innerWidth - 48) / GOOGLE_BUTTON_SCALE);

interface LoginScreenProps {
  onLogin: (hasProfile: boolean) => Promise<void> | void;
  language: Language;
  setLanguage: (language: Language) => void;
  demoMode: boolean;
  onExitDemo: () => void;
}

export function LoginScreen({ onLogin, language, setLanguage, demoMode, onExitDemo }: LoginScreenProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [googleButtonWidth, setGoogleButtonWidth] = useState(googleButtonWidthForViewport);
  const t = createTranslator(language);

  useEffect(() => {
    const resize = () => setGoogleButtonWidth(googleButtonWidthForViewport());
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const idToken = credentialResponse.credential;

      if (!idToken) {
        throw new Error(
          t(
            'Google ID Token을 받지 못했습니다.',
            'Failed to receive Google ID Token.',
            'تعذر استلام رمز Google ID.',
          ),
        );
      }

      const data = await googleLogin(idToken);
      await onLogin(Boolean(data.hasProfile));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t(
              '로그인 중 오류가 발생했습니다.',
              'An error occurred during login.',
              'حدث خطأ أثناء تسجيل الدخول.',
            ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setErrorMessage(
      t(
        'Google 로그인에 실패했습니다.',
        'Google sign-in failed.',
        'فشل تسجيل الدخول باستخدام Google.',
      ),
    );
  };

  return (
    <div className="relative h-dvh overflow-y-auto bg-brand-green-900 text-soy-ink" aria-busy={isLoading}>
      <section className="relative min-h-[235px] overflow-hidden px-5 pb-16 pt-[max(1rem,env(safe-area-inset-top))] text-white">
        <img
          src={LOGIN_IMAGE}
          alt=""
          className="absolute inset-0 size-full object-cover object-[center_58%] opacity-75"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,40,29,.2),rgba(12,40,29,.7)_68%,#104c37)]" />
        <div className="relative z-10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label={t('이전', 'Back', 'رجوع')}
            className="flex size-11 items-center justify-center rounded-full border border-white/20 bg-soy-ink/40 shadow-lg backdrop-blur-md"
          >
            <ArrowLeft className="size-5 rtl:rotate-180" />
          </button>

          <label className="relative flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-soy-ink/40 px-3 text-sm font-bold shadow-lg backdrop-blur-md">
            <Languages className="size-4" aria-hidden="true" />
            <select
              aria-label={t('언어 선택', 'Choose language', 'اختر اللغة')}
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
              className="appearance-none bg-transparent pe-4 outline-none"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="text-soy-ink">
                  {option.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute end-3 text-[10px] text-white/70">▾</span>
          </label>
        </div>
      </section>

      <main className="relative z-20 -mt-10 flex min-h-[calc(100dvh-195px)] flex-col rounded-t-[36px] bg-rice-white px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 shadow-[0_-20px_60px_rgba(3,24,15,.18)]">
        <div className="my-auto w-full max-w-[350px] self-center">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-[10px] font-extrabold tracking-[.15em] text-brand-primary">
                {t('WELCOME TO HAN SPOON', 'WELCOME TO HAN SPOON', 'مرحباً بك في HAN SPOON')}
              </p>
              <h1 className="text-[29px] font-extrabold leading-[1.2] tracking-[-0.035em]">
                {t(
                  '한국의 맛을\n편안하게 만나보세요.',
                  'Meet Korean food\nwith confidence.',
                  'استكشف الطعام الكوري\nبكل طمأنينة.',
                )
                  .split('\n')
                  .map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
              </h1>
            </div>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-primary-soft text-brand-primary">
              <ScanLine className="size-5" aria-hidden="true" />
            </span>
          </div>

          <p className="text-sm leading-6 text-text-secondary">
            {demoMode ? t(
              '시연 모드에서는 계정 없이 약관과 온보딩을 거쳐 주요 화면을 체험할 수 있어요.',
              'Explore the terms, onboarding, and main app screens without an account in demo mode.',
              'استكشف الشروط والتهيئة وشاشات التطبيق دون حساب في وضع العرض.',
            ) : t(
              '별도 회원가입 없이 Google 계정 하나로 시작할 수 있어요.',
              'Start with one Google account—no separate sign-up required.',
              'ابدأ بحساب Google واحد دون إنشاء حساب منفصل.',
            )}
          </p>

          {!demoMode && <div className="mt-8 flex min-h-16 w-full items-center justify-center">
            {isLoading ? (
              <button
                disabled
                aria-live="polite"
                className="flex h-16 w-full items-center justify-center gap-3 rounded-full bg-brand-primary text-white opacity-70"
              >
                <LogIn className="size-5" />
                <span className="font-bold">{t('로그인 중...', 'Signing in...', 'جارٍ تسجيل الدخول...')}</span>
              </button>
            ) : (
              <div className="shrink-0 scale-[1.25] overflow-hidden rounded-full shadow-[0_10px_26px_rgba(23,100,73,.12)]">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="outline"
                  size="large"
                  shape="pill"
                  text="continue_with"
                  // 타입에 없는 locale. 라이브러리가 남은 props를 initialize 설정으로 전달.
                  {...{ locale: language === 'zh-TW' ? 'zh_TW' : LANGUAGE_LOCALES[language] }}
                  width={String(googleButtonWidth)}
                />
              </div>
            )}
          </div>}

          {demoMode && <button type="button" onClick={onExitDemo} className="mt-3 min-h-11 w-full text-sm font-bold text-brand-green-700 underline">
            {t('Google 로그인으로 전환', 'Switch to Google sign-in', 'التبديل إلى تسجيل الدخول باستخدام Google')}
          </button>}

          {errorMessage && (
            <p className="mt-3 text-center text-xs font-semibold text-destructive" role="alert">
              {errorMessage}
            </p>
          )}

          <p className="mt-5 flex items-start justify-center gap-1.5 text-center text-[11px] leading-5 text-text-tertiary">
            <LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {demoMode ? t(
              '시연 설정과 기록은 이 브라우저에만 저장되며 서버 계정은 만들지 않아요.',
              'Demo settings and records stay in this browser; no server account is created.',
              'تبقى إعدادات العرض وسجلاته في هذا المتصفح دون إنشاء حساب على الخادم.',
            ) : t(
              '로그인 후 개인정보와 식단 정보는 내 프로필에서 관리할 수 있어요.',
              'Manage your personal and dietary information from your profile after signing in.',
              'يمكنك إدارة معلوماتك الشخصية والغذائية من ملفك بعد تسجيل الدخول.',
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
