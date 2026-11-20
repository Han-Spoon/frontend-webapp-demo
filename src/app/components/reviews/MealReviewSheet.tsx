import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { MapPin, Plus, X } from 'lucide-react';
import { createReview, updateReview, type RestaurantReview, type ReviewAnswer, type ReviewMenu } from '../../../api/reviews';
import type { Language, UserProfile } from '../../App';
import { saveDemoReview } from '../../demo/reviews';
import { createTranslator } from '../../locales';
import { getProfileCommunicationItems, localizeMenuText } from '../../results/resultViewModel';

type Store = { id: string | number; name: string };

export function MealReviewSheet({ language, profile, store, menuNames = [], scanId, scanMenuIds = {}, demoMode,
  initialReview, onClose, onSaved }: {
  language: Language; profile: UserProfile | null; store: Store; menuNames?: string[];
  /** 스캔에서 쓴 후기일 때 메뉴 이름 → scanMenuId(명세 V2). */
  scanId?: string; scanMenuIds?: Record<string, string>; demoMode: boolean; initialReview?: RestaurantReview;
  onClose: () => void; onSaved: (review: RestaurantReview) => void;
}) {
  const t = createTranslator(language);
  const items = getProfileCommunicationItems(profile);
  const initialNames = initialReview?.menus.map(menu => menu.name) ?? menuNames;
  const [available, setAvailable] = useState<string[]>(initialNames);
  const [selected, setSelected] = useState<string[]>(initialReview?.menus.map(menu => menu.name) ?? []);
  const [draftName, setDraftName] = useState('');
  const [menus, setMenus] = useState<Record<string, ReviewMenu>>(() => Object.fromEntries(
    (initialReview?.menus ?? []).map(menu => [menu.name, menu]),
  ));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const overLimit = selected.some(name => (menus[name]?.note ?? '').length > 500);

  const addMenu = () => {
    const name = draftName.trim();
    if (!name || name.length > 200 || available.includes(name)) return;
    setAvailable(current => [...current, name]);
    setSelected(current => [...current, name]);
    setDraftName('');
  };
  const toggleMenu = (name: string) => {
    setSelected(current => current.includes(name) ? current.filter(item => item !== name) : [...current, name]);
  };
  const setAnswer = (name: string, itemId: string, answer: ReviewAnswer) => {
    setMenus(current => ({ ...current, [name]: {
      name, note: current[name]?.note ?? '', answers: { ...current[name]?.answers, [itemId]: answer },
    } }));
  };
  const setNote = (name: string, note: string) => {
    setMenus(current => ({ ...current, [name]: { name, answers: current[name]?.answers ?? {}, note } }));
  };
  const save = async () => {
    if (!selected.length || overLimit || saving) return;
    setSaving(true);
    setError('');
    try {
      const payload = selected.map(name => {
        const menu = menus[name] ?? { name, answers: {}, note: '' };
        const scanMenuId = menu.scanMenuId ?? (scanId ? scanMenuIds[name] : undefined);
        return scanMenuId ? { ...menu, scanMenuId } : menu;
      });
      const review = demoMode
        ? saveDemoReview(String(store.id), payload, initialReview)
        : initialReview
          ? await updateReview(initialReview.id, payload)
          : await createReview(Number(store.id), payload, scanId);
      onSaved(review);
      setDone(true);
    } catch {
      setError(t('후기를 저장하지 못했어요. 다시 시도해 주세요.', 'Could not save the review. Please try again.', 'تعذر حفظ المراجعة. حاول مرة أخرى.'));
    } finally { setSaving(false); }
  };

  return <Dialog.Root open onOpenChange={open => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-soy-ink/45 backdrop-blur-sm" />
      <Dialog.Content dir={language === 'ar' ? 'rtl' : 'ltr'} className="fixed bottom-0 left-1/2 z-50 flex max-h-[min(743px,88dvh)] w-full max-w-[430px] -translate-x-1/2 flex-col rounded-t-[24px] border border-border-warm bg-surface-raised shadow-[0_16px_44px_rgba(35,42,37,.12)]">
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border-warm" />
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-3">
          <div className="mb-5 flex items-start gap-3">
            <div className="min-w-0 flex-1"><Dialog.Title className="text-xl font-extrabold tracking-tight">{done ? t('후기를 저장했어요', 'Review saved', 'تم حفظ المراجعة') : t('식사 후기 남기기', 'Leave a meal review', 'أضف مراجعة للوجبة')}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-text-secondary">{t('먹은 메뉴를 고르고, 내 식단 항목이 들어 있었는지 알려 주세요.', 'Choose what you ate and share what you learned about your diet.', 'اختر ما تناولته وشارك ما عرفته عن نظامك الغذائي.')}</Dialog.Description></div>
            <Dialog.Close aria-label={t('닫기', 'Close', 'إغلاق')} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-subtle"><X className="size-5" /></Dialog.Close>
          </div>
          {done ? <p role="status" className="rounded-2xl bg-brand-primary-soft p-5 text-sm font-semibold text-brand-primary">{t('마이페이지의 내가 작성한 후기에서 다시 볼 수 있어요.', 'Find it in My Reviews on your page.', 'يمكنك العثور عليها في مراجعاتي.')}</p> : <>
            <div className="mb-5"><p className="mb-1.5 text-xs font-bold">{t('식당', 'Restaurant', 'المطعم')}</p>
              <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-border-warm p-3"><span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface-subtle"><MapPin className="size-5 text-brand-primary" /></span><span className="min-w-0 font-extrabold">{store.name}</span></div>
            </div>
            <div className="mb-5"><p className="mb-2 text-xs font-bold">{t('먹은 메뉴 · 여러 개 고를 수 있어요', 'Menus you ate · choose several', 'الأطباق التي تناولتها · اختر أكثر من طبق')}</p>
              {!!available.length && <div className="flex flex-wrap gap-1.5">{available.map(name => <button key={name} type="button" aria-pressed={selected.includes(name)} onClick={() => toggleMenu(name)} className={`min-h-11 rounded-[18px] border px-3.5 py-2 text-sm font-bold ${selected.includes(name) ? 'border-brand-primary bg-brand-primary-soft text-brand-primary' : 'border-border-warm bg-surface-raised'}`}>{name}</button>)}</div>}
              <div className="mt-3 flex gap-2"><input value={draftName} onChange={event => setDraftName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addMenu(); } }} maxLength={200} placeholder={t('다른 메뉴 이름', 'Another menu name', 'اسم طبق آخر')} className="min-h-11 min-w-0 flex-1 rounded-xl border border-border-warm bg-surface-subtle px-3 text-sm outline-none focus:border-brand-primary" /><button type="button" onClick={addMenu} className="flex min-h-11 items-center gap-1 rounded-xl border border-brand-primary px-3 text-sm font-bold text-brand-primary"><Plus className="size-4" />{t('추가', 'Add', 'إضافة')}</button></div>
            </div>
            <div className="space-y-3">{selected.map(name => <section key={name} className="rounded-2xl border border-border-warm p-4"><h3 className="mb-3 text-lg font-extrabold">{name}</h3>
              {items.map(item => <fieldset key={item.id} className="mb-3 rounded-[18px] bg-surface-subtle p-3"><legend className="sr-only">{localizeMenuText(item.label, language)}</legend><p className="mb-2 text-xs font-bold"><span className="me-2 inline-block rounded-xl border border-border-warm px-2 py-0.5 text-text-secondary">{localizeMenuText(item.label, language)}</span>{t('이 항목과 관련된 재료가 들어 있었나요?', 'Did it contain ingredients related to this item?', 'هل احتوى على مكونات مرتبطة بهذا البند؟')}</p><div className="grid grid-cols-3 gap-1.5 max-[340px]:grid-cols-1">{([['yes', t('있었어요', 'Yes', 'نعم')], ['no', t('없었어요', 'No', 'لا')], ['unknown', t('잘 모르겠어요', 'Not sure', 'لست متأكداً')]] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={menus[name]?.answers[item.id] === value} onClick={() => setAnswer(name, item.id, value)} className={`min-h-11 rounded-[14px] border px-1 text-xs font-bold ${menus[name]?.answers[item.id] === value ? 'border-brand-primary bg-brand-primary-soft text-brand-primary' : 'border-border-warm bg-surface-raised'}`}>{label}</button>)}</div></fieldset>)}
              <label className="block text-xs font-bold">{t('더 남기고 싶은 말 (선택)', 'Anything else? (optional)', 'هل تريد إضافة شيء آخر؟ (اختياري)')}</label><textarea value={menus[name]?.note ?? ''} onChange={event => setNote(name, event.target.value)} aria-invalid={(menus[name]?.note ?? '').length > 500} aria-describedby={(menus[name]?.note ?? '').length > 500 ? `review-note-error-${selected.indexOf(name)}` : undefined} placeholder={t('예: 소스를 따로 달라고 하니 바로 바꿔 줬어요.', 'For example: they served the sauce separately when I asked.', 'مثال: قدموا الصلصة منفصلة عندما طلبت.')} className={`mt-1.5 min-h-24 w-full resize-y rounded-[18px] border bg-surface-subtle p-3 text-sm leading-[22px] outline-none focus:border-brand-primary ${ (menus[name]?.note ?? '').length > 500 ? 'border-status-danger-text' : 'border-transparent'}`} /><p className={`text-end text-[11px] tabular-nums ${(menus[name]?.note ?? '').length > 500 ? 'font-bold text-status-danger-text' : 'text-text-tertiary'}`}>{(menus[name]?.note ?? '').length}/500</p>
              {(menus[name]?.note ?? '').length > 500 && <p id={`review-note-error-${selected.indexOf(name)}`} role="alert" className="mt-1 text-xs font-bold text-status-danger-text">{t(`500자까지 남길 수 있어요. ${(menus[name]?.note ?? '').length - 500}자를 줄여 주세요.`, `Please remove ${(menus[name]?.note ?? '').length - 500} characters (500 max).`, `يرجى حذف ${(menus[name]?.note ?? '').length - 500} حرفًا (الحد الأقصى 500).`)}</p>}
            </section>)}</div>
          </>}
        </div>
        <div className="shrink-0 border-t border-border-warm bg-surface-raised px-5 pb-[max(32px,env(safe-area-inset-bottom))] pt-3">
          {error && <p role="alert" className="mb-2 text-center text-xs font-bold text-status-danger-text">{error}</p>}
          {!done && <><p className={`mb-2 text-xs leading-5 ${overLimit ? 'font-bold text-status-danger-text' : 'text-text-secondary'}`}>{overLimit ? t('500자를 넘은 메뉴의 후기를 줄여 주세요.', 'Shorten the note that exceeds 500 characters.', 'اختصر الملاحظة التي تتجاوز 500 حرف.') : selected.length ? t('이 응답은 다른 사용자에게 지도 후기로 보여요. 이름은 표시되지 않아요.', 'Others can see this review on the map. Your name is hidden.', 'ستظهر هذه المراجعة للآخرين على الخريطة دون اسمك.') : t('메뉴를 고르면 후기를 저장할 수 있어요.', 'Choose a menu to save a review.', 'اختر طبقاً لحفظ المراجعة.')}</p><button type="button" onClick={() => void save()} disabled={!selected.length || overLimit || saving} className="min-h-12 w-full rounded-[18px] bg-brand-primary px-4 text-sm font-extrabold text-white disabled:opacity-40">{saving ? t('저장 중', 'Saving', 'جارٍ الحفظ') : t('후기 저장하기', 'Save review', 'حفظ المراجعة')}</button></>}
          {done && <button type="button" onClick={onClose} className="min-h-12 w-full rounded-[18px] bg-brand-primary text-sm font-extrabold text-white">{t('닫기', 'Close', 'إغلاق')}</button>}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
