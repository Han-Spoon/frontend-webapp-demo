import { isEndpointUnavailable } from '../../../api/user';
import { liveFeatures } from '../../featureAvailability';
import { FeaturePreparing } from '../FeaturePreparing';
import { translateText } from '../../locales';
import { remoteFeatureUnavailable } from '../remoteFeatureMessage';
import { useEffect, useState } from 'react';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { deleteReview, getMyReviews, type RestaurantReview } from '../../../api/reviews';
import type { Language, UserProfile } from '../../types';
import { deleteDemoReview, listDemoMyReviews } from '../../demo/reviews';
import { createTranslator } from '../../locales';
import { MealReviewSheet } from './MealReviewSheet';
import { ReviewCards } from './ReviewCards';
import { OfflineBanner } from '../OfflineBanner';
import { ConfirmDialog } from '../common/ConfirmDialog';

export function MyReviewsScreen({ language, profile, demoMode }: { language: Language; profile: UserProfile | null; demoMode: boolean }) {
  if (!demoMode && !liveFeatures.reviews) return <FeaturePreparing language={language} title={translateText(language, { ko: '내가 작성한 후기', en: 'My reviews', ar: 'مراجعاتي', 'zh-CN': '我的评价', 'zh-TW': '我的評論', ja: '自分のレビュー', es: 'Mis reseñas' })} />;
  return <MyReviewsContent language={language} profile={profile} demoMode={demoMode} />;
}
function MyReviewsContent({ language, profile, demoMode }: { language: Language; profile: UserProfile | null; demoMode: boolean }) {
  const navigate = useNavigate();
  const t = createTranslator(language);
  const [reviews, setReviews] = useState<RestaurantReview[]>(demoMode ? listDemoMyReviews() : []);
  const [editing, setEditing] = useState<RestaurantReview | null>(null);
  const [deleting, setDeleting] = useState<RestaurantReview | null>(null);
  const [removing, setRemoving] = useState(false);
  // 삭제 실패는 확인창 안에 표시(페이지 알림은 확인창에 가려짐).
  const [deleteError, setDeleteError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!demoMode);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (demoMode) return;
    let active = true;
    setLoading(true);
    setError('');
    getMyReviews().then(items => { if (active) setReviews(items); })
      .catch(error => { if (active) setError(isEndpointUnavailable(error) ? remoteFeatureUnavailable(language) : t('후기를 불러오지 못했어요.', 'Could not load reviews.', 'تعذر تحميل المراجعات.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [demoMode, reload]);
  const remove = async () => {
    if (!deleting || removing) return;
    setRemoving(true);
    setDeleteError('');
    try {
      if (demoMode) deleteDemoReview(deleting.id); else await deleteReview(deleting.id);
      setReviews(current => current.filter(item => item.id !== deleting.id));
      setDeleting(null);
    } catch { setDeleteError(t('후기를 삭제하지 못했어요.', 'Could not delete review.', 'تعذر حذف المراجعة.')); }
    finally { setRemoving(false); }
  };
  return <div className="flex h-dvh flex-col bg-surface-base text-text-primary">
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border-warm bg-surface-raised px-3"><button type="button" onClick={() => navigate('/mypage')} aria-label={t('뒤로', 'Back', 'رجوع')} className="flex size-11 items-center justify-center"><ArrowLeft className="size-5 rtl:rotate-180" /></button><h1 className="text-base font-extrabold">{t('내가 작성한 후기', 'My reviews', 'مراجعاتي')}</h1></header>
    <OfflineBanner language={language} onRetry={() => setReload(value => value + 1)} />
    <main className="flex-1 overflow-y-auto px-5 py-6"><p className="mb-4 text-sm text-text-secondary">{t('식당에 남긴 식사 후기를 모았어요.', 'Reviews you left for restaurants.', 'مراجعات الوجبات التي كتبتها للمطاعم.')}</p>{error && <div role="alert" className="mb-3 rounded-xl bg-status-danger-surface p-3 text-sm text-status-danger-text"><p>{error}</p><button type="button" onClick={() => setReload(value => value + 1)} className="mt-2 min-h-11 rounded-xl border border-status-danger-text px-3 font-bold">{t('다시 시도', 'Try again', 'حاول مرة أخرى')}</button></div>}{loading ? <p role="status" className="text-sm text-text-secondary">{t('불러오는 중…', 'Loading…', 'جارٍ التحميل…')}</p> : reviews.length ? <ReviewCards language={language} profile={profile} reviews={reviews} onEdit={setEditing} onDelete={setDeleting} /> : !error && <div className="rounded-2xl border border-border-warm bg-surface-raised py-12 text-center"><MessageSquare className="mx-auto mb-3 size-8 text-text-tertiary" /><p className="text-sm font-bold">{t('아직 작성한 후기가 없어요.', 'No reviews yet.', 'لم تكتب أي مراجعة بعد.')}</p></div>}</main>
    {editing && <MealReviewSheet language={language} profile={profile} store={{ id: editing.storeId, name: editing.storeName }} demoMode={demoMode} initialReview={editing} onClose={() => setEditing(null)} onSaved={next => setReviews(current => current.map(item => item.id === next.id ? next : item))} />}
    {deleting && <ConfirmDialog
      language={language}
      tone="danger"
      title={t('후기를 삭제할까요?', 'Delete this review?', 'هل تريد حذف هذه المراجعة؟')}
      description={<span dir="auto">{deleting.storeName}</span>}
      cancelLabel={t('취소', 'Cancel', 'إلغاء')}
      confirmLabel={t('삭제', 'Delete', 'حذف')}
      busy={removing}
      error={deleteError}
      onCancel={() => { setDeleting(null); setDeleteError(''); }}
      onConfirm={() => void remove()}
    />}
  </div>;
}
