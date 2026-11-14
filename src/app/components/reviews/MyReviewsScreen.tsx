import { useEffect, useState } from 'react';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { deleteReview, getMyReviews, type RestaurantReview } from '../../../api/reviews';
import type { Language, UserProfile } from '../../App';
import { deleteDemoReview, listDemoMyReviews } from '../../demo/reviews';
import { createTranslator } from '../../locales';
import { MealReviewSheet } from './MealReviewSheet';
import { ReviewCards } from './ReviewCards';

export function MyReviewsScreen({ language, profile, demoMode }: { language: Language; profile: UserProfile | null; demoMode: boolean }) {
  const navigate = useNavigate();
  const t = createTranslator(language);
  const [reviews, setReviews] = useState<RestaurantReview[]>(demoMode ? listDemoMyReviews() : []);
  const [editing, setEditing] = useState<RestaurantReview | null>(null);
  const [deleting, setDeleting] = useState<RestaurantReview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!demoMode);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (demoMode) return;
    let active = true;
    setLoading(true);
    setError('');
    getMyReviews().then(items => { if (active) setReviews(items); })
      .catch(() => { if (active) setError(t('후기를 불러오지 못했어요.', 'Could not load reviews.', 'تعذر تحميل المراجعات.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [demoMode, reload]);
  const remove = async () => {
    if (!deleting) return;
    try {
      if (demoMode) deleteDemoReview(deleting.id); else await deleteReview(deleting.id);
      setReviews(current => current.filter(item => item.id !== deleting.id));
      setDeleting(null);
    } catch { setError(t('후기를 삭제하지 못했어요.', 'Could not delete review.', 'تعذر حذف المراجعة.')); }
  };
  return <div className="flex h-dvh flex-col bg-surface-base text-text-primary">
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border-warm bg-surface-raised px-3"><button type="button" onClick={() => navigate('/mypage')} aria-label={t('뒤로', 'Back', 'رجوع')} className="flex size-11 items-center justify-center"><ArrowLeft className="size-5 rtl:rotate-180" /></button><h1 className="text-base font-extrabold">{t('내가 작성한 후기', 'My reviews', 'مراجعاتي')}</h1></header>
    <main className="flex-1 overflow-y-auto px-5 py-6"><p className="mb-4 text-sm text-text-secondary">{t('식당에 남긴 식사 후기를 모았어요.', 'Reviews you left for restaurants.', 'مراجعات الوجبات التي كتبتها للمطاعم.')}</p>{error && <div role="alert" className="mb-3 rounded-xl bg-status-danger-surface p-3 text-sm text-status-danger-text"><p>{error}</p><button type="button" onClick={() => setReload(value => value + 1)} className="mt-2 min-h-11 rounded-xl border border-status-danger-text px-3 font-bold">{t('다시 시도', 'Try again', 'حاول مرة أخرى')}</button></div>}{loading ? <p role="status" className="text-sm text-text-secondary">{t('불러오는 중…', 'Loading…', 'جارٍ التحميل…')}</p> : reviews.length ? <ReviewCards language={language} profile={profile} reviews={reviews} onEdit={setEditing} onDelete={setDeleting} /> : !error && <div className="rounded-2xl border border-border-warm bg-surface-raised py-12 text-center"><MessageSquare className="mx-auto mb-3 size-8 text-text-tertiary" /><p className="text-sm font-bold">{t('아직 작성한 후기가 없어요.', 'No reviews yet.', 'لم تكتب أي مراجعة بعد.')}</p></div>}</main>
    {editing && <MealReviewSheet language={language} profile={profile} store={{ id: editing.storeId, name: editing.storeName }} demoMode={demoMode} initialReview={editing} onClose={() => setEditing(null)} onSaved={next => setReviews(current => current.map(item => item.id === next.id ? next : item))} />}
    {deleting && <div role="dialog" aria-modal="true" aria-label={t('후기 삭제', 'Delete review', 'حذف المراجعة')} className="fixed inset-0 z-50 flex items-center justify-center bg-soy-ink/45 p-5"><div className="w-full max-w-sm rounded-2xl bg-surface-raised p-5"><h2 className="font-extrabold">{t('후기를 삭제할까요?', 'Delete this review?', 'هل تريد حذف هذه المراجعة؟')}</h2><p className="mt-2 text-sm text-text-secondary">{deleting.storeName}</p><div className="mt-5 flex gap-2"><button type="button" onClick={() => setDeleting(null)} className="min-h-11 flex-1 rounded-xl border border-border-warm text-sm font-bold">{t('취소', 'Cancel', 'إلغاء')}</button><button type="button" onClick={() => void remove()} className="min-h-11 flex-1 rounded-xl border border-status-danger-text text-sm font-bold text-status-danger-text">{t('삭제', 'Delete', 'حذف')}</button></div></div></div>}
  </div>;
}
