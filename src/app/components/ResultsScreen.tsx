import { Fragment, useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Flame,
  Info,
  MessageSquareText,
  SearchX,
  ShieldCheck,
  Heart,
  Bookmark,
  MapPin,
  Store,
  ImageOff,
  Image as ImageIcon,
  Sparkles,
  X,
} from 'lucide-react';
import type { Language, MenuAnalysis, UserProfile } from '../App';
import { createTranslator, translateText } from '../locales';
import { deleteSavedMenu, getSavedMenus, saveMenu, type SavedMenu } from '../../api/savedMenus';
import type { ScanRecordResponse } from '../../api/scan';
import type { StoreSummary } from '../../api/store';
import { getMenuPronunciation } from '../constants/menuNames';
import { CURATION_ARTICLES } from '../constants/curation';
import { menuPrice } from '../demo/currency';
import { useDemoValue } from '../demo/storage';
import { AREAS, RESTAURANTS } from '../demo/restaurants';
import { SaveScanSheet } from './results/SaveScanSheet';
import { RestaurantPicker } from './discovery/RestaurantPicker';
import { MealReviewSheet } from './reviews/MealReviewSheet';
import {
  OwnerCommunicationSheet,
  type OwnerCommunicationType,
  type OwnerResponseId,
} from './OwnerCommunicationSheet';
import { ProfileCommunicationSheet } from './ProfileCommunicationSheet';
import { CommunicationActions } from './results/CommunicationActions';
import { RiskBadge, StatusGuidance } from './results/ResultEvidence';
import { AnalysisEvidence, CautionInsight } from './results/AnalysisInsights';
import { FILMING_PROFILE } from '../results/filmingFixtures';
import {
  buildMenuResultViewModel,
  getProfileCommunicationItems,
  getProfileSummary,
  localizeMenuText,
} from '../results/resultViewModel';

interface ResultsScreenProps {
  language: Language;
  menus: MenuAnalysis[];
  userProfile: UserProfile | null;
  onBack: () => void;
  onRescan: () => void;
  sourceScanId?: string;
  savedRecordId?: string;
  partnerRestaurantId?: string;
  store?: StoreSummary | null;
  record?: ScanRecordResponse | null;
  demoMode?: boolean;
  menuPhotoUrl?: string | null;
}

interface MenuImageProps {
  menu: MenuAnalysis;
  translatedName: string;
  t: (ko: string, en: string, ar: string) => string;
}

type FilterType = 'all' | MenuAnalysis['riskLevel'];

function getTranslatedMenuName(menu: MenuAnalysis, language: Language) {
  if (language === 'ko') return menu.menuName;
  if (menu.menuNameLocalized) return translateText(language, menu.menuNameLocalized) || menu.menuNameEn || menu.menuName;
  return translateText(language, {
    ko: menu.menuName,
    en: menu.menuNameEn || menu.menuName,
    ar: menu.menuNameAr ?? menu.menuNameEn ?? menu.menuName,
  }) || menu.menuNameEn || menu.menuName;
}

function getDescription(menu: MenuAnalysis, language: Language) {
  if (menu.descriptionLocalized) return translateText(language, menu.descriptionLocalized);
  return translateText(language, {
    ko: menu.description,
    en: menu.descriptionEn ?? menu.description,
    ar: menu.descriptionAr ?? menu.descriptionEn ?? menu.description,
  });
}


export function MenuImage({ menu, translatedName, t }: MenuImageProps) {
  const [resolvedImage, setResolvedImage] = useState<string | null>(menu.image ?? null);
  useEffect(() => setResolvedImage(menu.image ?? null), [menu.image]);
  if (resolvedImage) return <img src={resolvedImage} alt={translatedName} loading="lazy" onError={() => setResolvedImage(null)} className="size-full object-cover" style={{ objectPosition: menu.imagePosition ?? '50% 50%', transform: `scale(${menu.imageScale ?? 1})` }} />;

  return (
    <div className="flex size-full items-center justify-center bg-surface-subtle text-text-tertiary" role="img" aria-label={t('메뉴 사진 없음', 'No menu photo', 'لا توجد صورة للطبق')}>
      <ImageOff className="size-6" aria-hidden="true" />
    </div>
  );
}

export function ResultsScreen({ language, menus, userProfile: suppliedProfile, onBack, onRescan, sourceScanId, savedRecordId, partnerRestaurantId, store, record, demoMode = false, menuPhotoUrl }: ResultsScreenProps) {
  const userProfile = menus.some(menu => menu.demoScenario === 'bunsik-vegan-shrimp')
    ? { ...FILMING_PROFILE, languageCode: language } : suppliedProfile;
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedMenu, setSelectedMenu] = useState<MenuAnalysis | null>(null);
  const [sheetType, setSheetType] = useState<OwnerCommunicationType | null>(null);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [partnerNoteOpen, setPartnerNoteOpen] = useState(false);
  const [ownerResponses, setOwnerResponses] = useState<Record<string, OwnerResponseId>>({});
  const [demoSavedMenus, setDemoSavedMenus] = useDemoValue<SavedMenu[]>('saved-menus', []);
  const [serverSavedMenus, setServerSavedMenus] = useState<SavedMenu[]>([]);
  const [favoritePending, setFavoritePending] = useState<string | null>(null);
  const [favoriteError, setFavoriteError] = useState('');
  const [photoOpen, setPhotoOpen] = useState(false);
  const [selectedRestaurantId] = useDemoValue<string | null>('selected-restaurant', null);
  const restaurantId = partnerRestaurantId ?? (demoMode || !sourceScanId ? selectedRestaurantId : null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [reviewPickerOpen, setReviewPickerOpen] = useState(false);
  const [reviewStore, setReviewStore] = useState<{ id: string | number; name: string; linkedToScan: boolean } | null>(null);
  const [savedRecord, setSavedRecord] = useState<ScanRecordResponse | null>(record ?? null);
  const [saved, setSaved] = useState(Boolean(savedRecordId || record));
  const [recordId] = useState(() => savedRecordId ?? (sourceScanId ? `local-${sourceScanId}` : `local-${crypto.randomUUID()}`));
  const restaurant = RESTAURANTS.find(r => r.id === restaurantId);
  const storeName = store?.name
    ?? savedRecord?.store?.name
    ?? (restaurant ? localizeMenuText(restaurant.name, language) : null);
  const t = createTranslator(language);
  const menuList = Array.isArray(menus) ? menus : [];
  const profileSummary = getProfileSummary(userProfile, language);
  const profileCommunicationItems = getProfileCommunicationItems(userProfile);
  const startReview = () => {
    const knownStore = store ?? savedRecord?.store;
    if (knownStore) { setReviewStore({ id: knownStore.storeId, name: knownStore.name, linkedToScan: true }); return; }
    if (restaurant) { setReviewStore({ id: restaurant.id, name: localizeMenuText(restaurant.name, language), linkedToScan: true }); return; }
    setReviewPickerOpen(true);
  };

  useEffect(() => {
    if (demoMode || !sourceScanId) return;
    getSavedMenus().then(setServerSavedMenus).catch(() => setFavoriteError(t('찜 목록을 불러오지 못했어요.', 'Could not load saved menus.', 'تعذر تحميل الأطباق المحفوظة.')));
  }, [demoMode, sourceScanId]);

  const toggleFavorite = async (menu: MenuAnalysis, key: string, existing: SavedMenu | undefined) => {
    if (favoritePending) return;
    setFavoritePending(key);
    setFavoriteError('');
    try {
      if (demoMode || !sourceScanId) {
        setDemoSavedMenus(existing
          ? demoSavedMenus.filter(item => item.id !== existing.id)
          : [{ id: key, menuName: menu.menuName, riskLevel: menu.riskLevel,
              store: storeName ? { storeId: store?.storeId ?? 0, name: storeName } : null,
              savedAt: new Date().toISOString() }, ...demoSavedMenus]);
      } else if (existing) {
        await deleteSavedMenu(existing.id);
        setServerSavedMenus(current => current.filter(item => item.id !== existing.id));
      } else {
        const savedMenu = await saveMenu(sourceScanId, Number(menu.id));
        setServerSavedMenus(current => [savedMenu, ...current]);
      }
    } catch {
      setFavoriteError(t('메뉴 찜을 변경하지 못했어요. 다시 시도해 주세요.', 'Could not update this saved menu. Please try again.', 'تعذر تحديث الطبق المحفوظ. حاول مجدداً.'));
    } finally { setFavoritePending(null); }
  };

  useEffect(() => {
    setSavedRecord(record ?? null);
    setSaved(Boolean(savedRecordId || record));
  }, [record, savedRecordId, sourceScanId]);

  const counts = useMemo(() => ({
    safe: menuList.filter((menu) => menu.riskLevel === 'safe').length,
    caution: menuList.filter((menu) => menu.riskLevel === 'caution').length,
    danger: menuList.filter((menu) => menu.riskLevel === 'danger').length,
  }), [menuList]);
  const filteredMenus = filter === 'all' ? menuList : menuList.filter((menu) => menu.riskLevel === filter);

  const responseKey = (menuId: string, type: OwnerCommunicationType) => `${menuId}:${type}`;
  const getStoredResponse = (menu: MenuAnalysis, type: OwnerCommunicationType) => ownerResponses[responseKey(menu.id, type)] ?? null;
  const openSheet = (menu: MenuAnalysis, type: OwnerCommunicationType) => { setSelectedMenu(menu); setSheetType(type); };
  const closeSheet = () => { setSelectedMenu(null); setSheetType(null); };
  const handleOwnerResponseSelect = (type: OwnerCommunicationType, responseId: OwnerResponseId) => {
    if (!selectedMenu) return;
    setOwnerResponses((current) => ({ ...current, [responseKey(selectedMenu.id, type)]: responseId }));
  };
  const toggleExpanded = (menuId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(menuId)) next.delete(menuId);
      else next.add(menuId);
      return next;
    });
  };
  const recommendedArticles = Array.from(new Set(menuList.map(menu => buildMenuResultViewModel(menu, language).curationId))).flatMap(id => CURATION_ARTICLES.filter(article => article.id === id)).slice(0, 3);

  return (
    <div className="relative flex h-dvh flex-col bg-surface-base text-text-primary">
      <header className="flex h-16 shrink-0 items-center border-b border-border-warm bg-surface-raised/95 px-5 backdrop-blur">
        <button onClick={onBack} className="touch-target absolute start-3 inline-flex items-center justify-center rounded-full hover:bg-surface-subtle" aria-label={t('이전', 'Back', 'رجوع')}>
          <ArrowLeft className="size-5 rtl:rotate-180" />
        </button>
        <h1 className="mx-auto text-base font-extrabold">{partnerRestaurantId ? t('내 프로필로 보는 메뉴', 'Menus for my profile', 'القائمة حسب ملفي') : t('스캔 결과', 'Scan results', 'نتائج المسح')}</h1>
      </header>

      <main className="flex-1 overflow-y-auto" aria-live="polite">
        <section className="border-b border-border-warm bg-surface-raised px-5 pb-5 pt-6">
          {storeName ? <>
            <p className="eyebrow mb-3 flex items-center gap-1"><MapPin className="size-3" aria-hidden="true" />{restaurant ? localizeMenuText(AREAS.find(area => area.id === restaurant.area)!, language) : t('식당 연결됨', 'Restaurant linked', 'مطعم مرتبط')}</p>
            {partnerRestaurantId && <div className="mb-3 flex justify-end"><button type="button" onClick={() => setPartnerNoteOpen(value => !value)} aria-expanded={partnerNoteOpen} className="inline-flex min-h-11 items-center gap-1 text-[11px] font-bold text-text-secondary"><Store className="size-3.5 text-brand-primary" />{t('한스푼 파트너 식당', 'Han Spoon partner', 'مطعم شريك لهان سبون')}<Info className="size-3.5" /></button></div>}
            {partnerNoteOpen && <p className="mb-3 rounded-xl bg-surface-subtle p-3 text-xs text-text-secondary">{t('파트너 식당의 등록된 레시피를 참고했어요. 실제 제공 재료는 매장에 확인하세요.', 'We used recipes supplied by this partner. Confirm the served ingredients with the restaurant.', 'استخدمنا وصفات قدمها المطعم الشريك. تحقق من المكونات المقدمة لدى المطعم.')}</p>}
            <h2 className="break-words text-[27px] font-extrabold leading-[1.25] tracking-[-0.03em]">{storeName}</h2>
          </> : <>
            <p className="eyebrow mb-3">{t('YOUR MENU, MADE CLEAR', 'YOUR MENU, MADE CLEAR', 'قائمتك بوضوح')}</p>
            <h2 className="text-[27px] font-extrabold leading-[1.25] tracking-[-0.03em]">{t('나를 위한 메뉴 가이드', 'Your menu, understood.', 'قائمتك، بكل وضوح.')}</h2>
          </>}
          <p className="mt-1.5 text-sm text-text-secondary">{t(`메뉴 ${menuList.length}개를 내 식단 기준으로 살펴봤어요.`, `${menuList.length} dishes, checked against your dietary needs.`, `تم فحص ${menuList.length} أطباق حسب احتياجاتك الغذائية.`)}</p>
          {storeName && <div className="mt-4"><button type="button" disabled={!menuPhotoUrl} onClick={() => setPhotoOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-[18px] border border-border-warm px-4 text-sm font-bold disabled:opacity-40"><ImageIcon className="size-4" />{t('메뉴판 사진 보기', 'View menu photo', 'عرض صورة القائمة')}</button>{!menuPhotoUrl && <p className="mt-1 text-xs text-text-secondary">{t('사진은 아직 제공되지 않아요.', 'Menu photo is not available yet.', 'صورة القائمة غير متاحة بعد.')}</p>}</div>}
          <div className="mt-4 rounded-xl border border-border-warm bg-surface-subtle px-3.5 py-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-extrabold text-text-secondary">
              <ShieldCheck className="size-4 text-brand-primary" aria-hidden="true" />
              {t('적용된 내 식단 프로필', 'Applied dietary profile', 'الملف الغذائي المطبق')}
            </div>
            {profileSummary.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">{profileSummary.map((item) => <span key={item} className="rounded-md bg-surface-raised px-2 py-1 text-xs font-semibold text-text-primary">{item}</span>)}</div>
            ) : <p className="text-xs leading-5 text-text-secondary">{t('설정된 식단 조건이 없어요', 'No dietary conditions are set.', 'لا توجد شروط غذائية محددة.')}</p>}
            {profileCommunicationItems.length > 0 && (
              <button type="button" onClick={() => setProfileSheetOpen(true)} className="mt-3 min-h-11 w-full rounded-xl border border-brand-primary bg-surface-raised px-3 py-2 text-sm font-bold text-brand-primary hover:bg-brand-primary-soft">
                <span className="inline-flex items-center justify-center gap-2"><MessageSquareText className="size-4" />{t('내 식단 전달하기', 'Share my dietary needs', 'شارك احتياجاتي الغذائية')}</span>
              </button>
            )}
          </div>

          <div className="mt-4 flex items-start gap-2 px-0.5 text-xs leading-5 text-text-tertiary">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>{t('판정은 참고용이에요. 재료는 매장에 꼭 확인하세요.', 'This judgment is a guide. Confirm ingredients with the restaurant.', 'هذا التقييم إرشادي. تحقق من المكونات لدى المطعم.')}</p>
          </div>
        </section>

        {favoriteError && <p role="alert" className="mx-5 mt-3 rounded-xl bg-status-danger-surface p-3 text-xs text-status-danger-text">{favoriteError}</p>}

        <nav className="sticky top-0 z-10 flex gap-2 overflow-x-auto border-b border-border-warm bg-surface-base/95 px-5 py-3 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label={t('결과 필터', 'Result filters', 'مرشحات النتائج')}>
          {([
            { value: 'all' as const, label: t('전체', 'All', 'الكل'), count: menuList.length },
            { value: 'safe' as const, label: t('안전', 'Safe', 'آمن'), count: counts.safe },
            { value: 'caution' as const, label: t('주의', 'Caution', 'تنبيه'), count: counts.caution },
            { value: 'danger' as const, label: t('위험', 'Danger', 'خطر'), count: counts.danger },
          ]).map((item) => (
            <button key={item.value} onClick={() => setFilter(item.value)} aria-pressed={filter === item.value} className={`min-h-11 shrink-0 rounded-xl border px-3.5 text-sm font-bold ${filter === item.value ? 'border-text-primary bg-text-primary text-white' : 'border-border-warm bg-surface-raised text-text-secondary hover:border-text-tertiary'}`}>
              {item.label} <span className="ms-1 opacity-70">{item.count}</span>
            </button>
          ))}
        </nav>

        <div className="space-y-4 px-4 py-5 sm:px-5">
          {filter !== 'all' && <StatusGuidance level={filter} t={t} />}

          {filteredMenus.map((menu) => {
            const expanded = expandedIds.has(menu.id);
            const translatedName = getTranslatedMenuName(menu, language);
            const pronunciation = getMenuPronunciation(menu.menuName, language);
            const description = getDescription(menu, language);
            const viewModel = buildMenuResultViewModel(menu, language);
            const cardDetailsId = `menu-details-${menu.id}`;
            const isSpicy = Boolean(menu.isSpicy || menu.is_spicy);
            const price = menuPrice(menu.price, language);
            const favoriteKey = `${recordId}:${menu.id}`;
            const savedMenus = demoMode || !sourceScanId ? demoSavedMenus : serverSavedMenus;
            const favorite = savedMenus.find(item => demoMode || !sourceScanId
              ? item.id === favoriteKey
              : item.scanId === sourceScanId && item.displayOrder === Number(menu.id));
            const liked = Boolean(favorite);
            const activeProfileIds = new Set(profileCommunicationItems.map(item => item.id));
            const causeItems = menu.riskLevel === 'safe' || !profileSummary.length ? []
              : menu.explainability?.ingredients
                ? viewModel.ingredients.filter(item => item.profileIds?.some(id => activeProfileIds.has(id)))
                : viewModel.ingredients;
            const displayedCauses = causeItems.slice(0, 2);
            const hiddenCauseCount = Math.max(0, causeItems.length - displayedCauses.length);
            const requestActions = [
              ...(menu.riskLevel !== 'safe' ? [{ id: 'request', label: t('빼고 요청', 'Request removal', 'طلب الإزالة'), onClick: () => openSheet(menu, 'request') }] : []),
              ...(isSpicy ? [{ id: 'less-spicy', label: t('덜 맵게 요청', 'Less spicy', 'أقل حدة'), onClick: () => openSheet(menu, 'lessSpicy') }] : []),
            ];

            return (
              <Fragment key={menu.id}>
                <article className="relative overflow-hidden rounded-[var(--radius-card)] border border-border-warm bg-surface-raised shadow-[var(--shadow-card)]">
                  <button type="button" aria-label={`${liked ? t('찜 해제', 'Remove saved menu', 'إزالة الطبق المحفوظ') : t('메뉴 찜하기', 'Save menu', 'احفظ الطبق')}: ${menu.menuName}`} aria-pressed={liked} disabled={favoritePending === favoriteKey} onClick={() => void toggleFavorite(menu, favoriteKey, favorite)} className={`absolute end-1.5 top-1.5 z-[1] flex size-11 items-center justify-center rounded-full disabled:opacity-50 ${liked ? 'bg-brand-accent-soft text-brand-accent' : 'bg-surface-subtle text-text-tertiary'}`}><Heart className={`size-5 ${liked ? 'fill-current' : ''}`} /></button>
                  <div className="flex gap-3 border-b border-border-warm p-3">
                    <div className="size-20 shrink-0 overflow-hidden rounded-[18px] border border-border-warm bg-surface-subtle"><MenuImage menu={menu} translatedName={translatedName} t={t} /></div>
                    <div className="min-w-0 flex-1 space-y-1 pe-10">
                      {profileSummary.length > 0 && <div className="flex flex-wrap items-center gap-1.5"><RiskBadge level={menu.riskLevel} t={t} />{(partnerRestaurantId || menu.explainability?.ingredients?.length) && <span className="inline-flex min-h-6 items-center gap-1 rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] font-bold text-text-secondary"><Sparkles className="size-3" />{partnerRestaurantId ? t('등록 레시피', 'Supplied recipe', 'وصفة مقدمة') : t('추정 정보', 'Estimated', 'معلومات تقديرية')}</span>}</div>}
                      <h3 className="break-words text-lg font-extrabold leading-[1.4] tracking-[-0.015em]">{menu.menuName}</h3>
                      {language !== 'ko' && translatedName.trim() !== menu.menuName.trim() && <p className="break-words text-xs font-semibold text-text-secondary">{translatedName}</p>}
                      {price ? <div className="flex flex-wrap items-baseline gap-x-1.5"><span className="text-sm font-extrabold tabular-nums" dir="ltr">{price.original}</span>{price.converted && <span className="text-xs text-text-secondary" dir="ltr">≈ {price.converted}</span>}</div> : <p className="text-xs text-text-tertiary">{t('가격 확인 필요', 'Price needs checking', 'يجب التحقق من السعر')}</p>}
                      {description && <p className="truncate text-xs leading-5 text-text-secondary">{description}</p>}
                    </div>
                  </div>

                  <div className="space-y-3 p-3">
                    {causeItems.length > 0 && <div className="flex flex-wrap gap-1.5">{displayedCauses.map(item => <button type="button" key={item.localizedName} onClick={() => toggleExpanded(menu.id)} className={`min-h-8 max-w-full break-words rounded-[14px] px-2.5 py-1.5 text-xs font-bold ${menu.riskLevel === 'danger' ? 'bg-status-danger-surface text-status-danger-text' : 'bg-status-caution-surface text-status-caution-text'}`}>{item.localizedName}</button>)}{hiddenCauseCount > 0 && <button type="button" onClick={() => toggleExpanded(menu.id)} className="min-h-8 rounded-[14px] bg-surface-subtle px-2.5 py-1.5 text-xs font-bold text-text-secondary">+{hiddenCauseCount}</button>}</div>}
                    {!profileSummary.length && (viewModel.ingredients.length > 0 || isSpicy) && <div className="flex gap-1.5 overflow-hidden whitespace-nowrap">{viewModel.ingredients.slice(0, 4).map(item => <span key={item.localizedName} className="rounded-[14px] bg-surface-subtle px-2.5 py-1.5 text-xs font-bold text-text-secondary">{item.localizedName}</span>)}{isSpicy && <span className="inline-flex items-center gap-1 rounded-[14px] bg-surface-subtle px-2.5 py-1.5 text-xs font-bold text-text-secondary"><Flame className="size-3" />{t('매운 음식', 'Spicy', 'حار')}</span>}</div>}
                    <div className="flex items-center gap-2"><button type="button" onClick={() => openSheet(menu, profileSummary.length && menu.riskLevel !== 'safe' ? 'ingredient' : 'order')} className={`inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-[18px] px-3 py-2.5 text-sm font-extrabold ${menu.riskLevel === 'danger' && profileSummary.length ? 'border border-brand-primary text-brand-primary' : 'bg-brand-primary text-white'}`}><MessageSquareText className="size-4 shrink-0" />{profileSummary.length && menu.riskLevel !== 'safe' ? causeItems.length ? t(`재료 ${causeItems.length}개 확인하기`, `Check ${causeItems.length} ingredients`, `تحقق من ${causeItems.length} مكونات`) : t('직원에게 재료 확인하기', 'Ask staff about ingredients', 'اسأل الموظف عن المكونات') : t('주문 카드', 'Order card', 'بطاقة الطلب')}</button><button type="button" onClick={() => toggleExpanded(menu.id)} aria-expanded={expanded} aria-controls={cardDetailsId} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-[18px] px-2 text-sm font-bold text-brand-primary">{expanded ? t('접기', 'Hide', 'إخفاء') : t('근거 보기', 'Evidence', 'الأدلة')}<ChevronDown className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} /></button></div>
                  </div>

                  {expanded && <div id={cardDetailsId} className="border-t border-border-warm bg-surface-subtle/60 px-4 py-4"><div className="space-y-4">{description && <p className="text-sm leading-6 text-text-secondary">{description}</p>}{pronunciation && <p className="text-xs text-text-tertiary">{pronunciation}</p>}{menu.riskLevel === 'caution' && <CautionInsight menu={menu} profile={userProfile} language={language} />}{viewModel.primaryReason && <div><p className="mb-1 text-[11px] font-extrabold text-text-tertiary">{t('판정 이유', 'Reason', 'السبب')}</p><p className="text-sm font-semibold leading-6">{viewModel.primaryReason}</p></div>}<CommunicationActions requestActions={requestActions} trailingAction={{ id: 'order', label: t('주문 카드', 'Order card', 'بطاقة الطلب'), onClick: () => openSheet(menu, 'order') }} /><AnalysisEvidence menu={menu} language={language} /></div></div>}
                </article>

              </Fragment>
            );
          })}

          {menuList.length > 0 && <p className="px-1 text-center text-[10px] leading-5 text-text-tertiary">{t('환율은 매일 00:00 (한국 시간)에 업데이트돼요. 환산 가격은 참고용이에요.', 'Exchange rates update daily at 00:00 KST. Converted prices are estimates.', 'تُحدّث أسعار الصرف يومياً عند 00:00 بتوقيت كوريا. الأسعار المحوّلة تقريبية.')}</p>}
          {recommendedArticles.length > 0 && <section className="border-t border-border-warm pt-6"><p className="eyebrow">{t('A LITTLE MORE KOREA', 'A LITTLE MORE KOREA', 'المزيد عن كوريا')}</p><h3 className="mb-4 mt-1 text-lg font-extrabold">{t('메뉴를 골랐다면, 한식 이야기', 'Chosen your dish? Discover its story.', 'اخترت طبقك؟ اكتشف قصته.')}</h3><div className="space-y-2">{recommendedArticles.map(article => <button key={article.id} onClick={() => navigate(`/curation/${article.id}`)} className="flex w-full items-center gap-3 rounded-2xl border border-border-warm bg-rice-white p-3 text-start"><span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-accent-soft text-2xl">{article.emoji}</span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{translateText(language, article.title)}</span><span className="mt-1 block line-clamp-1 text-xs text-text-secondary">{translateText(language, article.excerpt)}</span></span><ChevronRight className="size-4 rtl:rotate-180" /></button>)}</div></section>}

          {filteredMenus.length === 0 && (
            <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-border-warm bg-surface-raised px-5 py-12 text-center">
              <SearchX className="mb-3 size-8 text-text-tertiary" aria-hidden="true" />
              <p className="font-extrabold">{menuList.length === 0 ? t('분석된 메뉴가 없어요', 'No analyzed menu items', 'لا توجد عناصر محللة') : t('이 상태의 메뉴가 없어요', 'No items match this filter', 'لا توجد عناصر بهذا التصنيف')}</p>
              <p className="mt-1 text-sm text-text-secondary">{t('다른 필터를 선택하거나 다시 스캔해 주세요.', 'Choose another filter or scan again.', 'اختر مرشحًا آخر أو أعد المسح.')}</p>
            </div>
          )}
        </div>
      </main>

      <footer className="grid shrink-0 grid-cols-2 gap-3 border-t border-border-warm bg-surface-raised/95 px-5 py-3 backdrop-blur">
        <button onClick={onRescan} className="min-h-12 rounded-xl border border-brand-primary bg-surface-raised px-3 text-sm font-extrabold text-brand-primary hover:bg-brand-primary-soft">{partnerRestaurantId ? t('프로필 수정하기', 'Edit profile', 'تعديل الملف') : t('다시 스캔하기', 'Scan again', 'المسح مرة أخرى')}</button>
        <button disabled={menuList.length === 0} onClick={() => setSaveOpen(true)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-primary px-3 text-sm font-extrabold text-white disabled:opacity-40"><Bookmark className="size-4" />{saved ? t('기록 수정', 'Edit record', 'تعديل السجل') : t('기록하기', 'Keep this scan', 'احفظ المسح')}</button>
        {saved && <button type="button" onClick={startReview} className="col-span-2 min-h-11 rounded-xl border border-brand-primary text-sm font-extrabold text-brand-primary">{t('식당 후기 작성', 'Write a restaurant review', 'اكتب مراجعة للمطعم')}</button>}
      </footer>

      {saveOpen && <SaveScanSheet language={language} menus={menuList} profile={userProfile} recordId={recordId} sourceScanId={sourceScanId} restaurantId={restaurantId} scanStore={store} scanRecord={savedRecord} onClose={() => setSaveOpen(false)} onSaved={(nextRecord) => { setSavedRecord(nextRecord ?? null); setSaved(true); }} />}
      {reviewPickerOpen && <RestaurantPicker language={language} demoMode={demoMode || !sourceScanId} selectedId={null} onClose={() => setReviewPickerOpen(false)} onSelectDemo={item => { setReviewPickerOpen(false); if (item) setReviewStore({ id: item.id, name: localizeMenuText(item.name, language), linkedToScan: false }); }} onSelectStore={item => { setReviewPickerOpen(false); if (item) setReviewStore({ id: item.storeId, name: item.branchName ? `${item.name} ${item.branchName}` : item.name, linkedToScan: false }); }} />}
      {reviewStore && <MealReviewSheet language={language} profile={userProfile} store={reviewStore} menuNames={[...new Set(menuList.map(menu => menu.menuName))]} scanId={reviewStore.linkedToScan ? sourceScanId : undefined} demoMode={demoMode || typeof reviewStore.id === 'string' || !sourceScanId} onClose={() => setReviewStore(null)} onSaved={() => {}} />}

      {sheetType && selectedMenu && <OwnerCommunicationSheet menu={selectedMenu} type={sheetType} userProfile={userProfile} language={language} initialResponse={getStoredResponse(selectedMenu, sheetType)} onResponseSelect={handleOwnerResponseSelect} onClose={closeSheet} />}
      {profileSheetOpen && <ProfileCommunicationSheet items={profileCommunicationItems} language={language} onClose={() => setProfileSheetOpen(false)} />}
      <Dialog.Root open={photoOpen && Boolean(menuPhotoUrl)} onOpenChange={setPhotoOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-soy-ink/80" />
          <Dialog.Content aria-describedby={undefined} className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <Dialog.Title className="sr-only">{t('스캔한 메뉴판 사진', 'Scanned menu photo', 'صورة القائمة الممسوحة')}</Dialog.Title>
            <Dialog.Close aria-label={t('닫기', 'Close', 'إغلاق')} className="absolute end-4 top-4 flex size-11 items-center justify-center rounded-full bg-surface-raised text-text-primary"><X className="size-5" /></Dialog.Close>
            {menuPhotoUrl && <img src={menuPhotoUrl} alt={t('스캔한 메뉴판 사진', 'Scanned menu photo', 'صورة القائمة الممسوحة')} className="max-h-[85dvh] max-w-full rounded-xl object-contain" />}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
