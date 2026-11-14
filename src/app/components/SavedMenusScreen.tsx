import { useEffect, useState } from 'react';
import { ArrowLeft, Heart, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { deleteSavedMenu, getSavedMenus, type SavedMenu } from '../../api/savedMenus';
import type { Language } from '../App';
import { useDemoValue } from '../demo/storage';
import { createTranslator } from '../locales';
import { RiskBadge } from './results/ResultEvidence';

export function SavedMenusScreen({ language, demoMode }: { language: Language; demoMode: boolean }) {
  const navigate = useNavigate();
  const t = createTranslator(language);
  const [demoMenus, setDemoMenus] = useDemoValue<SavedMenu[]>('saved-menus', []);
  const [serverMenus, setServerMenus] = useState<SavedMenu[]>([]);
  const [loading, setLoading] = useState(!demoMode);
  const [error, setError] = useState('');
  useEffect(() => {
    if (demoMode) return;
    let active = true;
    getSavedMenus().then(items => { if (active) setServerMenus(items); })
      .catch(() => { if (active) setError(t('저장한 메뉴를 불러오지 못했어요.', 'Could not load saved menus.', 'تعذر تحميل الأطباق المحفوظة.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [demoMode]);
  const menus = demoMode ? demoMenus : serverMenus;
  const remove = async (item: SavedMenu) => {
    try {
      if (!demoMode) await deleteSavedMenu(item.id);
      if (demoMode) setDemoMenus(demoMenus.filter(menu => menu.id !== item.id));
      else setServerMenus(serverMenus.filter(menu => menu.id !== item.id));
    } catch {
      setError(t('찜을 해제하지 못했어요.', 'Could not remove this saved menu.', 'تعذرت إزالة الطبق المحفوظ.'));
    }
  };
  return <div className="flex h-dvh flex-col bg-surface-base text-text-primary">
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border-warm bg-surface-raised px-3">
      <button type="button" onClick={() => navigate('/mypage')} aria-label={t('뒤로', 'Back', 'رجوع')} className="flex size-11 items-center justify-center"><ArrowLeft className="size-5 rtl:rotate-180" /></button>
      <h1 className="text-base font-extrabold">{t('저장한 메뉴', 'Saved menus', 'الأطباق المحفوظة')}</h1>
    </header>
    <main className="flex-1 space-y-3 overflow-y-auto px-5 py-6">
      <p className="mb-5 text-sm text-text-secondary">{t('스캔 기록과 별도로 찜한 메뉴를 모았어요.', 'Menus you saved, separate from scan history.', 'الأطباق التي حفظتها منفصلة عن سجل المسح.')}</p>
      {error && <p role="alert" className="rounded-xl bg-status-danger-surface p-3 text-sm text-status-danger-text">{error}</p>}
      {loading && <p role="status" className="rounded-xl bg-surface-subtle p-4 text-sm text-text-secondary">{t('저장한 메뉴를 불러오는 중이에요.', 'Loading saved menus…', 'جارٍ تحميل الأطباق المحفوظة…')}</p>}
      {menus.map(item => <article key={item.id} className="rounded-[var(--radius-card)] border border-border-warm bg-surface-raised p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><RiskBadge level={item.riskLevel} t={t} /><h2 className="mt-2 break-words text-lg font-extrabold">{item.menuName}</h2></div>
          <button type="button" onClick={() => void remove(item)} aria-label={`${t('찜 해제', 'Remove saved menu', 'إزالة الطبق المحفوظ')}: ${item.menuName}`} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-accent-soft text-brand-accent"><Heart className="size-5 fill-current" /></button></div>
        {item.store && <p className="mt-3 flex items-center gap-1.5 text-sm text-text-secondary"><MapPin className="size-4 shrink-0" />{item.store.name}</p>}
      </article>)}
      {!menus.length && !error && !loading && <div className="rounded-[var(--radius-card)] border border-border-warm bg-surface-raised px-5 py-12 text-center"><Heart className="mx-auto mb-3 size-7 text-text-tertiary" /><p className="text-sm font-bold">{t('아직 찜한 메뉴가 없어요.', 'No saved menus yet.', 'لا توجد أطباق محفوظة بعد.')}</p></div>}
    </main>
  </div>;
}
