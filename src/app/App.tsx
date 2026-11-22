import { Suspense } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getAccessToken } from '../api/auth';
import { AppRoutes } from './AppRoutes';
import { ScreenErrorBoundary, ScreenErrorFallback, ScreenLoading } from './components/ScreenErrorBoundary';
import { useAccount } from './hooks/useAccount';
import { useDocumentLanguage } from './hooks/useDocumentLanguage';
import { useResultSession } from './hooks/useResultSession';
import { useScanHistory } from './hooks/useScanHistory';
import { useShownLanguage } from './hooks/useShownLanguage';
import { retryFailedScreens } from './lazyScreen';

// 로그인·동의 없이 열리는 화면
const PUBLIC_PATHS = ['/', '/login', '/terms'];

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  // onSignedIn은 렌더 뒤(effect·이벤트)에만 호출되므로 그때는 scanHistory 준비됨.
  const account = useAccount({ onSignedIn: () => void scanHistory.loadHistory() });
  const scanHistory = useScanHistory(account.language, account.demoMode);
  const session = useResultSession();
  const { demoMode, consentAccepted } = account;
  const language = useShownLanguage(account.language);
  useDocumentLanguage(language ?? account.language);

  // 저장된 언어의 사전을 받는 중(zh-CN·ja·zh-TW·es 첫 화면)
  if (!language) return <div className="min-h-dvh bg-rice-cream" />;

  // 화면 가드: 로그인(시연 제외) → 필수 동의(시연 포함).
  if (!PUBLIC_PATHS.includes(location.pathname)) {
    if (!demoMode && !getAccessToken()) return <Navigate to="/login" replace />;
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
            <AppRoutes account={account} language={language} scanHistory={scanHistory} session={session} />
          </Suspense>
        </ScreenErrorBoundary>
      </div>
    </div>
  );
}
