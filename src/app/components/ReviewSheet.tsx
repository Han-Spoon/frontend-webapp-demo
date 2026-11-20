import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { createReview, deleteReview, getStoreReviews, reportReview, updateReview, type Review, type ReviewAnswer, type ReviewMenu, type ReviewReportReason } from '../../api/reviews';
import type { Language, MenuAnalysis, UserProfile } from '../App';
import { createTranslator } from '../locales';
import { getProfileCommunicationItems, localizeMenuText } from '../results/resultViewModel';
import { BottomSheet } from './discovery/BottomSheet';

const reportReasons: Array<{ value: ReviewReportReason; ko: string; en: string; ar: string }> = [
  { value: 'inappropriate', ko: '부적절한 내용', en: 'Inappropriate', ar: 'محتوى غير مناسب' },
  { value: 'false_info', ko: '허위 정보', en: 'False information', ar: 'معلومات خاطئة' },
  { value: 'spam', ko: '광고·스팸', en: 'Spam', ar: 'رسائل مزعجة' },
  { value: 'other', ko: '기타', en: 'Other', ar: 'أخرى' },
];

export function ReviewSheet({ language, storeId, storeName, scanId, scanMenus = [], profile, initialReview, onClose }: {
  language: Language;
  storeId: number;
  storeName: string;
  scanId?: string;
  scanMenus?: MenuAnalysis[];
  profile: UserProfile | null;
  initialReview?: Review;
  onClose: () => void;
}) {
  const t = createTranslator(language);
  const profileItems = getProfileCommunicationItems(profile);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Review | null>(initialReview ?? null);
  const [writing, setWriting] = useState(Boolean(initialReview));
  const [formMenus, setFormMenus] = useState<ReviewMenu[]>(initialReview?.menus.map(menu => ({ ...menu, answers: { ...menu.answers } })) ?? []);
  const [menuFilter, setMenuFilter] = useState('');
  const [dietFilter, setDietFilter] = useState('');
  const [reporting, setReporting] = useState<string | null>(null);

  const refresh = async () => setReviews(await getStoreReviews(storeId));
  useEffect(() => {
    let active = true;
    getStoreReviews(storeId).then(items => { if (active) setReviews(items); })
      .catch(requestError => { if (active) setError(requestError instanceof Error ? requestError.message : String(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [storeId]);

  const myScanReview = reviews.find(review => review.mine && review.scanId === scanId);
  const visibleReviews = useMemo(() => reviews.filter(review =>
    (!menuFilter || review.menus.some(menu => menu.name === menuFilter)) &&
    (!dietFilter || review.menus.some(menu => dietFilter in menu.answers))), [reviews, menuFilter, dietFilter]);
  const menuNames = Array.from(new Set(reviews.flatMap(review => review.menus.map(menu => menu.name))));
  const addMenu = () => setFormMenus(current => {
    const next = scanMenus.find(menu => !current.some(item => item.scanMenuId === menu.id));
    return [...current, { name: next?.menuName ?? '', scanMenuId: scanId ? next?.id ?? null : null, answers: {}, comment: null }];
  });
  const startWrite = (review?: Review) => {
    setEditing(review ?? null);
    setFormMenus(review ? review.menus.map(menu => ({ name: menu.name, scanMenuId: menu.scanMenuId, answers: { ...menu.answers }, comment: menu.comment })) : []);
    setWriting(true);
    setError('');
  };
  const updateMenu = (index: number, update: Partial<ReviewMenu>) => setFormMenus(current => current.map((menu, menuIndex) => menuIndex === index ? { ...menu, ...update } : menu));
  const submit = async () => {
    const menus = formMenus.map(menu => ({ name: menu.name.trim(), scanMenuId: menu.scanMenuId ?? null, answers: menu.answers, comment: menu.comment?.trim() || null }));
    if (!menus.length || menus.some(menu => !menu.name || (!Object.keys(menu.answers).length && !menu.comment))) {
      setError(t('메뉴마다 식단 답변이나 메모를 남겨 주세요.', 'Add an answer or comment for every menu.', 'أضف إجابة أو تعليقاً لكل طبق.'));
      return;
    }
    if (new Set(menus.map(menu => menu.name.toLocaleLowerCase())).size !== menus.length) {
      setError(t('같은 메뉴를 두 번 넣을 수 없어요.', 'Each menu can appear only once.', 'لا يمكن تكرار الطبق.'));
      return;
    }
    setBusy(true); setError('');
    try {
      if (editing) await updateReview(editing.reviewId, menus);
      else await createReview(storeId, menus, scanId);
      await refresh(); setWriting(false); setEditing(null);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : String(requestError)); }
    finally { setBusy(false); }
  };
  const remove = async (reviewId: string) => {
    if (!window.confirm(t('이 후기를 삭제할까요?', 'Delete this review?', 'هل تريد حذف هذا التقييم؟'))) return;
    setBusy(true); setError('');
    try { await deleteReview(reviewId); await refresh(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : String(requestError)); }
    finally { setBusy(false); }
  };
  const sendReport = async (reviewId: string, reason: ReviewReportReason) => {
    setBusy(true); setError('');
    try { await reportReview(reviewId, reason); setReporting(null); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : String(requestError)); }
    finally { setBusy(false); }
  };

  return <BottomSheet language={language} title={writing ? t('식사 후기', 'Meal review', 'تقييم الوجبة') : `${storeName} · ${t('후기', 'Reviews', 'التقييمات')}`} onClose={onClose}>
    {error && <p role="alert" className="mb-3 rounded-xl bg-status-danger-surface p-3 text-xs text-status-danger-text">{error}</p>}
    {writing ? <div className="space-y-4">
      {formMenus.map((menu, index) => <fieldset key={index} className="rounded-2xl border border-border-warm p-3">
        <div className="flex items-center gap-2"><legend className="flex-1 text-sm font-extrabold">{t('메뉴', 'Menu', 'الطبق')} {index + 1}</legend><button type="button" onClick={() => setFormMenus(current => current.filter((_, i) => i !== index))} aria-label={t('메뉴 삭제', 'Remove menu', 'إزالة الطبق')}><Trash2 className="size-4" /></button></div>
        {scanId && scanMenus.length ? <select value={menu.scanMenuId ?? ''} onChange={event => { const selected = scanMenus.find(item => item.id === event.target.value); if (selected) updateMenu(index, { name: selected.menuName, scanMenuId: selected.id }); }} className="mt-2 min-h-11 w-full rounded-xl border border-border-warm bg-surface-raised px-3 text-sm"><option value="">{t('메뉴 선택', 'Select menu', 'اختر طبقاً')}</option>{scanMenus.map(item => <option key={item.id} value={item.id}>{item.menuName}</option>)}</select> : <input value={menu.name} maxLength={255} onChange={event => updateMenu(index, { name: event.target.value })} placeholder={t('메뉴 이름', 'Menu name', 'اسم الطبق')} className="mt-2 min-h-11 w-full rounded-xl border border-border-warm px-3 text-sm" />}
        {profileItems.map(item => <label key={item.id} className="mt-2 flex items-center gap-2 text-xs"><span className="flex-1">{localizeMenuText(item.label, language)}</span><select value={menu.answers[item.id] ?? ''} onChange={event => { const answers = { ...menu.answers }; if (event.target.value) answers[item.id] = event.target.value as ReviewAnswer; else delete answers[item.id]; updateMenu(index, { answers }); }} className="min-h-10 rounded-lg border border-border-warm bg-surface-raised px-2"><option value="">{t('응답 안 함', 'No answer', 'بدون إجابة')}</option><option value="present">{t('있었어요', 'Present', 'موجود')}</option><option value="absent">{t('없었어요', 'Absent', 'غير موجود')}</option><option value="unknown">{t('잘 모르겠어요', 'Not sure', 'لا أعرف')}</option></select></label>)}
        <textarea value={menu.comment ?? ''} onChange={event => updateMenu(index, { comment: event.target.value })} maxLength={500} rows={2} placeholder={t('더 남기고 싶은 말 (선택)', 'Optional comment', 'تعليق اختياري')} className="mt-3 w-full rounded-xl border border-border-warm p-3 text-sm" />
      </fieldset>)}
      {formMenus.length < 30 && <button type="button" onClick={addMenu} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border-warm text-sm font-bold"><Plus className="size-4" />{t('메뉴 추가', 'Add menu', 'أضف طبقاً')}</button>}
      <div className="flex gap-2"><button type="button" onClick={() => setWriting(false)} className="min-h-12 flex-1 rounded-xl border border-border-warm text-sm font-bold">{t('취소', 'Cancel', 'إلغاء')}</button><button type="button" disabled={busy} onClick={() => void submit()} className="min-h-12 flex-1 rounded-xl bg-brand-primary text-sm font-bold text-white">{busy ? t('저장 중…', 'Saving…', 'جار الحفظ…') : t('후기 저장', 'Save review', 'حفظ التقييم')}</button></div>
    </div> : <div>
      {(!scanId || !myScanReview) && <button type="button" onClick={() => { startWrite(); addMenu(); }} className="mb-4 min-h-12 w-full rounded-xl bg-brand-primary text-sm font-bold text-white">{t('후기 작성', 'Write a review', 'اكتب تقييماً')}</button>}
      <div className="mb-3 flex gap-2"><select value={menuFilter} onChange={event => setMenuFilter(event.target.value)} className="min-h-10 flex-1 rounded-xl border border-border-warm bg-surface-raised px-2 text-xs"><option value="">{t('모든 메뉴', 'All menus', 'كل الأطباق')}</option>{menuNames.map(name => <option key={name}>{name}</option>)}</select><select value={dietFilter} onChange={event => setDietFilter(event.target.value)} className="min-h-10 flex-1 rounded-xl border border-border-warm bg-surface-raised px-2 text-xs"><option value="">{t('모든 식단', 'All needs', 'كل الأنظمة')}</option>{profileItems.map(item => <option key={item.id} value={item.id}>{localizeMenuText(item.label, language)}</option>)}</select></div>
      {loading && <Loader2 className="mx-auto size-6 animate-spin text-brand-primary" />}
      {!loading && visibleReviews.length === 0 && <p className="py-8 text-center text-sm text-text-secondary">{t('아직 후기가 없어요.', 'No reviews yet.', 'لا توجد تقييمات بعد.')}</p>}
      <div className="space-y-3">{visibleReviews.map(review => <article key={review.reviewId} className="rounded-2xl border border-border-warm bg-surface-raised p-4">
        <p className="mb-2 text-xs text-text-tertiary">{new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(review.createdAt))}</p>
        {review.menus.map((menu, index) => <div key={index} className="border-t border-border-warm py-2 first:border-t-0"><p className="text-sm font-extrabold">{menu.name}</p>{Object.entries(menu.answers).map(([code, answer]) => <p key={code} className="mt-1 text-xs text-text-secondary">{localizeMenuText(profileItems.find(item => item.id === code)?.label ?? { ko: code, en: code }, language)} · {answer === 'present' ? t('있었어요', 'Present', 'موجود') : answer === 'absent' ? t('없었어요', 'Absent', 'غير موجود') : t('잘 모르겠어요', 'Not sure', 'لا أعرف')}</p>)}{menu.comment && <p className="mt-2 whitespace-pre-wrap text-sm">{menu.comment}</p>}</div>)}
        <div className="mt-2 flex gap-3 text-xs font-bold text-brand-primary">{review.mine ? <><button type="button" onClick={() => startWrite(review)}>{t('수정', 'Edit', 'تعديل')}</button><button type="button" disabled={busy} onClick={() => void remove(review.reviewId)}>{t('삭제', 'Delete', 'حذف')}</button></> : <button type="button" onClick={() => setReporting(review.reviewId)}>{t('신고', 'Report', 'إبلاغ')}</button>}</div>
        {reporting === review.reviewId && <div className="mt-3 grid grid-cols-2 gap-2">{reportReasons.map(reason => <button key={reason.value} type="button" disabled={busy} onClick={() => void sendReport(review.reviewId, reason.value)} className="min-h-10 rounded-xl border border-border-warm px-2 text-xs font-bold">{t(reason.ko, reason.en, reason.ar)}</button>)}</div>}
      </article>)}</div>
    </div>}
  </BottomSheet>;
}
