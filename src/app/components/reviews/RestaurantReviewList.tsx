import { useState } from 'react';
import { Info, Loader2, MessageSquare, User } from 'lucide-react';
import type { ReportReason, RestaurantReview } from '../../../api/reviews';
import type { Language, UserProfile } from '../../types';
import { createTranslator } from '../../locales';
import { getProfileCommunicationItems, localizeMenuText } from '../../results/resultViewModel';
import { ReviewCards } from './ReviewCards';

export function RestaurantReviewList({ language, profile, reviews, reviewCount, loading = false, error = '', onRetry, onReport }: {
  language: Language;
  profile: UserProfile | null;
  reviews: RestaurantReview[];
  reviewCount?: number;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  onReport: (review: RestaurantReview, reason: ReportReason) => Promise<void>;
}) {
  const t = createTranslator(language);
  const profileItems = getProfileCommunicationItems(profile);
  const [menuFilter, setMenuFilter] = useState<string | null>(null);
  const [dietFilters, setDietFilters] = useState<string[]>([]);
  const menuNames = [...new Set(reviews.flatMap(review => review.menus.map(menu => menu.name)))];
  const reviewHasAnswer = (review: RestaurantReview, id: string) =>
    review.menus.some(menu => menu.answers[id] !== undefined);
  const toggleDiet = (id: string) => setDietFilters(current =>
    current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const allDietSelected = profileItems.length > 0 && profileItems.every(item => dietFilters.includes(item.id));
  const filtered = reviews.flatMap(review => {
    const menus = review.menus.filter(menu =>
      (!menuFilter || menu.name === menuFilter) &&
      (dietFilters.length === 0 || dietFilters.some(id => menu.answers[id] !== undefined)));
    return menus.length ? [{ ...review, menus }] : [];
  });
  const visibleCount = (loading || error) && typeof reviewCount === 'number' && Number.isFinite(reviewCount) ? reviewCount : reviews.length;

  return <section>
    <h3 className="text-xl font-extrabold">{t(`후기 ${visibleCount}개`, `${visibleCount} reviews`, `${visibleCount} مراجعات`)}</h3>
    <p className="mt-3 flex items-start gap-2 rounded-[18px] border border-border-warm bg-surface-raised px-3 py-2.5 text-sm leading-5 text-text-secondary"><Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{t('다른 사용자의 경험이에요. 재료는 매장에 꼭 확인하세요.', 'These are other diners’ experiences. Confirm ingredients with the restaurant.', 'هذه تجارب زوار آخرين. تحقق من المكونات لدى المطعم.')}</p>
    {loading ? <div role="status" className="mt-5 flex items-center justify-center gap-2 rounded-[20px] border border-border-warm bg-surface-raised px-4 py-12 text-sm text-text-secondary"><Loader2 className="size-5 animate-spin motion-reduce:animate-none" />{t('후기를 불러오는 중…', 'Loading reviews…', 'جارٍ تحميل المراجعات…')}</div>
      : error ? <div role="alert" className="mt-5 rounded-[20px] border border-border-warm bg-surface-raised px-4 py-9 text-center"><Info className="mx-auto mb-3 size-7 text-text-tertiary" /><p className="font-extrabold">{t('후기를 불러오지 못했어요', 'Could not load reviews', 'تعذر تحميل المراجعات')}</p><p className="mt-1 text-sm text-text-secondary">{t('연결 상태를 확인하고 다시 시도해 주세요.', 'Check your connection and try again.', 'تحقق من الاتصال وحاول مرة أخرى.')}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-4 min-h-11 rounded-[18px] border border-brand-primary px-4 text-sm font-bold text-brand-primary">{t('다시 시도', 'Try again', 'حاول مرة أخرى')}</button>}</div>
      : reviews.length === 0 ? <div className="mt-5 rounded-[20px] border border-border-warm bg-surface-raised px-4 py-10 text-center"><MessageSquare className="mx-auto mb-3 size-7 text-text-tertiary" /><p className="text-sm font-bold">{t('아직 후기가 없어요.', 'No reviews yet.', 'لا توجد مراجعات بعد.')}</p></div>
      : <>
        <div className="mt-5"><p className="mb-2 text-xs font-semibold text-text-secondary">{t('메뉴', 'Menu', 'القائمة')}</p><div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]"><button type="button" aria-pressed={menuFilter === null} onClick={() => setMenuFilter(null)} className={`min-h-11 shrink-0 rounded-[18px] border px-3.5 text-sm font-bold ${menuFilter === null ? 'border-brand-primary bg-brand-primary text-white' : 'border-border-warm bg-surface-raised text-text-secondary'}`}>{t('전체', 'All', 'الكل')} <span className="opacity-70">{reviews.length}</span></button>{menuNames.map(name => <button type="button" key={name} aria-pressed={menuFilter === name} onClick={() => setMenuFilter(name)} className={`min-h-11 shrink-0 rounded-[18px] border px-3.5 text-sm font-bold ${menuFilter === name ? 'border-brand-primary bg-brand-primary text-white' : 'border-border-warm bg-surface-raised text-text-secondary'}`}>{name} <span className="opacity-70">{reviews.filter(review => review.menus.some(menu => menu.name === name)).length}</span></button>)}</div></div>
        {profileItems.length > 0 && <div className="mt-4"><p className="mb-2 text-xs font-semibold text-text-secondary">{t('식단', 'Diet', 'النظام الغذائي')}</p><div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]"><button type="button" aria-pressed={allDietSelected} onClick={() => setDietFilters(allDietSelected ? [] : profileItems.map(item => item.id))} className={`inline-flex min-h-11 shrink-0 items-center gap-1 rounded-[18px] border px-3.5 text-sm font-bold ${allDietSelected ? 'border-brand-primary bg-brand-primary-soft text-brand-primary' : 'border-border-warm bg-surface-raised'}`}><User className="size-4" />{t('내 식단', 'My diet', 'نظامي الغذائي')} <span className="opacity-70">{reviews.filter(review => profileItems.some(item => reviewHasAnswer(review, item.id))).length}</span></button>{profileItems.map(item => <button type="button" key={item.id} aria-pressed={dietFilters.includes(item.id)} onClick={() => toggleDiet(item.id)} className={`min-h-11 shrink-0 rounded-[18px] border px-3.5 text-sm font-bold ${dietFilters.includes(item.id) ? 'border-brand-primary bg-brand-primary-soft text-brand-primary' : 'border-border-warm bg-surface-raised'}`}>{localizeMenuText(item.label, language)} <span className="opacity-70">{reviews.filter(review => reviewHasAnswer(review, item.id)).length}</span></button>)}</div></div>}
        {(menuFilter || dietFilters.length > 0) && <p className="my-3 text-xs text-text-secondary">{t(`필터 결과 ${filtered.length}개`, `${filtered.length} matching reviews`, `${filtered.length} مراجعات مطابقة`)}</p>}
        <div className="mt-4">{filtered.length > 0 ? <ReviewCards language={language} profile={profile} reviews={filtered} onReport={onReport} /> : <div className="rounded-[20px] border border-border-warm bg-surface-raised px-4 py-10 text-center"><p className="text-sm font-bold">{t('선택한 조건의 후기가 없어요.', 'No reviews match these filters.', 'لا توجد مراجعات تطابق هذه المرشحات.')}</p><button type="button" onClick={() => { setMenuFilter(null); setDietFilters([]); }} className="mt-3 min-h-11 text-sm font-bold text-brand-primary">{t('필터 초기화', 'Clear filters', 'مسح المرشحات')}</button></div>}</div>
      </>}
  </section>;
}
