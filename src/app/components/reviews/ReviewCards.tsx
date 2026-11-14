import { useState } from 'react';
import { Flag, Pencil, Trash2 } from 'lucide-react';
import type { ReportReason, RestaurantReview } from '../../../api/reviews';
import type { Language, UserProfile } from '../../App';
import { createTranslator, LANGUAGE_LOCALES } from '../../locales';
import { getProfileCommunicationItems, localizeMenuText } from '../../results/resultViewModel';

export function ReviewCards({ language, profile, reviews, onEdit, onDelete, onReport }: {
  language: Language; profile?: UserProfile | null; reviews: RestaurantReview[];
  onEdit?: (review: RestaurantReview) => void;
  onDelete?: (review: RestaurantReview) => void;
  onReport?: (review: RestaurantReview, reason: ReportReason) => Promise<void>;
}) {
  const t = createTranslator(language);
  const labels = new Map(getProfileCommunicationItems(profile ?? null).map(item => [item.id, localizeMenuText(item.label, language)]));
  const [reporting, setReporting] = useState<string | null>(null);
  const [reported, setReported] = useState<string[]>([]);
  const [error, setError] = useState('');
  const reasons: [ReportReason, string][] = [
    ['INAPPROPRIATE', t('부적절한 내용', 'Inappropriate content', 'محتوى غير لائق')],
    ['FALSE_INFORMATION', t('허위 정보', 'False information', 'معلومات مضللة')],
    ['AD_SPAM', t('광고·스팸', 'Ads or spam', 'إعلان أو بريد مزعج')],
    ['OTHER', t('기타', 'Other', 'أخرى')],
  ];
  return <div className="space-y-3">
    {error && <p role="alert" className="rounded-xl bg-status-danger-surface p-3 text-xs text-status-danger-text">{error}</p>}
    {reviews.map(review => <article key={review.id} className="rounded-2xl border border-border-warm bg-surface-raised p-4">
      <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-extrabold">{review.storeName}</p><p className="mt-0.5 text-xs text-text-secondary">{new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], { dateStyle: 'medium' }).format(new Date(review.createdAt))}</p></div><span className="text-xs font-bold text-text-secondary">{review.mine ? t('내 후기', 'My review', 'مراجعتي') : t('방문자 후기', 'Visitor review', 'مراجعة زائر')}</span></div>
      {review.menus.map((menu, index) => <div key={`${menu.name}-${index}`} className="mt-3 rounded-xl bg-surface-subtle p-3"><p className="text-sm font-bold">{menu.name}</p>{Object.entries(menu.answers).map(([id, value]) => <p key={id} className="mt-1 text-xs text-text-secondary">{labels.get(id) ?? id} · {value === 'yes' ? t('있었어요', 'Yes', 'نعم') : value === 'no' ? t('없었어요', 'No', 'لا') : t('잘 모르겠어요', 'Not sure', 'لست متأكداً')}</p>)}{menu.note && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{menu.note}</p>}</div>)}
      <div className="mt-3 flex flex-wrap gap-2">{review.mine ? <>
        {onEdit && <button type="button" onClick={() => onEdit(review)} className="flex min-h-10 items-center gap-1 rounded-xl border border-border-warm px-3 text-xs font-bold"><Pencil className="size-3.5" />{t('수정', 'Edit', 'تعديل')}</button>}
        {onDelete && <button type="button" onClick={() => onDelete(review)} className="flex min-h-10 items-center gap-1 rounded-xl border border-border-warm px-3 text-xs font-bold text-status-danger-text"><Trash2 className="size-3.5" />{t('삭제', 'Delete', 'حذف')}</button>}
      </> : onReport && <button type="button" onClick={() => setReporting(reporting === review.id ? null : review.id)} disabled={reported.includes(review.id)} className="flex min-h-10 items-center gap-1 rounded-xl border border-border-warm px-3 text-xs font-bold text-text-secondary"><Flag className="size-3.5" />{reported.includes(review.id) ? t('신고 접수됨', 'Reported', 'تم الإبلاغ') : t('신고', 'Report', 'إبلاغ')}</button>}</div>
      {reporting === review.id && <div className="mt-3 rounded-xl bg-surface-subtle p-3"><p className="mb-2 text-xs font-bold">{t('신고 사유를 선택해 주세요.', 'Choose a reason.', 'اختر سبب الإبلاغ.')}</p><div className="grid grid-cols-2 gap-1.5">{reasons.map(([reason, label]) => <button type="button" key={reason} onClick={async () => { try { await onReport?.(review, reason); setReported(current => [...current, review.id]); setReporting(null); setError(''); } catch { setError(t('신고를 접수하지 못했어요.', 'Could not submit report.', 'تعذر إرسال الإبلاغ.')); } }} className="min-h-11 rounded-lg border border-border-warm bg-surface-raised px-2 text-xs font-semibold">{label}</button>)}</div></div>}
    </article>)}
  </div>;
}
