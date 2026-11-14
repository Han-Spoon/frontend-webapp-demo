import { useEffect, useState } from 'react';
import { ArrowLeft, Languages, LockKeyhole, LogIn, ScanLine, ShieldCheck } from 'lucide-react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/brand/han-spoon-logo.svg';
import type { Language } from '../App';
import { googleLogin } from '../../api/auth';
import { createTranslator, LANGUAGE_LOCALES, LANGUAGE_OPTIONS } from '../locales';

const LOGIN_IMAGE =
  'https://commons.wikimedia.org/wiki/Special:FilePath/Samgyeopsal%20table.jpg?width=1200';

interface LoginScreenProps {
  onLogin: (hasProfile: boolean) => Promise<void> | void;
  language: Language;
  setLanguage: (language: Language) => void;
}

export function LoginScreen({ onLogin, language, setLanguage }: LoginScreenProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [ageGroup, setAgeGroup] = useState<'OVER_14' | 'UNDER_14' | null>(null);
  const [guardianCode, setGuardianCode] = useState('');
  const [googleButtonWidth, setGoogleButtonWidth] = useState(() =>
    Math.min(336, Math.max(240, window.innerWidth - 48)),
  );
  const t = createTranslator(language);

  useEffect(() => {
    const resize = () =>
      setGoogleButtonWidth(Math.min(336, Math.max(240, window.innerWidth - 48)));
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

      if (!ageGroup) throw new Error(t('연령 구간을 먼저 선택해 주세요.', 'Choose your age group first.', 'اختر فئتك العمرية أولاً.'));
      if (ageGroup === 'UNDER_14' && !/^hs-[A-Za-z0-9_-]{40,60}$/.test(guardianCode.trim())) {
        throw new Error(t('보호자 승인 코드를 입력해 주세요.', 'Enter the guardian approval code.', 'أدخل رمز موافقة ولي الأمر.'));
      }
      const data = await googleLogin(idToken, ageGroup, ageGroup === 'UNDER_14' ? guardianCode.trim() : undefined);
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
      <section className="relative min-h-[285px] overflow-hidden px-5 pb-16 pt-[max(1rem,env(safe-area-inset-top))] text-white">
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

        <div className="relative z-10 mt-14">
          <span className="inline-flex rounded-2xl bg-rice-white/95 px-3 py-2 shadow-lg">
            <img src={logo} alt={t('한스푼', 'Han Spoon', 'هان سبون')} className="h-auto w-[112px]" />
          </span>
        </div>
      </section>

      <main className="relative z-20 -mt-10 min-h-[calc(100dvh-245px)] rounded-t-[36px] bg-rice-white px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 shadow-[0_-20px_60px_rgba(3,24,15,.18)]">
        <div className="mx-auto max-w-[350px]">
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
            {t(
              '별도 회원가입 없이 Google 계정 하나로 시작할 수 있어요.',
              'Start with one Google account—no separate sign-up required.',
              'ابدأ بحساب Google واحد دون إنشاء حساب منفصل.',
            )}
          </p>

          <fieldset className="mt-5 space-y-2">
            <legend className="mb-2 text-sm font-bold text-soy-ink">{t('연령을 확인해 주세요', 'Confirm your age group', 'أكد فئتك العمرية')}</legend>
            <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${ageGroup === 'OVER_14' ? 'border-brand-green-700 bg-brand-green-50' : 'border-border-warm bg-rice-white'}`}>
              <input type="radio" name="age-group" value="OVER_14" checked={ageGroup === 'OVER_14'} onChange={() => setAgeGroup('OVER_14')} className="size-4 accent-brand-green-700" />
              {t('만 14세 이상입니다', 'I am 14 or older', 'عمري 14 عامًا أو أكثر')}
            </label>
            <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${ageGroup === 'UNDER_14' ? 'border-brand-green-700 bg-brand-green-50' : 'border-border-warm bg-rice-white'}`}>
              <input type="radio" name="age-group" value="UNDER_14" checked={ageGroup === 'UNDER_14'} onChange={() => setAgeGroup('UNDER_14')} className="size-4 accent-brand-green-700" />
              {t('만 14세 미만입니다', 'I am under 14', 'عمري أقل من 14 عامًا')}
            </label>
          </fieldset>

          {ageGroup === 'UNDER_14' && <div className="mt-4 rounded-2xl border border-brand-green-700/30 bg-brand-green-50 p-4 text-sm leading-6 text-soy-ink">
            <p className="font-bold">{t('보호자 동의가 먼저 필요해요.', 'A legal guardian must consent first.', 'يجب الحصول على موافقة ولي الأمر أولاً.')}</p>
            <p className="mt-1 text-sesame-gray">{t('보호자가 약관 전문을 요청하고 답장으로 명시적으로 동의하면, 운영팀이 확인 후 승인 코드를 전달합니다.', 'Your guardian can request the full terms and explicitly consent by email reply. Our team provides an approval code after verification.', 'يمكن لولي أمرك طلب الشروط الكاملة والموافقة عليها برد صريح عبر البريد الإلكتروني. سيرسل فريقنا رمز الموافقة بعد التحقق.')}</p>
            <a className="mt-2 inline-block font-bold text-brand-green-700 underline" href="mailto:support@han-spoon.com">support@han-spoon.com</a>
            <button type="button" className="ms-3 font-bold text-brand-green-700 underline" onClick={() => navigate('/terms')}>{t('약관 보기', 'View terms', 'عرض الشروط')}</button>
            <label className="mt-4 block font-bold" htmlFor="guardian-code">{t('보호자 승인 코드', 'Guardian approval code', 'رمز موافقة ولي الأمر')}</label>
            <input id="guardian-code" type="text" value={guardianCode} onChange={(event) => setGuardianCode(event.target.value)} autoComplete="off" spellCheck={false} dir="ltr" placeholder="hs-…" className="mt-2 min-h-12 w-full rounded-xl border border-border-warm bg-rice-white px-3 font-mono text-sm outline-brand-green-700" />
            <p className="mt-1 text-xs text-sesame-gray">{t('코드는 보호자에게 전달됩니다. 보호자와 함께 입력해 주세요.', 'The code is sent to your guardian. Enter it together.', 'يُرسل الرمز إلى ولي أمرك. أدخله معه.')}</p>
          </div>}

          <div className="my-6 rounded-[22px] bg-brand-primary-soft p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rice-white text-brand-primary shadow-sm">
                <ShieldCheck className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-brand-green-900">
                  {t('Google로만 로그인해요', 'Google sign-in only', 'تسجيل الدخول عبر Google فقط')}
                </p>
                <p className="mt-1 text-xs leading-5 text-text-secondary">
                  {t(
                    '이메일 비밀번호를 새로 만들 필요 없이 기존 Google 인증 흐름을 사용해요.',
                    'Use Google’s existing authentication flow without creating another password.',
                    'استخدم مصادقة Google الحالية دون إنشاء كلمة مرور أخرى.',
                  )}
                </p>
              </div>
            </div>
          </div>

          {(ageGroup === 'OVER_14' || (ageGroup === 'UNDER_14' && /^hs-[A-Za-z0-9_-]{40,60}$/.test(guardianCode.trim()))) && <div className="flex min-h-14 w-full items-center justify-center">
            {isLoading ? (
              <button
                disabled
                aria-live="polite"
                className="flex h-14 w-full items-center justify-center gap-3 rounded-full bg-brand-primary text-white opacity-70"
              >
                <LogIn className="size-5" />
                <span className="font-bold">{t('로그인 중...', 'Signing in...', 'جارٍ تسجيل الدخول...')}</span>
              </button>
            ) : (
              <div className="overflow-hidden rounded-full shadow-[0_10px_26px_rgba(23,100,73,.12)]">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="outline"
                  size="large"
                  shape="pill"
                  text="continue_with"
                  locale={language === 'zh-TW' ? 'zh_TW' : LANGUAGE_LOCALES[language]}
                  width={String(googleButtonWidth)}
                />
              </div>
            )}
          </div>}

          {errorMessage && (
            <p className="mt-3 text-center text-xs font-semibold text-destructive" role="alert">
              {errorMessage}
            </p>
          )}

          <p className="mt-5 flex items-start justify-center gap-1.5 text-center text-[11px] leading-5 text-text-tertiary">
            <LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {t(
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
