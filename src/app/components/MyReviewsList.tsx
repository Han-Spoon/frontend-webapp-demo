import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { deleteReview, getMyReviews, type Review } from '../../api/reviews';
import type { Language, UserProfile } from '../App';
import { createTranslator } from '../locales';
import { ReviewSheet } from './ReviewSheet';

export function MyReviewsList({ language, profile }: { language: Language; profile: UserProfile | null }) {
  const t = createTranslator(language);
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Review | null>(null);
  const refresh = async () => setItems(await getMyReviews());
  useEffect(() => {
    let active = true;
    getMyReviews().then(result => { if (active) setItems(result); })
      .catch(requestError => { if (active) setError(requestError instanceof Error ? requestError.message : String(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const remove = async (reviewId: string) => {
    if (!window.confirm(t('이 후기를 삭제할까요?', 'Delete this review?', 'هل تريد حذف هذا التقييم؟'))) return;
    setError('');
    try { await deleteReview(reviewId); await refresh(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : String(requestError)); }
  };
  return <div className="space-y-3 px-5 py-6">
    {loading && <Loader2 className="mx-auto size-6 animate-spin text-brand-primary" />}
    {error && <p role="alert" className="text-sm text-status-danger-text">{error}</p>}
    {!loading && !error && items.length === 0 && <p className="py-12 text-center text-sm text-text-secondary">{t('작성한 후기가 없어요', 'No reviews written yet', 'لم تكتب أي تقييمات بعد')}</p>}
    {items.map(item => <article key={item.reviewId} className="rounded-2xl border border-border-warm bg-surface-raised p-4">
      <p className="font-extrabold">{item.storeName}</p>
      <p className="mt-1 text-sm text-text-secondary">{item.menus.map(menu => menu.name).join(' · ')}</p>
      {item.hidden && <p className="mt-2 text-xs font-bold text-status-caution-text">{t('숨겨진 후기', 'Hidden review', 'تقييم مخفي')}</p>}
      <div className="mt-3 flex gap-3 text-sm font-bold text-brand-primary"><button type="button" onClick={() => setEditing(item)}>{t('수정', 'Edit', 'تعديل')}</button><button type="button" onClick={() => void remove(item.reviewId)}>{t('삭제', 'Delete', 'حذف')}</button></div>
    </article>)}
    {editing && <ReviewSheet language={language} storeId={editing.storeId} storeName={editing.storeName} scanId={editing.scanId ?? undefined} profile={profile} initialReview={editing} onClose={() => { setEditing(null); void refresh().catch(requestError => setError(requestError instanceof Error ? requestError.message : String(requestError))); }} />}
  </div>;
}
