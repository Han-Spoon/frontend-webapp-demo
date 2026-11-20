import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import type { Language } from '../App';
import { createTranslator, isLanguage } from '../locales';

interface ScreenErrorBoundaryProps {
  resetKey?: string;
  fallback: (reset: () => void) => ReactNode;
  children: ReactNode;
}

interface ScreenErrorBoundaryState {
  hasError: boolean;
}

export class ScreenErrorBoundary extends Component<ScreenErrorBoundaryProps, ScreenErrorBoundaryState> {
  state: ScreenErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ScreenErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[ScreenErrorBoundary]', error, info.componentStack);
  }

  componentDidUpdate(previous: ScreenErrorBoundaryProps) {
    if (this.state.hasError && previous.resetKey !== this.props.resetKey) this.reset();
  }

  reset = () => this.setState({ hasError: false });

  render() {
    return this.state.hasError ? this.props.fallback(this.reset) : this.props.children;
  }
}

/** 판정을 보여 주는 화면. */
const VERDICT_PATHS = new Set(['/results', '/analyzing', '/dev/results-preview', '/mypage/saved-menus']);
export const showsVerdicts = (pathname: string) =>
  VERDICT_PATHS.has(pathname) || /^\/restaurants\/[^/]+\/menu\/?$/.test(pathname);

interface ScreenErrorFallbackProps {
  language: Language;
  pathname: string;
  onRetry: () => void;
  onHome?: () => void;
}

export function ScreenErrorFallback({ language, pathname, onRetry, onHome }: ScreenErrorFallbackProps) {
  const t = createTranslator(language);
  const verdict = showsVerdicts(pathname);

  return <main role="alert" className="flex min-h-dvh flex-col items-center justify-center bg-rice-cream px-5 py-10">
    <div className="w-full rounded-[24px] border border-border-warm bg-surface-raised px-5 py-7 text-center shadow-[var(--shadow-card)]">
      <AlertCircle className="mx-auto mb-3 size-8 text-text-tertiary" aria-hidden="true" />
      <h1 className="text-lg font-extrabold text-text-primary">{t('이 화면을 표시하지 못했어요.', 'This screen could not be shown.', 'تعذر عرض هذه الشاشة.')}</h1>
      <p className="mt-2 text-sm text-text-secondary">{onHome
        ? t('다시 시도하거나 홈으로 돌아가 주세요.', 'Try again or go back home.', 'حاول مرة أخرى أو عُد إلى الصفحة الرئيسية.')
        : t('잠시 후 다시 시도해 주세요.', 'Please try again in a moment.', 'يرجى المحاولة مرة أخرى بعد قليل.')}</p>
      {verdict && <p className="mt-4 rounded-2xl border border-status-unknown-border bg-status-unknown-surface p-3 text-start text-sm font-bold text-status-unknown-text">
        {t('판정을 확인하지 못했어요. 먹기 전에 직원에게 재료를 확인하세요.', 'No result was confirmed. Ask staff about the ingredients before eating.', 'لم يتم تأكيد أي نتيجة. اسأل الموظف عن المكونات قبل تناول الطعام.')}
      </p>}
      <div className="mt-5 flex flex-col gap-2">
        <button type="button" onClick={onRetry} className="min-h-11 rounded-[18px] bg-brand-primary px-4 text-sm font-bold text-white">{t('다시 시도', 'Try again', 'حاول مرة أخرى')}</button>
        {onHome && <button type="button" onClick={onHome} className="min-h-11 rounded-[18px] border border-brand-primary px-4 text-sm font-bold text-brand-primary">{t('홈으로', 'Back home', 'العودة للرئيسية')}</button>}
      </div>
    </div>
  </main>;
}

/** App 바깥(라우터·언어 상태 이전) 오류용 언어. 저장소 접근 실패에도 동작. */
export function readFallbackLanguage(): Language {
  try {
    const requested = new URLSearchParams(window.location.search).get('lang');
    if (isLanguage(requested)) return requested;
    const saved = window.localStorage.getItem('han-spoon-language');
    if (isLanguage(saved)) return saved;
  } catch {
    // 저장소를 쓸 수 없으면 기본 언어.
  }
  return 'ko';
}
