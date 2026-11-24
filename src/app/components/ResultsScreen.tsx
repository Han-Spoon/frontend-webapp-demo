import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExchangeRates, type ExchangeRates } from '../../api/exchangeRates';
import { deleteSavedMenu, getSavedMenus, saveMenu, type SavedMenu } from '../../api/savedMenus';
import { getScanResult, mapMenuResult, type ScanRecordResponse } from '../../api/scan';
import type { StoreSummary } from '../../api/store';
import { liveFeatures } from '../featureAvailability';
import type { Language, MenuAnalysis, UserProfile } from '../types';
import { LANGUAGE_LOCALES, translateText } from '../locales';
import { CURATION_ARTICLES, tagLabel } from '../constants/curation';
import { menuPrice } from '../demo/currency';
import { useDemoValue } from '../demo/storage';
import { RESTAURANTS } from '../demo/restaurants';
import { FILMING_PROFILE } from '../results/filmingFixtures';
import { buildMenuResultViewModel, getProfileCommunicationItems, localizeMenuText } from '../results/resultViewModel';
import { preparingLabel } from './FeaturePreparing';
import {
  BottomBar,
  CurationCard,
  DietTag,
  EmptyState,
  FilterChip,
  FLIP_RTL,
  HS_TEXT,
  HsButton,
  HsIcon,
  HsIconButton,
  HsLinkButton,
  HsNote,
  HsSheet,
  HsTextIconButton,
  InlineError,
  NoticeBox,
  RISK_LABEL,
  RISK_ORDER,
  RiskBadge,
  orderByRisk,
  riskOf,
  tx,
  txn,
  type HsRisk,
} from './hs';
import { AllIngredientsSheet, ResultMenuCard } from './results/ResultMenuCard';
import { EditRecordSheet, type EditRecordResult } from './results/EditRecordSheet';
import { MenuPhotoViewer } from './results/MenuPhotoViewer';
import { ShowDietSheet } from './results/ShowDietSheet';
import { StaffCardsSheet } from './results/StaffCardsSheet';
import { dietTagLabel, ingredientRows } from './results/menuView';
import { R, RISK_GUIDE, RN } from './results/resultText';
import { MealReviewSheet } from './reviews/MealReviewSheet';

interface ResultsScreenProps {
  language: Language;
  menus: MenuAnalysis[];
  userProfile: UserProfile | null;
  currentUserProfile?: UserProfile | null;
  onBack: () => void;
  onRescan: () => void;
  sourceScanId?: string;
  savedRecordId?: string;
  partnerRestaurantId?: string;
  store?: StoreSummary | null;
  record?: ScanRecordResponse | null;
  demoMode?: boolean;
  menuPhotoUrl?: string | null;
  /** 판정 당시 식단 모름(서버 기록 등). 현재 프로필을 판정 기준으로 표시하지 않음. */
  scanProfileUnknown?: boolean;
  /** 기록 이름(서버 title · 기기 기록 title) */
  title?: string | null;
  /** 스캔 시각(ISO) */
  scannedAt?: string | null;
  /** 기록 저장 후 목록 갱신 */
  onSavedRecord?: () => void;
}

type FilterType = 'all' | HsRisk;
type StaffAnswerValue = 'present' | 'absent' | 'unknown' | 'possible' | 'difficult';

const UUID = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;

function scanDate(iso: string | null | undefined, language: Language) {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
}

/** 판정 읽는 법: 판정 넷 + % 뜻 */
function HowToReadSheet({ language, onClose }: { language: Language; onClose: () => void }) {
  return (
    <HsSheet language={language} onClose={onClose} title={tx(language, R.howToRead)}>
      <ul className="space-y-3">
        {RISK_ORDER.map((risk) => (
          <li key={risk} className="rounded-hs-xl bg-hs-surface-100 px-4 py-3.5">
            <RiskBadge risk={risk} language={language} size="lg" />
            <p className="mt-2 text-[13px] leading-[1.5] font-semibold text-hs-ink-900">{tx(language, RISK_GUIDE[risk])}</p>
          </li>
        ))}
      </ul>
      <HsNote className="mt-4">{tx(language, R.noticePercent)}</HsNote>
    </HsSheet>
  );
}

export function ResultsScreen({ language, menus, userProfile: suppliedProfile, onBack, onRescan, sourceScanId, savedRecordId, partnerRestaurantId, store, record, demoMode = false, menuPhotoUrl, scanProfileUnknown = false, title, scannedAt, currentUserProfile, onSavedRecord }: ResultsScreenProps) {
  const filmingScenario = menus.some(menu => menu.demoScenario === 'bunsik-vegan-shrimp');
  const userProfile = filmingScenario ? { ...FILMING_PROFILE, languageCode: language } : suppliedProfile;
  // 판정 기준을 모르면 userProfile은 직원 전달용 지금 식단일 뿐.
  const basisUnknown = scanProfileUnknown && !filmingScenario;
  // 식단 불러오기 실패(null). '식단 없음'과 구분, 서버 판정은 그대로 표시.
  const profileUnknown = !basisUnknown && !filmingScenario && userProfile === null;
  const verdictBasisUnknown = basisUnknown || profileUnknown;
  const navigate = useNavigate();

  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  useEffect(() => {
    if (demoMode || !liveFeatures.exchangeRates || language === 'ko') return;
    let active = true;
    getExchangeRates().then(data => { if (active) setExchangeRates(data); }).catch(() => { if (active) setExchangeRates(null); });
    return () => { active = false; };
  }, [demoMode, language]);

  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [staffMenuId, setStaffMenuId] = useState<string | null>(null);
  const [allIngredientsId, setAllIngredientsId] = useState<string | null>(null);
  const [staffAnswers, setStaffAnswers] = useState<Record<string, StaffAnswerValue>>({});
  const [dietSheetOpen, setDietSheetOpen] = useState(false);
  const [howToReadOpen, setHowToReadOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<null | 'edit' | 'connect' | 'review'>(null);
  const [demoSavedMenus, setDemoSavedMenus] = useDemoValue<SavedMenu[]>('saved-menus', []);
  const [serverSavedMenus, setServerSavedMenus] = useState<SavedMenu[]>([]);
  const [favoritePending, setFavoritePending] = useState<string | null>(null);
  const [favoriteError, setFavoriteError] = useState('');
  // 직원 답변 저장 뒤 서버가 다시 계산한 메뉴.
  const [updatedMenus, setUpdatedMenus] = useState<MenuAnalysis[] | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useDemoValue<string | null>('selected-restaurant', null);
  const restaurantId = partnerRestaurantId ?? (demoMode || !sourceScanId ? selectedRestaurantId : null);
  const [reviewStore, setReviewStore] = useState<{ id: string | number; name: string; linkedToScan: boolean } | null>(null);
  const [savedRecord, setSavedRecord] = useState<ScanRecordResponse | null>(record ?? null);
  const [recordTitle, setRecordTitle] = useState<string | null>(title ?? null);
  const [recordId] = useState(() => savedRecordId ?? (sourceScanId ? `local-${sourceScanId}` : `local-${crypto.randomUUID()}`));
  const restaurant = RESTAURANTS.find(r => r.id === restaurantId);

  useEffect(() => { setSavedRecord(record ?? null); }, [record, sourceScanId]);
  useEffect(() => { setRecordTitle(title ?? null); }, [title, sourceScanId]);
  useEffect(() => { setUpdatedMenus(null); }, [sourceScanId, menus]);

  // 스캔할 때 고른 식당은 잠김, 스캔 뒤 연결한 식당은 바꿀 수 있음.
  const lockedStore = store ?? (savedRecord?.storeLocked ? savedRecord.store : null) ?? null;
  const linkedStore = !lockedStore && savedRecord?.store ? savedRecord.store : null;
  const storeName = lockedStore?.name ?? linkedStore?.name ?? (restaurant ? localizeMenuText(restaurant.name, language) : null);

  // 매퍼를 거치지 않은 값(기기 저장 기록 등)도 같은 순서 · 판정 규칙으로.
  const menuList = useMemo(() => {
    const list = updatedMenus ?? (Array.isArray(menus) ? menus : []);
    return [...list].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [menus, updatedMenus]);
  const profileItems = useMemo(() => getProfileCommunicationItems(userProfile), [userProfile]);
  const activeProfileIds = useMemo(() => new Set(profileItems.map(item => item.id)), [profileItems]);
  // 식단 조건이 없으면 배지 대신 재료만. 위험 · 주의가 하나라도 있으면 표시(FN 방지).
  const showVerdicts = verdictBasisUnknown || profileItems.length > 0 || menuList.some(menu => menu.riskLevel === 'danger' || menu.riskLevel === 'caution');
  const dietEmpty = !verdictBasisUnknown && profileItems.length === 0;
  const ordered = useMemo(() => orderByRisk(menuList, riskOf), [menuList]);
  const counts = useMemo(() => Object.fromEntries(RISK_ORDER.map(risk => [risk, menuList.filter(menu => riskOf(menu) === risk).length])) as Record<HsRisk, number>, [menuList]);
  const visibleMenus = !showVerdicts || filter === 'all' ? ordered : ordered.filter(menu => riskOf(menu) === filter);

  const savedMenus = demoMode || !sourceScanId ? demoSavedMenus : serverSavedMenus;
  useEffect(() => {
    if (demoMode || !sourceScanId || !liveFeatures.savedMenus) return;
    getSavedMenus().then(setServerSavedMenus).catch(() => setFavoriteError(tx(language, R.favoriteLoadError)));
  }, [demoMode, sourceScanId]);

  const toggleFavorite = async (menu: MenuAnalysis, key: string, existing: SavedMenu | undefined) => {
    if (!demoMode && !liveFeatures.savedMenus) return;
    if (favoritePending) return;
    setFavoritePending(key);
    setFavoriteError('');
    try {
      if (demoMode || !sourceScanId) {
        setDemoSavedMenus(existing
          ? demoSavedMenus.filter(item => item.id !== existing.id)
          : [{ id: key, menuName: menu.menuName, riskLevel: menu.riskLevel,
              store: storeName ? { storeId: lockedStore?.storeId ?? 0, name: storeName } : null,
              savedAt: new Date().toISOString() }, ...demoSavedMenus]);
      } else if (existing) {
        await deleteSavedMenu(existing.id);
        setServerSavedMenus(current => current.filter(item => item.id !== existing.id));
      } else {
        // 명세 V2 찜은 scanMenuId(UUID) 기준. 없는 옛 결과는 찜 불가.
        if (!UUID.test(menu.id)) {
          setFavoriteError(tx(language, R.favoriteNotYet));
          return;
        }
        const savedMenu = await saveMenu(menu.id);
        setServerSavedMenus(current => [savedMenu, ...current]);
      }
    } catch {
      setFavoriteError(tx(language, R.favoriteError));
    } finally { setFavoritePending(null); }
  };

  const refreshServerResult = async () => {
    if (!sourceScanId) return;
    try {
      const result = await getScanResult(sourceScanId);
      setUpdatedMenus((result.menus ?? []).map((menu, index) => mapMenuResult(menu, index, result.locale ?? language, basisUnknown ? null : userProfile)));
      onSavedRecord?.();
    } catch (error) { console.warn('Unable to refresh staff result:', error); }
  };

  const toggleExpanded = (menuId: string) => setExpandedIds(current => {
    const next = new Set(current);
    if (next.has(menuId)) next.delete(menuId); else next.add(menuId);
    return next;
  });

  const reviewsEnabled = demoMode || liveFeatures.reviews;
  const startReview = () => {
    if (!reviewsEnabled) return;
    const known = lockedStore ?? linkedStore;
    if (known) { setReviewStore({ id: known.storeId, name: known.name, linkedToScan: true }); return; }
    if (restaurant) { setReviewStore({ id: restaurant.id, name: localizeMenuText(restaurant.name, language), linkedToScan: true }); return; }
    // 식당 없는 스캔: 기록 수정의 식당 연결부터.
    setEditOpen('review');
  };
  const onRecordSaved = (result: EditRecordResult) => {
    const mode = editOpen;
    setEditOpen(null);
    setRecordTitle(result.title);
    if (result.record) setSavedRecord(result.record);
    if (result.restaurantId !== undefined) setSelectedRestaurantId(result.restaurantId);
    onSavedRecord?.();
    if (mode !== 'review') return;
    const linked = result.record?.store;
    const demoPlace = RESTAURANTS.find(item => item.id === result.restaurantId);
    if (linked) setReviewStore({ id: linked.storeId, name: linked.name, linkedToScan: true });
    else if (demoPlace) setReviewStore({ id: demoPlace.id, name: localizeMenuText(demoPlace.name, language), linkedToScan: true });
  };

  const recommendedArticles = Array.from(new Set(menuList.map(menu => buildMenuResultViewModel(menu, language).curationId)))
    .flatMap(id => CURATION_ARTICLES.filter(article => article.id === id)).slice(0, 3);
  const showsConversion = language !== 'ko' && menuList.some(menu => menuPrice(menu.price, language)?.converted);
  // 글자가 긴 언어는 [메뉴판 사진]을 아이콘 버튼으로(제목이 잘리지 않게)
  const compactToolbar = !['ko', 'zh-CN', 'zh-TW'].includes(language);
  const hasPhoto = Boolean(menuPhotoUrl) || (Boolean(sourceScanId) && !demoMode);
  const noStore = !storeName && !partnerRestaurantId;
  const description = !showVerdicts ? RN.descriptionIngredients : profileUnknown ? RN.descriptionPlain : basisUnknown ? RN.descriptionAtScan : RN.description;
  const staffMenu = menuList.find(menu => menu.id === staffMenuId) ?? null;
  const allIngredientsMenu = menuList.find(menu => menu.id === allIngredientsId) ?? null;
  const rowsFor = (menu: MenuAnalysis) => ingredientRows(menu, riskOf(menu), activeProfileIds, verdictBasisUnknown, language);
  const relatedDietLabel = (menu: MenuAnalysis) => {
    const ids = new Set((menu.explainability?.ingredients ?? []).flatMap(item => item.profileIds ?? []));
    return profileItems.filter(item => ids.has(item.id)).map(item => dietTagLabel(item, language)).join(', ');
  };

  return (
    <div className="relative flex h-dvh flex-col bg-hs-surface-0 text-hs-ink-900">
      <main className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
        <header className="rounded-b-hs-top-area bg-hs-surface-100 pb-[22px]">
          <div className="flex items-center gap-2 px-5 pt-[18px]">
            <HsIconButton icon="back" tone="white" label={tx(language, HS_TEXT.back)} iconClassName={FLIP_RTL} onClick={onBack} />
            <h1 className="min-w-0 flex-1 truncate text-[17px] font-black">{tx(language, R.screenTitle)}</h1>
            {compactToolbar
              ? <HsIconButton icon="photo" label={tx(language, R.menuPhoto)} title={tx(language, R.menuPhoto)} disabled={!hasPhoto} onClick={() => setPhotoOpen(true)} iconSize={18} />
              : <HsTextIconButton icon="photo" disabled={!hasPhoto} onClick={() => setPhotoOpen(true)} className="disabled:opacity-40">{tx(language, R.menuPhoto)}</HsTextIconButton>}
            {!partnerRestaurantId && <HsTextIconButton icon="edit" disabled={menuList.length === 0} onClick={() => setEditOpen('edit')} className="disabled:opacity-40">{tx(language, R.editRecord)}</HsTextIconButton>}
          </div>
          <div className="px-6 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {storeName ? (
                <span className="inline-flex h-[30px] max-w-full items-center gap-[5px] rounded-hs-pill bg-hs-surface-0 px-3 text-[13px] font-extrabold">
                  <HsIcon name="pin" size={14} strokeWidth={2.4} className="flex-none" />
                  <span className="truncate">{storeName}</span>
                </span>
              ) : !partnerRestaurantId && (
                <button type="button" onClick={() => setEditOpen('connect')} className="inline-flex min-h-[30px] items-center gap-[5px] rounded-hs-pill border-[1.5px] border-dashed border-hs-line-dash bg-hs-surface-0 px-3 text-[13px] font-extrabold">
                  <HsIcon name="pin" size={14} strokeWidth={2.4} className="flex-none" />
                  {tx(language, R.noStoreChip)}
                </button>
              )}
              <span className="text-[12px] font-bold text-hs-ink-500">{scanDate(scannedAt, language)}</span>
            </div>
            <h2 className="mt-3 hs-title-xl">{tx(language, R.guideTitle)}</h2>
            <p className="mt-1 text-[14px] font-semibold text-hs-ink-700">{txn(language, description, menuList.length)}</p>
          </div>
          <section className="mx-5 mt-4 rounded-hs-2xl bg-hs-surface-0 p-4" aria-labelledby="applied-profile">
            <p id="applied-profile" className="flex items-center gap-1.5 text-[13px] font-black">
              <HsIcon name={verdictBasisUnknown ? 'question' : 'shield'} size={16} strokeWidth={2.4} />
              {tx(language, verdictBasisUnknown ? R.basisAtScan : R.appliedProfile)}
            </p>
            {profileUnknown ? (
              <p className="mt-2 text-[13px] leading-[1.5] font-semibold text-hs-ink-700">{tx(language, R.profileUnknown)}</p>
            ) : basisUnknown ? (
              <>
                <p className="mt-2 text-[13px] leading-[1.5] font-semibold text-hs-ink-700">{tx(language, R.basisUnknown)}</p>
                <HsLinkButton tone="brand" onClick={onRescan}>{tx(language, R.rescanWithCurrent)}</HsLinkButton>
              </>
            ) : profileItems.length > 0 ? (
              <div className="mt-2.5 flex flex-wrap gap-1.5">{profileItems.map(item => <DietTag key={item.id}>{dietTagLabel(item, language)}</DietTag>)}</div>
            ) : (
              <>
                <p className="mt-2 text-[13px] leading-[1.5] font-semibold text-hs-ink-700">{tx(language, showVerdicts ? R.noConditions : R.dietEmpty)}</p>
                {dietEmpty && <HsLinkButton tone="brand" onClick={() => navigate('/onboarding', { state: { editSection: 'diet' } })}>{tx(language, R.setDiet)}</HsLinkButton>}
              </>
            )}
            {profileItems.length > 0 && (
              <HsButton variant="outline" size="lg" block icon="person" className="mt-3.5" onClick={() => setDietSheetOpen(true)}>{tx(language, R.showMyDiet)}</HsButton>
            )}
          </section>
        </header>

        {!demoMode && !liveFeatures.savedMenus && <p role="status" className="mx-5 mt-3 text-[12px] font-bold text-hs-ink-500">{preparingLabel(language)}</p>}
        {favoriteError && <InlineError className="mx-5 mt-3">{favoriteError}</InlineError>}

        {showVerdicts && menuList.length > 0 && (
          <nav aria-label={tx(language, R.filters)} className="sticky top-0 z-10 mt-1.5 flex gap-1.5 overflow-x-auto border-b-[1.5px] border-hs-line-200 bg-hs-surface-0 py-3 ps-5 pe-5 shadow-[0_6px_14px_rgba(23,32,28,0.06)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FilterChip selected={filter === 'all'} count={menuList.length} onClick={() => setFilter('all')}>{tx(language, R.all)}</FilterChip>
            {RISK_ORDER.map(risk => (
              <FilterChip key={risk} risk={risk} selected={filter === risk} count={counts[risk]} onClick={() => setFilter(risk)}>{tx(language, RISK_LABEL[risk])}</FilterChip>
            ))}
          </nav>
        )}

        <div className="space-y-2.5 px-5 pt-3">
          {visibleMenus.map(menu => {
            const risk = riskOf(menu);
            const favoriteKey = `${recordId}:${menu.id}`;
            const favorite = savedMenus.find(item => demoMode || !sourceScanId ? item.id === favoriteKey : item.id === menu.id);
            const price = menuPrice(menu.price, language, exchangeRates?.rates);
            return (
              <ResultMenuCard
                key={menu.id}
                language={language}
                menu={menu}
                risk={risk}
                showVerdict={showVerdicts}
                rows={rowsFor(menu)}
                price={price}
                priceOptions={(menu.priceOptions ?? []).map(option => ({ label: option.label, raw: option.priceText, inferred: option.inferred, price: menuPrice(option.priceText, language, exchangeRates?.rates) }))}
                expanded={expandedIds.has(menu.id)}
                onToggle={() => toggleExpanded(menu.id)}
                favorite={{
                  on: Boolean(favorite),
                  busy: favoritePending === favoriteKey,
                  disabled: !demoMode && !liveFeatures.savedMenus,
                  onToggle: () => void toggleFavorite(menu, favoriteKey, favorite),
                }}
                onStaffCards={() => setStaffMenuId(menu.id)}
                onAllIngredients={() => setAllIngredientsId(menu.id)}
              />
            );
          })}

          {visibleMenus.length === 0 && (
            <EmptyState icon="search" title={tx(language, menuList.length === 0 ? R.emptyAll : R.emptyFilter)} description={tx(language, R.emptyHint)} />
          )}

          {noStore && menuList.length > 0 && (
            <section className="rounded-hs-2xl border-[1.5px] border-hs-line-200 p-4">
              <h3 className="flex items-center gap-1.5 text-[14px] font-black"><HsIcon name="pin" size={16} strokeWidth={2.4} />{tx(language, R.noStoreTitle)}</h3>
              <p className="mt-1.5 text-[12px] leading-[1.55] font-semibold text-hs-ink-700">{tx(language, R.noStoreBody)}</p>
              <HsButton variant="outline" size="sm" icon="pin" className="mt-3" onClick={() => setEditOpen('connect')}>{tx(language, R.linkStore)}</HsButton>
            </section>
          )}
        </div>

        {recommendedArticles.length > 0 && (
          <section className="mt-6 bg-hs-surface-100 py-[22px]" aria-labelledby="result-stories">
            <h2 id="result-stories" className="mb-3 px-5 text-[17px] font-black">{tx(language, R.storyTitle)}</h2>
            <div className="flex gap-2.5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {recommendedArticles.map(article => (
                <CurationCard key={article.id} category={article.tag} categoryLabel={tagLabel(article.tag, language)} title={translateText(language, article.title)} onClick={() => navigate(`/curation/${article.id}`)} className="w-[220px]" />
              ))}
            </div>
          </section>
        )}

        <NoticeBox className="mx-5 mt-5 mb-6">
          <HsNote>{tx(language, R.noticeGuide)}</HsNote>
          {showVerdicts && <HsNote>{tx(language, R.noticePercent)}</HsNote>}
          {showsConversion && <HsNote>{exchangeRates ? translateText(language, { ko: `환율 기준: ${exchangeRates.asOf} · 환산 가격은 참고용이에요.`, en: `Rates as of ${exchangeRates.asOf} · Converted prices are estimates.`, ar: `أسعار الصرف بتاريخ ${exchangeRates.asOf} · الأسعار تقريبية.`, 'zh-CN': `汇率基准：${exchangeRates.asOf} · 换算价格仅供参考。`, ja: `為替レート：${exchangeRates.asOf} · 換算価格は参考です。`, 'zh-TW': `匯率基準：${exchangeRates.asOf} · 換算價格僅供參考。`, es: `Tipo de cambio a ${exchangeRates.asOf} · Los precios convertidos son orientativos.` }) : tx(language, R.noticeFixedRate)}</HsNote>}
          {showVerdicts && <HsLinkButton trailingIcon="forward" trailingClassName={FLIP_RTL} className="ms-[22px] underline underline-offset-2" onClick={() => setHowToReadOpen(true)}>{tx(language, R.howToRead)}</HsLinkButton>}
        </NoticeBox>
      </main>

      <BottomBar>
        <HsButton variant="outline" size="bar" icon="scan" onClick={onRescan}>{tx(language, R.rescan)}</HsButton>
        <HsButton variant="outline" size="bar" icon="edit" disabled={!reviewsEnabled || menuList.length === 0} title={reviewsEnabled ? undefined : preparingLabel(language)} onClick={startReview}>{tx(language, R.writeReview)}</HsButton>
      </BottomBar>

      {staffMenu && (
        <StaffCardsSheet
          language={language}
          menu={staffMenu}
          items={profileItems}
          demoMode={demoMode}
          scanId={demoMode ? undefined : sourceScanId}
          answers={staffAnswers}
          onAnswer={(key, answer) => setStaffAnswers(current => ({ ...current, [key]: answer }))}
          onServerAnswer={() => void refreshServerResult()}
          onClose={() => setStaffMenuId(null)}
        />
      )}
      {allIngredientsMenu && (
        <AllIngredientsSheet language={language} menu={allIngredientsMenu} risk={riskOf(allIngredientsMenu)} rows={rowsFor(allIngredientsMenu)} dietLabel={relatedDietLabel(allIngredientsMenu)} onClose={() => setAllIngredientsId(null)} />
      )}
      {dietSheetOpen && <ShowDietSheet language={language} items={profileItems} onClose={() => setDietSheetOpen(false)} />}
      {howToReadOpen && <HowToReadSheet language={language} onClose={() => setHowToReadOpen(false)} />}
      {photoOpen && <MenuPhotoViewer language={language} localUrl={menuPhotoUrl ?? null} scanId={demoMode ? undefined : sourceScanId} onClose={() => setPhotoOpen(false)} />}
      {editOpen && (
        <EditRecordSheet
          language={language}
          menus={menuList}
          profile={userProfile}
          recordId={recordId}
          sourceScanId={sourceScanId}
          demoMode={demoMode}
          title={recordTitle}
          lockedStore={lockedStore}
          linkedStore={linkedStore}
          restaurantId={restaurantId}
          startWithPicker={editOpen !== 'edit'}
          onClose={() => setEditOpen(null)}
          onSaved={onRecordSaved}
        />
      )}
      {reviewStore && (
        <MealReviewSheet
          language={language}
          profile={currentUserProfile ?? userProfile}
          store={reviewStore}
          menuNames={[...new Set(menuList.map(menu => menu.menuName))]}
          scanId={reviewStore.linkedToScan ? sourceScanId : undefined}
          scanMenuIds={Object.fromEntries(menuList.filter(menu => UUID.test(menu.id)).map(menu => [menu.menuName, menu.id]))}
          demoMode={demoMode || typeof reviewStore.id === 'string' || !sourceScanId}
          onClose={() => setReviewStore(null)}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}
