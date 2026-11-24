import { Component, type ErrorInfo, type ReactNode } from 'react';
import { hasScreenLoadFailure } from '../lazyScreen';
import { BowlTile } from './hs/RiskBadge';
import { HsButton } from './hs/Button';
import { HsIcon } from './hs/icons';
import type { Language } from '../types';
import { createTranslator, isLanguage, translateText } from '../locales';

interface ScreenErrorBoundaryProps {
  resetKey?: string;
  /** 다시 그리기 전 정리(예: 실패한 화면 코드 다시 받기) */
  onReset?: () => void;
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
    if (this.state.hasError && previous.resetKey !== this.props.resetKey) this.setState({ hasError: false });
  }

  reset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false });
  };

  render() {
    return this.state.hasError ? this.props.fallback(this.reset) : this.props.children;
  }
}

/** 판정을 보여 주는 화면 */
const VERDICT_PATHS = new Set(['/results', '/analyzing', '/dev/results-preview']);
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
  const needsReload = hasScreenLoadFailure();

  return <main role="alert" className="flex min-h-dvh flex-col items-center justify-center bg-hs-surface-100 px-5 py-10 text-hs-ink-900">
    <div className="w-full rounded-3xl border-[1.5px] border-[#F6CFCB] bg-hs-surface-0 px-5 pt-6 pb-5 text-center">
      <BowlTile className="mx-auto size-12 bg-[#FFE9E7] text-hs-danger-700"><HsIcon name="alert" size={22} strokeWidth={2.4} /></BowlTile>
      <h1 className="mt-3 text-[17px] font-black">{t('이 화면을 표시하지 못했어요.', 'This screen could not be shown.', 'تعذر عرض هذه الشاشة.')}</h1>
      <p className="mt-1.5 text-[13px] leading-[1.5] font-semibold text-hs-ink-500">{needsReload ? translateText(language, {
        ko: '화면 파일을 받지 못했어요. 새로고침하면 최신 화면을 불러옵니다. 저장하지 않은 입력은 사라질 수 있어요.',
        en: 'Screen files could not load. Reload for the latest version. Unsaved input may be lost.',
        ar: 'تعذر تحميل ملفات الشاشة. أعد التحميل للحصول على أحدث نسخة. قد تفقد المدخلات غير المحفوظة.',
        'zh-CN': '页面文件加载失败。刷新以获取最新版本，未保存的输入可能丢失。',
        'zh-TW': '頁面檔案載入失敗。重新整理以取得最新版本，未儲存的輸入可能遺失。',
        ja: '画面ファイルを読み込めませんでした。再読み込みで最新版を取得します。未保存の入力は失われる場合があります。',
        es: 'No se pudieron cargar los archivos. Recarga para obtener la última versión. Puedes perder los cambios sin guardar.',
      }) : onHome
        ? t('다시 시도하거나 홈으로 돌아가 주세요.', 'Try again or go back home.', 'حاول مرة أخرى أو عُد إلى الصفحة الرئيسية.')
        : t('잠시 후 다시 시도해 주세요.', 'Please try again in a moment.', 'يرجى المحاولة مرة أخرى بعد قليل.')}</p>
      {verdict && <p className="mt-4 rounded-[18px] bg-hs-unknown-100 p-3 text-start text-[13px] font-bold text-hs-unknown-700">
        {t('판정을 확인하지 못했어요. 먹기 전에 직원에게 재료를 확인하세요.', 'No result was confirmed. Ask staff about the ingredients before eating.', 'لم يتم تأكيد أي نتيجة. اسأل الموظف عن المكونات قبل تناول الطعام.')}
      </p>}
      <div className="mt-5 flex flex-col gap-2">
        <HsButton block onClick={onRetry}>{needsReload ? translateText(language, { ko: '새로고침하여 복구', en: 'Reload to recover', ar: 'أعد التحميل للاستعادة', 'zh-CN': '刷新恢复', 'zh-TW': '重新整理以復原', ja: '再読み込みして復旧', es: 'Recargar para recuperar' }) : t('다시 시도', 'Try again', 'حاول مرة أخرى')}</HsButton>
        {onHome && <HsButton block variant="outline" onClick={onHome}>{t('홈으로', 'Back home', 'العودة للرئيسية')}</HsButton>}
      </div>
    </div>
  </main>;
}

/** 화면 코드 받는 중 */
export function ScreenLoading({ language }: { language: Language }) {
  return <main role="status" className="flex min-h-dvh items-center justify-center bg-hs-surface-0">
    <span aria-hidden="true" className="size-7 animate-spin rounded-full border-[3px] border-hs-mint-200 border-t-hs-brand-700 motion-reduce:animate-none" />
    <span className="sr-only">{translateText(language, { ko: '불러오는 중', en: 'Loading', ar: 'جارٍ التحميل', 'zh-CN': '加载中', ja: '読み込み中', 'zh-TW': '載入中', es: 'Cargando' })}</span>
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
    // 저장소 접근 불가 시 기본 언어.
  }
  return 'ko';
}
