import { useEffect, useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import symbol from '../../assets/brand/han-spoon-symbol.svg';
import type { Language } from '../types';
import { googleLogin } from '../../api/auth';
import { LANGUAGE_LOCALES } from '../locales';
import { FLIP_RTL, HsButton, HsIcon, HsIconButton, HS_TEXT, LanguageButton, tx, type AllText, type HsIconName } from './hs';

const T = {
  title: { ko: '한국의 맛을\n편안하게 만나보세요.', en: 'Meet Korean food\nwith confidence.', ar: 'استكشف الطعام الكوري\nبكل طمأنينة.', 'zh-CN': '轻松自在地\n品尝韩国美味。', ja: '韓国の味を\n気軽に楽しみましょう。', 'zh-TW': '輕鬆自在地\n品嚐韓國美味。', es: 'Descubre la comida coreana\ncon tranquilidad.' },
  noSignup: { ko: '별도 회원가입 없이 Google 계정 하나로 시작할 수 있어요.', en: 'Start with one Google account—no separate sign-up required.', ar: 'ابدأ بحساب Google واحد دون إنشاء حساب منفصل.', 'zh-CN': '无需另行注册，用一个 Google 账号即可开始。', ja: '会員登録なしで、Google アカウントひとつで始められます。', 'zh-TW': '不需另外註冊，用一個 Google 帳號即可開始。', es: 'Empieza con tu cuenta de Google, sin registrarte aparte.' },
  manage: { ko: '로그인 후 개인정보와 식단 정보는 내 프로필에서 관리할 수 있어요.', en: 'After signing in, manage your personal and dietary information from your profile.', ar: 'بعد تسجيل الدخول، يمكنك إدارة معلوماتك الشخصية والغذائية من ملفك.', 'zh-CN': '登录后，可在个人资料中管理个人信息和饮食信息。', ja: 'ログイン後、個人情報と食事情報はプロフィールで管理できます。', 'zh-TW': '登入後，可在個人檔案中管理個人資料與飲食資訊。', es: 'Tras iniciar sesión, gestiona tus datos personales y alimentarios desde tu perfil.' },
  demo: { ko: '시연 모드에서는 계정 없이 약관과 온보딩을 거쳐 주요 화면을 체험할 수 있어요.', en: 'In demo mode, explore the terms, onboarding, and main screens without an account.', ar: 'في وضع العرض، استكشف الشروط والتهيئة والشاشات الرئيسية دون حساب.', 'zh-CN': '演示模式下，无需账号即可体验条款、引导和主要页面。', ja: 'デモモードでは、アカウントなしで規約・初期設定・主な画面を体験できます。', 'zh-TW': '示範模式下，不需帳號即可體驗條款、引導與主要頁面。', es: 'En modo demo, recorre los términos, la configuración y las pantallas principales sin cuenta.' },
  demoNote: { ko: '시연 설정과 기록은 이 브라우저에만 저장되며 서버 계정은 만들지 않아요.', en: 'Demo settings and records stay in this browser; no server account is created.', ar: 'تبقى إعدادات العرض وسجلاته في هذا المتصفح دون إنشاء حساب على الخادم.', 'zh-CN': '演示设置和记录只保存在此浏览器中，不会创建服务器账号。', ja: 'デモの設定と記録はこのブラウザにのみ保存され、サーバーのアカウントは作成されません。', 'zh-TW': '示範設定與紀錄只存在此瀏覽器，不會建立伺服器帳號。', es: 'Los ajustes y registros de la demo se guardan solo en este navegador; no se crea una cuenta.' },
  switchGoogle: { ko: 'Google 로그인으로 전환', en: 'Switch to Google sign-in', ar: 'التبديل إلى تسجيل الدخول باستخدام Google', 'zh-CN': '切换为 Google 登录', ja: 'Google ログインに切り替え', 'zh-TW': '切換為 Google 登入', es: 'Cambiar a inicio con Google' },
  signingIn: { ko: '로그인 중...', en: 'Signing in...', ar: 'جارٍ تسجيل الدخول...', 'zh-CN': '正在登录...', ja: 'ログイン中...', 'zh-TW': '正在登入...', es: 'Iniciando sesión...' },
  noToken: { ko: 'Google ID Token을 받지 못했습니다.', en: 'Failed to receive Google ID Token.', ar: 'تعذر استلام رمز Google ID.', 'zh-CN': '未能获取 Google ID Token。', ja: 'Google ID トークンを受け取れませんでした。', 'zh-TW': '未能取得 Google ID Token。', es: 'No se recibió el token de ID de Google.' },
  failed: { ko: '로그인 중 오류가 발생했습니다.', en: 'An error occurred during login.', ar: 'حدث خطأ أثناء تسجيل الدخول.', 'zh-CN': '登录时发生错误。', ja: 'ログイン中にエラーが発生しました。', 'zh-TW': '登入時發生錯誤。', es: 'Se produjo un error al iniciar sesión.' },
  googleFailed: { ko: 'Google 로그인에 실패했습니다.', en: 'Google sign-in failed.', ar: 'فشل تسجيل الدخول باستخدام Google.', 'zh-CN': 'Google 登录失败。', ja: 'Google ログインに失敗しました。', 'zh-TW': 'Google 登入失敗。', es: 'Falló el inicio de sesión con Google.' },
} satisfies Record<string, AllText>;

// Google 공식 버튼 폭(최대 400). 화면 좌우 여백 24씩.
const googleButtonWidth = () => Math.max(200, Math.min(400, Math.min(window.innerWidth, 430) - 48));

interface LoginScreenProps {
  onLogin: (hasProfile: boolean) => Promise<void> | void;
  language: Language;
  setLanguage: (language: Language) => void;
  demoMode: boolean;
  onExitDemo: () => void;
}

/** 흐름 1 ② 로그인(Google 전용). 로고는 배경 워터마크만. */
export function LoginScreen({ onLogin, language, setLanguage, demoMode, onExitDemo }: LoginScreenProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [buttonWidth, setButtonWidth] = useState(googleButtonWidth);

  useEffect(() => {
    const resize = () => setButtonWidth(googleButtonWidth());
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const idToken = credentialResponse.credential;
      if (!idToken) throw new Error(tx(language, T.noToken));
      const data = await googleLogin(idToken);
      await onLogin(Boolean(data.hasProfile));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : tx(language, T.failed));
    } finally {
      setIsLoading(false);
    }
  };

  const notes: Array<{ icon: HsIconName; text: string }> = demoMode
    ? [{ icon: 'person', text: tx(language, T.demo) }, { icon: 'lock', text: tx(language, T.demoNote) }]
    : [{ icon: 'person', text: tx(language, T.noSignup) }, { icon: 'lock', text: tx(language, T.manage) }];

  return (
    <div className="h-dvh overflow-y-auto bg-hs-surface-0 text-hs-ink-900" aria-busy={isLoading}>
      <div className="relative overflow-hidden rounded-b-[56px] bg-hs-mint-100 pb-10">
        <img src={symbol} alt="" aria-hidden="true" className="pointer-events-none absolute -end-10 top-[120px] size-[200px] opacity-[0.16]" />
        <div className="relative flex items-center justify-between px-5 pt-[max(18px,env(safe-area-inset-top))]">
          <HsIconButton icon="back" label={tx(language, HS_TEXT.back)} iconClassName={FLIP_RTL} onClick={() => navigate('/')} />
          <LanguageButton language={language} setLanguage={setLanguage} short />
        </div>
        <div className="relative px-6 pt-14">
          <p lang="en" className="text-[11px] font-black tracking-[0.16em] text-hs-brand-700">WELCOME TO HAN SPOON</p>
          <h1 className="mt-2 whitespace-pre-line text-[30px] leading-[1.25] font-black tracking-[-0.02em]">{tx(language, T.title)}</h1>
          <svg width="44" height="14" viewBox="0 0 26 9" aria-hidden="true" className="mt-3 rtl:-scale-x-100">
            <ellipse cx="5" cy="4.5" rx="5" ry="4.2" fill="var(--hs-orange-500)" />
            <rect x="8" y="3" width="18" height="3.2" rx="1.6" fill="var(--hs-orange-500)" />
          </svg>
        </div>
      </div>

      <div className="px-6 pt-8 pb-[max(28px,env(safe-area-inset-bottom))]">
        {!demoMode && (
          <div className="flex min-h-[58px] items-center justify-center">
            {isLoading ? (
              <HsButton variant="outline" size="cta" busy aria-live="polite">{tx(language, T.signingIn)}</HsButton>
            ) : (
              <div className="overflow-hidden rounded-hs-pill">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setErrorMessage(tx(language, T.googleFailed))}
                  theme="outline"
                  size="large"
                  shape="pill"
                  text="continue_with"
                  // 타입에 없는 locale. 라이브러리가 남은 props를 initialize 설정으로 전달.
                  {...{ locale: language === 'zh-TW' ? 'zh_TW' : LANGUAGE_LOCALES[language] }}
                  width={String(buttonWidth)}
                />
              </div>
            )}
          </div>
        )}
        {demoMode && (
          <HsButton variant="outline" size="cta" onClick={onExitDemo}>{tx(language, T.switchGoogle)}</HsButton>
        )}
        {errorMessage && (
          <p role="alert" className="mt-3 flex items-start justify-center gap-1.5 text-center text-[13px] font-bold text-hs-danger-700">
            <HsIcon name="alert" size={14} strokeWidth={2.4} className="mt-0.5 flex-none" />
            {errorMessage}
          </p>
        )}
        <ul className="mt-7 flex flex-col gap-3.5">
          {notes.map((note) => (
            <li key={note.icon} className="flex items-start gap-3">
              <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded-hs-pill bg-hs-mint-100 text-hs-brand-700"><HsIcon name={note.icon} size={18} /></span>
              <p className="mt-[7px] text-[14px] leading-[1.5] font-semibold text-hs-ink-700">{note.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
