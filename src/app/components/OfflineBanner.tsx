import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import type { Language } from '../App';
import { createTranslator } from '../locales';

export function OfflineBanner({ language, onRetry }: { language: Language; onRetry?: () => void }) {
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const t = createTranslator(language);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;

  return <div role="status" className="flex min-h-14 shrink-0 items-center gap-2 border-b border-[#35463d] bg-[#2b342e] py-1.5 ps-5 pe-3 text-xs font-bold text-[#f7f5ef]">
    <WifiOff className="size-4 shrink-0" aria-hidden="true" />
    <span className="min-w-0 flex-1 leading-4">{t('오프라인이에요. 연결을 확인해 주세요.', 'You are offline. Check your connection.', 'أنت غير متصل. تحقق من اتصالك.')}</span>
    <button type="button" onClick={onRetry ?? (() => window.location.reload())} className="min-h-11 shrink-0 px-2 font-extrabold text-[#72c6a0] underline underline-offset-2">{t('다시 시도', 'Try again', 'حاول مرة أخرى')}</button>
  </div>;
}
