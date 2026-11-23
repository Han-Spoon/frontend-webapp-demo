import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { translateText, type Language } from '../locales';

export const preparingLabel = (language: Language) => translateText(language, {
  ko: '준비 중', en: 'Coming soon', ar: 'قريباً', 'zh-CN': '即将推出', 'zh-TW': '即將推出', ja: '準備中', es: 'Próximamente',
});
export const preparingMessage = (language: Language) => translateText(language, {
  ko: '이 기능은 준비 중이며 아직 이용할 수 없어요.',
  en: 'This feature is being prepared and is not available yet.',
  ar: 'هذه الميزة قيد الإعداد وليست متاحة بعد.',
  'zh-CN': '此功能正在准备中，暂时无法使用。',
  'zh-TW': '此功能正在準備中，暫時無法使用。',
  ja: 'この機能は準備中のため、まだ利用できません。',
  es: 'Estamos preparando esta función. Todavía no está disponible.',
});
export function FeaturePreparing({ language, title }: { language: Language; title: string }) {
  const navigate = useNavigate();
  return <main className="min-h-dvh bg-surface-base text-text-primary">
    <header className="flex h-16 items-center gap-3 border-b border-border-warm px-3">
      <button type="button" onClick={() => navigate('/mypage')} aria-label={translateText(language, { ko: '뒤로', en: 'Back', ar: 'رجوع', 'zh-CN': '返回', 'zh-TW': '返回', ja: '戻る', es: 'Volver' })} className="flex size-11 items-center justify-center"><ArrowLeft className="size-5 rtl:rotate-180" /></button>
      <h1 className="font-extrabold">{title}</h1>
    </header>
    <div role="status" className="m-5 rounded-2xl border border-border-warm bg-surface-raised p-6">
      <p className="font-bold">{preparingLabel(language)}</p><p className="mt-2 text-sm text-text-secondary">{preparingMessage(language)}</p>
    </div>
  </main>;
}
