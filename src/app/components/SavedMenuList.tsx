import { useEffect, useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { deleteSavedMenu, getSavedMenus, type SavedMenu } from '../../api/savedMenus';
import type { Language } from '../App';
import { createTranslator } from '../locales';
import { RiskBadge } from './results/ResultEvidence';

export function SavedMenuList({ language, onOpenScan }: { language: Language; onOpenScan: (scanId: string) => void }) {
  const t = createTranslator(language);
  const [items, setItems] = useState<SavedMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    getSavedMenus().then(result => { if (active) setItems(result); })
      .catch(requestError => { if (active) setError(requestError instanceof Error ? requestError.message : String(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const remove = async (id: string) => {
    setDeleting(id);
    setError('');
    try { await deleteSavedMenu(id); setItems(current => current.filter(item => item.scanMenuId !== id)); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : String(requestError)); }
    finally { setDeleting(null); }
  };
  if (loading) return <div className="flex justify-center p-8"><Loader2 className="size-6 animate-spin text-brand-primary" /></div>;
  return <div className="space-y-3 px-5 py-6">
    {error && <p role="alert" className="text-sm text-status-danger-text">{error}</p>}
    {!error && items.length === 0 && <p className="py-12 text-center text-sm text-text-secondary">{t('찜한 메뉴가 없어요', 'No saved menus yet', 'لا توجد أطباق محفوظة بعد')}</p>}
    {items.map(item => <article key={item.scanMenuId} className="rounded-2xl border border-border-warm bg-surface-raised p-4">
      <div className="mb-2 flex items-center justify-between gap-2"><RiskBadge level={item.riskLevel ?? 'unknown'} t={t} /><Heart className="size-4 fill-current text-brand-accent" /></div>
      <h3 className="font-extrabold">{item.displayName}</h3>
      {language !== 'ko' && item.translatedName && <p className="text-sm text-text-secondary">{item.translatedName}</p>}
      {item.store && <p className="mt-1 text-xs text-text-secondary">{item.store.name}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => onOpenScan(item.scanId)} className="min-h-11 flex-1 rounded-xl bg-brand-primary px-3 text-sm font-bold text-white">{t('결과 보기', 'View result', 'عرض النتيجة')}</button>
        <button type="button" disabled={deleting === item.scanMenuId} onClick={() => void remove(item.scanMenuId)} className="min-h-11 rounded-xl border border-border-warm px-3 text-sm font-bold text-text-secondary">{t('찜 해제', 'Remove', 'إزالة')}</button>
      </div>
    </article>)}
  </div>;
}
