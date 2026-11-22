import { RotateCcw } from 'lucide-react';
import type { Language } from '../types';
import { translateText } from '../locales';

/** 서버 기록 목록 불러오기 실패 안내('기록 없음' 대신). 기기 저장 기록은 가리지 않음. */
export function HistoryLoadError({ language, onRetry }: { language: Language; onRetry: () => void }) {
  return (
    <div role="alert" className="mb-4 rounded-[20px] border border-border-warm bg-surface-raised px-5 py-5 text-center">
      <p className="text-sm font-bold text-text-primary">
        {translateText(language, {
          ko: '기록을 불러오지 못했어요.',
          en: 'Could not load your records.',
          ar: 'تعذر تحميل سجلاتك.',
          'zh-CN': '无法加载你的记录。',
          ja: '記録を読み込めませんでした。',
          'zh-TW': '無法載入你的記錄。',
          es: 'No se pudieron cargar tus registros.',
        })}
      </p>
      <p className="mt-1 text-xs text-text-secondary">
        {translateText(language, {
          ko: '연결을 확인하고 다시 시도해 주세요.',
          en: 'Check your connection and try again.',
          ar: 'تحقق من اتصالك وحاول مرة أخرى.',
          'zh-CN': '请检查网络连接后重试。',
          ja: '接続を確認して、もう一度お試しください。',
          'zh-TW': '請檢查網路連線後再試一次。',
          es: 'Revisa tu conexión e inténtalo de nuevo.',
        })}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-[18px] border border-brand-primary px-4 text-sm font-bold text-brand-primary"
      >
        <RotateCcw className="size-4" />
        {translateText(language, {
          ko: '다시 시도',
          en: 'Try again',
          ar: 'حاول مرة أخرى',
          'zh-CN': '重试',
          ja: '再試行',
          'zh-TW': '重試',
          es: 'Reintentar',
        })}
      </button>
    </div>
  );
}
