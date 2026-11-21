import { Fragment, useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  CircleHelp,
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
import type { Language, MenuAnalysis, UserProfile } from '../types';
import { createTranslator, translateText } from '../locales';
import { deleteSavedMenu, getSavedMenus, saveMenu, type SavedMenu } from '../../api/savedMenus';
import type { ScanRecordResponse } from '../../api/scan';
import type { StoreSummary } from '../../api/store';
import { getScanImage, getScanResult, mapMenuResult } from '../../api/scan';
import { ApiError } from '../../api/user';
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
import { RiskBadge, riskLabel, StatusGuidance } from './results/ResultEvidence';
import { normalizeRiskLevel } from '../../api/riskLevel';
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
  /** 기록 저장 후 목록 갱신 */
  onSavedRecord?: () => void;
}

interface MenuImageProps {
  menu: MenuAnalysis;
  translatedName: string;
  t: (ko: string, en: string, ar: string) => string;
}

type FilterType = 'all' | MenuAnalysis['riskLevel'];

function getTranslatedMenuName(menu: MenuAnalysis, language: Language) {
  if (language === 'ko') return menu.menuName;
  // 언어별 이름이 없으면 빈 문자열 → 아래 영문·원문 대체.
  if (menu.menuNameLocalized) return translateText(language, { ...menu.menuNameLocalized, en: menu.menuNameLocalized.en ?? '', ar: menu.menuNameLocalized.ar ?? '' }) || menu.menuNameEn || menu.menuName;
  return translateText(language, {
    ko: menu.menuName,
    en: menu.menuNameEn || menu.menuName,
    ar: menu.menuNameAr ?? menu.menuNameEn ?? menu.menuName,
  }) || menu.menuNameEn || menu.menuName;
}

function getDescription(menu: MenuAnalysis, language: Language) {
  if (menu.descriptionLocalized) return translateText(language, { ...menu.descriptionLocalized, en: menu.descriptionLocalized.en ?? '', ar: menu.descriptionLocalized.ar ?? '' });
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

export function ResultsScreen({ language, menus, userProfile: suppliedProfile, onBack, onRescan, sourceScanId, savedRecordId, partnerRestaurantId, store, record, demoMode = false, menuPhotoUrl, scanProfileUnknown = false, currentUserProfile, onSavedRecord }: ResultsScreenProps) {
  const filmingScenario = menus.some(menu => menu.demoScenario === 'bunsik-vegan-shrimp');
  const userProfile = filmingScenario ? { ...FILMING_PROFILE, languageCode: language } : suppliedProfile;
  // 판정 기준을 모르면 userProfile은 직원 전달용 지금 식단일 뿐.
  const basisUnknown = scanProfileUnknown && !filmingScenario;
  // 식단 불러오기 실패(null). '식단 없음'과 구분, 서버 판정은 그대로 표시.
  const profileUnknown = !basisUnknown && !filmingScenario && userProfile === null;
  const verdictBasisUnknown = basisUnknown || profileUnknown;
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
  // 기기에 사진이 없으면 서버 사진(GET /scans/{id}/image).
  const [scanImageUrl, setScanImageUrl] = useState<string | null>(null);
  const [scanImageError, setScanImageError] = useState('');
  const [scanImageLoading, setScanImageLoading] = useState(false);
  // 직원 답변 저장 뒤 서버가 다시 계산한 메뉴.
  const [updatedMenus, setUpdatedMenus] = useState<MenuAnalysis[] | null>(null);
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
  // 매퍼를 거치지 않은 값(기기 저장 기록 등)도 판정 정규화.
  const menuList = useMemo(() => (updatedMenus ?? (Array.isArray(menus) ? menus : []))
    .map(menu => ({ ...menu, riskLevel: normalizeRiskLevel(menu.riskLevel) })), [menus, updatedMenus]);
  useEffect(() => { setUpdatedMenus(null); setScanImageUrl(null); setScanImageError(''); }, [sourceScanId, menus]);
  const photoUrl = menuPhotoUrl ?? scanImageUrl;
  const canLoadServerPhoto = !menuPhotoUrl && Boolean(sourceScanId) && !demoMode;
  const profileSummary = getProfileSummary(userProfile, language);
  const profileCommunicationItems = getProfileCommunicationItems(userProfile);
  // 식단 조건이 없으면 배지 대신 재료만. 위험·주의가 하나라도 있으면 표시(FN 방지).
  const showVerdicts = verdictBasisUnknown || profileSummary.length > 0
    || menuList.some(menu => menu.riskLevel === 'danger' || menu.riskLevel === 'caution');
  const dietEmpty = !verdictBasisUnknown && profileSummary.length === 0;
  const editDiet = () => navigate('/onboarding', { state: { editSection: 'diet' } });
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
        // 명세 V2 찜은 scanMenuId(UUID) 기준. 없는 옛 결과는 찜 불가.
        if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(menu.id)) {
          setFavoriteError(t('이 메뉴는 아직 찜할 수 없어요.', 'This menu cannot be saved yet.', 'لا يمكن حفظ هذا الطبق بعد.'));
          return;
        }
        const savedMenu = await saveMenu(menu.id);
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
    unknown: menuList.filter((menu) => menu.riskLevel === 'unknown').length,
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
  const showScanImage = async () => {
    if (!sourceScanId) return;
    setScanImageLoading(true);
    setScanImageError('');
    try { setScanImageUrl((await getScanImage(sourceScanId)).imageUrl); setPhotoOpen(true); }
    catch (error) {
      setScanImageError(error instanceof ApiError && error.status === 410
        ? t('보관 기간이 지나 사진을 볼 수 없어요', 'This photo is past its retention period.', 'انتهت مدة حفظ هذه الصورة.')
        : t('사진을 불러오지 못했어요. 다시 시도해 주세요.', 'Could not load the photo. Please try again.', 'تعذر تحميل الصورة. حاول مجددًا.'));
    } finally { setScanImageLoading(false); }
  };
  const refreshServerResult = async () => {
    if (!sourceScanId) return;
    try {
      const result = await getScanResult(sourceScanId);
      setUpdatedMenus((result.menus ?? []).map((menu, index) => mapMenuResult(menu, index, result.locale ?? language, basisUnknown ? null : userProfile)));
    } catch (error) { console.warn('Unable to refresh staff result:', error); }
  };

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
            {partnerRestaurantId && <div className="mb-3 flex justify-end"><button type="button" onClick={() => setPartnerNoteOpen(value => !value)} aria-expanded={partnerNoteOpen} className="inline-flex min-h-11 items-center gap-1 text-[11px] font-bold text-text-secondary"><Store className="size-3.5 text-action-primary" />{t('한스푼 파트너 식당', 'Han Spoon partner', 'مطعم شريك لهان سبون')}<Info className="size-3.5" /></button></div>}
            {partnerNoteOpen && <p className="mb-3 rounded-xl bg-surface-subtle p-3 text-xs text-text-secondary">{t('파트너 식당의 등록된 레시피를 참고했어요. 실제 제공 재료는 매장에 확인하세요.', 'We used recipes supplied by this partner. Confirm the served ingredients with the restaurant.', 'استخدمنا وصفات قدمها المطعم الشريك. تحقق من المكونات المقدمة لدى المطعم.')}</p>}
            <h2 className="break-words text-[27px] font-extrabold leading-[1.25] tracking-[-0.03em]">{storeName}</h2>
          </> : <>
            <p className="eyebrow mb-3">{t('YOUR MENU, MADE CLEAR', 'YOUR MENU, MADE CLEAR', 'قائمتك بوضوح')}</p>
            <h2 className="text-[27px] font-extrabold leading-[1.25] tracking-[-0.03em]">{t('나를 위한 메뉴 가이드', 'Your menu, understood.', 'قائمتك، بكل وضوح.')}</h2>
          </>}
          <p className="mt-1.5 text-sm text-text-secondary">{!showVerdicts
            ? translateText(language, { ko: `메뉴 ${menuList.length}개의 재료를 정리했어요.`, en: `Ingredients for ${menuList.length} dishes.`, ar: `مكونات ${menuList.length} أطباق.`, 'zh-CN': `已整理 ${menuList.length} 道菜的食材。`, ja: `${menuList.length}品のメニューの材料をまとめました。`, 'zh-TW': `已整理 ${menuList.length} 道菜的食材。`, es: `Ingredientes de ${menuList.length} platos.` })
            : profileUnknown
            ? translateText(language, { ko: `메뉴 ${menuList.length}개를 살펴봤어요.`, en: `We checked ${menuList.length} dishes.`, ar: `فحصنا ${menuList.length} أطباق.`, 'zh-CN': `已查看 ${menuList.length} 道菜。`, ja: `${menuList.length}品のメニューを確認しました。`, 'zh-TW': `已查看 ${menuList.length} 道菜。`, es: `Revisamos ${menuList.length} platos.` })
            : basisUnknown
            ? t(`메뉴 ${menuList.length}개를 스캔 당시 식단 기준으로 살펴봤어요.`, `${menuList.length} dishes, checked against your dietary needs at scan time.`, `تم فحص ${menuList.length} أطباق حسب احتياجاتك الغذائية وقت المسح.`)
            : t(`메뉴 ${menuList.length}개를 내 식단 기준으로 살펴봤어요.`, `${menuList.length} dishes, checked against your dietary needs.`, `تم فحص ${menuList.length} أطباق حسب احتياجاتك الغذائية.`)}</p>
          {storeName && <div className="mt-4"><button type="button" disabled={(!photoUrl && !canLoadServerPhoto) || scanImageLoading} onClick={() => { if (photoUrl) setPhotoOpen(true); else void showScanImage(); }} className="inline-flex min-h-11 items-center gap-2 rounded-[18px] border border-border-warm px-4 text-sm font-bold disabled:opacity-40"><ImageIcon className="size-4" />{scanImageLoading ? t('사진 불러오는 중…', 'Loading photo…', 'جار تحميل الصورة…') : t('메뉴판 사진 보기', 'View menu photo', 'عرض صورة القائمة')}</button>{!photoUrl && !canLoadServerPhoto && <p className="mt-1 text-xs text-text-secondary">{t('사진은 아직 제공되지 않아요.', 'Menu photo is not available yet.', 'صورة القائمة غير متاحة بعد.')}</p>}{scanImageError && <p role="alert" className="mt-1 text-xs text-status-danger-text">{scanImageError}</p>}</div>}
          <div className="mt-4 rounded-xl border border-border-warm bg-surface-subtle px-3.5 py-3">
            {profileUnknown ? <>
              <div className="mb-2 flex items-center gap-2 text-xs font-extrabold text-status-unknown-text">
                <CircleHelp className="size-4 text-status-unknown" aria-hidden="true" />
                {t('판정 기준 식단', 'Diet used for this result', 'النظام الغذائي المستخدم لهذه النتيجة')}
              </div>
              <p className="text-xs leading-5 text-text-secondary">{translateText(language, { ko: '내 식단 정보를 불러오지 못했어요. 아래 판정은 받은 그대로 보여 드려요. 먹기 전에 직원에게 재료를 확인하세요.', en: 'We couldn’t load your dietary settings. The results below are shown as received. Check the ingredients with staff before eating.', ar: 'تعذر تحميل إعداداتك الغذائية. النتائج أدناه معروضة كما وصلت. تحقق من المكونات مع الموظفين قبل الأكل.', 'zh-CN': '无法加载你的饮食设置。以下判定按收到的结果显示。用餐前请向店员确认食材。', ja: '食事設定を読み込めませんでした。下の判定は受け取ったまま表示しています。食べる前にスタッフに材料を確認してください。', 'zh-TW': '無法載入你的飲食設定。以下判定按收到的結果顯示。用餐前請向店員確認食材。', es: 'No pudimos cargar tus preferencias alimentarias. Los resultados se muestran tal como llegaron. Confirma los ingredientes con el personal antes de comer.' })}</p>
            </> : basisUnknown ? <>
              <div className="mb-2 flex items-center gap-2 text-xs font-extrabold text-status-unknown-text">
                <CircleHelp className="size-4 text-status-unknown" aria-hidden="true" />
                {t('판정 기준 식단', 'Diet used for this result', 'النظام الغذائي المستخدم لهذه النتيجة')}
              </div>
              <p className="text-xs leading-5 text-text-secondary">{t('이 스캔 당시의 식단 조건은 확인할 수 없어요. 스캔 뒤에 바꾼 식단은 판정에 반영되지 않았어요.', 'We cannot show the dietary settings used for this scan. Changes made after scanning are not reflected in these results.', 'لا يمكننا عرض الإعدادات الغذائية المستخدمة في هذا المسح. التغييرات بعد المسح لا تنعكس في هذه النتائج.')}</p>
              <button type="button" onClick={onRescan} className="mt-1 inline-flex min-h-11 items-center text-sm font-bold text-action-primary underline underline-offset-2">{t('지금 식단으로 다시 스캔', 'Rescan with my current diet', 'أعد المسح بنظامي الغذائي الحالي')}</button>
            </> : <>
            <div className="mb-2 flex items-center gap-2 text-xs font-extrabold text-text-secondary">
              <ShieldCheck className="size-4 text-action-primary" aria-hidden="true" />
              {t('적용된 내 식단 프로필', 'Applied dietary profile', 'الملف الغذائي المطبق')}
            </div>
            {profileSummary.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">{profileSummary.map((item) => <span key={item} className="rounded-md bg-surface-raised px-2 py-1 text-xs font-semibold text-text-primary">{item}</span>)}</div>
            ) : <>
              <p className="text-xs leading-5 text-text-secondary">{showVerdicts
                ? translateText(language, { ko: '설정된 식단 조건이 없어요.', en: 'No dietary conditions are set.', ar: 'لا توجد شروط غذائية محددة.', 'zh-CN': '尚未设置饮食条件。', ja: '食事の条件が設定されていません。', 'zh-TW': '尚未設定飲食條件。', es: 'No has indicado condiciones alimentarias.' })
                : translateText(language, { ko: '설정된 식단 조건이 없어서 위험·주의 판정 없이 재료만 보여 드려요. 알레르기나 피하는 음식이 있다면 설정해 주세요.', en: 'No dietary conditions are set, so we show ingredients without Danger or Caution labels. If you have allergies or foods you avoid, set them up.', ar: 'لا توجد شروط غذائية محددة، لذلك نعرض المكونات دون تصنيف خطر أو حذر. إذا كانت لديك حساسية أو أطعمة تتجنبها، فحددها.', 'zh-CN': '尚未设置饮食条件，所以只显示食材，不显示危险或注意判定。如果你有过敏或忌口，请进行设置。', ja: '食事の条件が設定されていないため、危険・注意の判定なしで材料だけを表示しています。アレルギーや避けたい食べ物があれば設定してください。', 'zh-TW': '尚未設定飲食條件，所以只顯示食材，不顯示危險或注意判定。如果你有過敏或忌口，請進行設定。', es: 'No has indicado condiciones alimentarias, así que mostramos los ingredientes sin etiquetas de Peligro o Precaución. Si tienes alergias o evitas algún alimento, indícalo.' })}</p>
              {dietEmpty && <button type="button" onClick={editDiet} className="mt-1 inline-flex min-h-11 items-center text-sm font-bold text-action-primary underline underline-offset-2">{translateText(language, { ko: '식단 설정하기', en: 'Set up my diet', ar: 'حدد نظامي الغذائي', 'zh-CN': '设置饮食条件', ja: '食事の条件を設定', 'zh-TW': '設定飲食條件', es: 'Indicar mi dieta' })}</button>}
            </>}
            </>}
            {profileCommunicationItems.length > 0 && (
              <button type="button" onClick={() => setProfileSheetOpen(true)} className="mt-3 min-h-11 w-full rounded-xl border border-action-primary bg-surface-raised px-3 py-2 text-sm font-bold text-action-primary hover:bg-action-primary-soft">
                <span className="inline-flex items-center justify-center gap-2"><MessageSquareText className="size-4" />{t('내 식단 전달하기', 'Share my dietary needs', 'شارك احتياجاتي الغذائية')}</span>
              </button>
            )}
          </div>

          <div className="mt-4 flex items-start gap-2 px-0.5 text-xs leading-5 text-text-tertiary">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>{showVerdicts
              ? t('판정은 참고용이에요. 재료는 매장에 꼭 확인하세요.', 'This judgment is a guide. Confirm ingredients with the restaurant.', 'هذا التقييم إرشادي. تحقق من المكونات لدى المطعم.')
              : translateText(language, { ko: '재료는 매장에 꼭 확인하세요.', en: 'Confirm ingredients with the restaurant.', ar: 'تحقق من المكونات لدى المطعم.', 'zh-CN': '请务必向店家确认食材。', ja: '材料は必ずお店に確認してください。', 'zh-TW': '請務必向店家確認食材。', es: 'Confirma los ingredientes con el restaurante.' })}</p>
          </div>
        </section>

        {favoriteError && <p role="alert" className="mx-5 mt-3 rounded-xl bg-status-danger-surface p-3 text-xs text-status-danger-text">{favoriteError}</p>}

        {showVerdicts && <nav className="sticky top-0 z-10 flex gap-2 overflow-x-auto border-b border-border-warm bg-surface-base/95 px-5 py-3 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label={t('결과 필터', 'Result filters', 'مرشحات النتائج')}>
          {([
            { value: 'all' as const, label: t('전체', 'All', 'الكل'), count: menuList.length },
            ...(['safe', 'caution', 'danger', 'unknown'] as const)
              .filter((level) => level !== 'unknown' || counts.unknown > 0)
              .map((level) => ({ value: level, label: riskLabel(level, t), count: counts[level] })),
          ]).map((item) => (
            <button key={item.value} onClick={() => setFilter(item.value)} aria-pressed={filter === item.value} className={`min-h-11 shrink-0 rounded-xl border px-3.5 text-sm font-bold ${filter === item.value ? 'border-text-primary bg-text-primary text-white' : 'border-border-warm bg-surface-raised text-text-secondary hover:border-text-tertiary'}`}>
              {item.label} <span className="ms-1 opacity-70">{item.count}</span>
            </button>
          ))}
        </nav>}

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
              : item.id === menu.id);
            const liked = Boolean(favorite);
            const activeProfileIds = new Set(profileCommunicationItems.map(item => item.id));
            const causeItems = menu.riskLevel === 'safe' || !showVerdicts ? []
              : menu.explainability?.ingredients
                ? viewModel.ingredients.filter(item => verdictBasisUnknown ? (item.profileIds?.length ?? 0) > 0 : item.profileIds?.some(id => activeProfileIds.has(id)))
                : viewModel.ingredients;
            const displayedCauses = causeItems.slice(0, 2);
            const hiddenCauseCount = Math.max(0, causeItems.length - displayedCauses.length);
            const requestActions = [
              ...(menu.riskLevel === 'caution' || menu.riskLevel === 'danger' ? [{ id: 'request', label: t('빼고 요청', 'Request removal', 'طلب الإزالة'), onClick: () => openSheet(menu, 'request') }] : []),
              ...(isSpicy ? [{ id: 'less-spicy', label: t('덜 맵게 요청', 'Less spicy', 'أقل حدة'), onClick: () => openSheet(menu, 'lessSpicy') }] : []),
            ];

            return (
              <Fragment key={menu.id}>
                <article className="relative overflow-hidden rounded-[var(--radius-card)] border border-border-warm bg-surface-raised shadow-[var(--shadow-card)]">
                  <button type="button" aria-label={`${liked ? t('찜 해제', 'Remove saved menu', 'إزالة الطبق المحفوظ') : t('메뉴 찜하기', 'Save menu', 'احفظ الطبق')}: ${menu.menuName}`} aria-pressed={liked} disabled={favoritePending === favoriteKey} onClick={() => void toggleFavorite(menu, favoriteKey, favorite)} className={`absolute end-1.5 top-1.5 z-[1] flex size-11 items-center justify-center rounded-full disabled:opacity-50 ${liked ? 'bg-brand-accent-soft text-brand-accent' : 'bg-surface-subtle text-text-tertiary'}`}><Heart className={`size-5 ${liked ? 'fill-current' : ''}`} /></button>
                  <div className="flex gap-3 border-b border-border-warm p-3">
                    <div className="size-20 shrink-0 overflow-hidden rounded-[18px] border border-border-warm bg-surface-subtle"><MenuImage menu={menu} translatedName={translatedName} t={t} /></div>
                    <div className="min-w-0 flex-1 space-y-1 pe-10">
                      {showVerdicts && <div className="flex flex-wrap items-center gap-1.5"><RiskBadge level={menu.riskLevel} t={t} />{(Boolean(partnerRestaurantId) || (menu.explainability?.ingredients?.length ?? 0) > 0) && <span className="inline-flex min-h-6 items-center gap-1 rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] font-bold text-text-secondary"><Sparkles className="size-3" />{partnerRestaurantId ? t('등록 레시피', 'Supplied recipe', 'وصفة مقدمة') : t('추정 정보', 'Estimated', 'معلومات تقديرية')}</span>}</div>}
                      <h3 className="break-words text-lg font-extrabold leading-[1.4] tracking-[-0.015em]">{menu.menuName}</h3>
                      {language !== 'ko' && translatedName.trim() !== menu.menuName.trim() && <p className="break-words text-xs font-semibold text-text-secondary">{translatedName}</p>}
                      {price ? <div className="flex flex-wrap items-baseline gap-x-1.5"><span className="text-sm font-extrabold tabular-nums" dir="ltr">{price.original}</span>{price.converted && <span className="text-xs text-text-secondary" dir="ltr">≈ {price.converted}</span>}</div> : <p className="text-xs text-text-tertiary">{t('가격 확인 필요', 'Price needs checking', 'يجب التحقق من السعر')}</p>}
                      {description && <p className="truncate text-xs leading-5 text-text-secondary">{description}</p>}
                    </div>
                  </div>

                  <div className="space-y-3 p-3">
                    {causeItems.length > 0 && <div className="flex flex-wrap gap-1.5">{displayedCauses.map(item => <button type="button" key={item.localizedName} onClick={() => toggleExpanded(menu.id)} className={`min-h-8 max-w-full break-words rounded-[14px] px-2.5 py-1.5 text-xs font-bold ${menu.riskLevel === 'danger' ? 'bg-status-danger-surface text-status-danger-text' : menu.riskLevel === 'unknown' ? 'bg-status-unknown-surface text-status-unknown-text' : 'bg-status-caution-surface text-status-caution-text'}`}>{item.localizedName}</button>)}{hiddenCauseCount > 0 && <button type="button" onClick={() => toggleExpanded(menu.id)} className="min-h-8 rounded-[14px] bg-surface-subtle px-2.5 py-1.5 text-xs font-bold text-text-secondary">+{hiddenCauseCount}</button>}</div>}
                    {!showVerdicts && (viewModel.ingredients.length > 0 || isSpicy) && <div className="flex gap-1.5 overflow-hidden whitespace-nowrap">{viewModel.ingredients.slice(0, 4).map(item => <span key={item.localizedName} className="rounded-[14px] bg-surface-subtle px-2.5 py-1.5 text-xs font-bold text-text-secondary">{item.localizedName}</span>)}{isSpicy && <span className="inline-flex items-center gap-1 rounded-[14px] bg-surface-subtle px-2.5 py-1.5 text-xs font-bold text-text-secondary"><Flame className="size-3" />{t('매운 음식', 'Spicy', 'حار')}</span>}</div>}
                    <div className="flex items-center gap-2"><button type="button" onClick={() => openSheet(menu, showVerdicts && menu.riskLevel !== 'safe' ? 'ingredient' : 'order')} className={`inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-[18px] px-3 py-2.5 text-sm font-extrabold ${menu.riskLevel === 'danger' && showVerdicts ? 'border border-action-primary text-action-primary' : 'bg-action-primary text-action-primary-foreground'}`}><MessageSquareText className="size-4 shrink-0" />{showVerdicts && menu.riskLevel !== 'safe' ? causeItems.length ? t(`재료 ${causeItems.length}개 확인하기`, `Check ${causeItems.length} ingredients`, `تحقق من ${causeItems.length} مكونات`) : t('직원에게 재료 확인하기', 'Ask staff about ingredients', 'اسأل الموظف عن المكونات') : t('주문 카드', 'Order card', 'بطاقة الطلب')}</button><button type="button" onClick={() => toggleExpanded(menu.id)} aria-expanded={expanded} aria-controls={cardDetailsId} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-[18px] px-2 text-sm font-bold text-action-primary">{expanded ? t('접기', 'Hide', 'إخفاء') : t('근거 보기', 'Evidence', 'الأدلة')}<ChevronDown className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} /></button></div>
                  </div>

                  {expanded && <div id={cardDetailsId} className="border-t border-border-warm bg-surface-subtle/60 px-4 py-4"><div className="space-y-4">{description && <p className="text-sm leading-6 text-text-secondary">{description}</p>}{pronunciation && <p className="text-xs text-text-tertiary">{pronunciation}</p>}{menu.riskLevel === 'caution' && <CautionInsight menu={menu} profile={userProfile} language={language} anyProfile={basisUnknown} />}{viewModel.primaryReason && <div><p className="mb-1 text-[11px] font-extrabold text-text-tertiary">{t('판정 이유', 'Reason', 'السبب')}</p><p className="text-sm font-semibold leading-6">{viewModel.primaryReason}</p></div>}<CommunicationActions requestActions={requestActions} trailingAction={{ id: 'order', label: t('주문 카드', 'Order card', 'بطاقة الطلب'), onClick: () => openSheet(menu, 'order') }} /><AnalysisEvidence menu={menu} language={language} /></div></div>}
                </article>

              </Fragment>
            );
          })}

          {menuList.length > 0 && <p className="px-1 text-center text-[10px] leading-5 text-text-tertiary">{t('환율은 매일 00:00 (한국 시간)에 업데이트돼요. 환산 가격은 참고용이에요.', 'Exchange rates update daily at 00:00 KST. Converted prices are estimates.', 'تُحدّث أسعار الصرف يومياً عند 00:00 بتوقيت كوريا. الأسعار المحوّلة تقريبية.')}</p>}
          {favoriteError && <p role="alert" className="text-center text-xs text-status-danger-text">{favoriteError}</p>}
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
        <button onClick={onRescan} className="min-h-12 rounded-xl border border-action-primary bg-surface-raised px-3 text-sm font-extrabold text-action-primary hover:bg-action-primary-soft">{partnerRestaurantId ? t('프로필 수정하기', 'Edit profile', 'تعديل الملف') : t('다시 스캔하기', 'Scan again', 'المسح مرة أخرى')}</button>
        <button disabled={menuList.length === 0} onClick={() => setSaveOpen(true)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-action-primary px-3 text-sm font-extrabold text-action-primary-foreground disabled:opacity-40"><Bookmark className="size-4" />{saved ? t('기록 수정', 'Edit record', 'تعديل السجل') : t('기록하기', 'Keep this scan', 'احفظ المسح')}</button>
        {saved && <button type="button" onClick={startReview} className="col-span-2 min-h-11 rounded-xl border border-action-primary text-sm font-extrabold text-action-primary">{t('식당 후기 작성', 'Write a restaurant review', 'اكتب مراجعة للمطعم')}</button>}
      </footer>

      {saveOpen && <SaveScanSheet language={language} menus={menuList} profile={userProfile} recordId={recordId} sourceScanId={sourceScanId} restaurantId={restaurantId} scanStore={store} scanRecord={savedRecord} onClose={() => setSaveOpen(false)} onSaved={(nextRecord) => { setSavedRecord(nextRecord ?? null); setSaved(true); onSavedRecord?.(); }} />}
      {reviewPickerOpen && <RestaurantPicker language={language} demoMode={demoMode || !sourceScanId} selectedId={null} onClose={() => setReviewPickerOpen(false)} onSelectDemo={item => { setReviewPickerOpen(false); if (item) setReviewStore({ id: item.id, name: localizeMenuText(item.name, language), linkedToScan: false }); }} onSelectStore={item => { setReviewPickerOpen(false); if (item) setReviewStore({ id: item.storeId, name: item.branchName ? `${item.name} ${item.branchName}` : item.name, linkedToScan: false }); }} />}
      {reviewStore && <MealReviewSheet language={language} profile={currentUserProfile ?? userProfile} store={reviewStore} menuNames={[...new Set(menuList.map(menu => menu.menuName))]} scanId={reviewStore.linkedToScan ? sourceScanId : undefined} scanMenuIds={Object.fromEntries(menuList.filter(menu => /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(menu.id)).map(menu => [menu.menuName, menu.id]))} demoMode={demoMode || typeof reviewStore.id === 'string' || !sourceScanId} onClose={() => setReviewStore(null)} onSaved={() => {}} />}

      {sheetType && selectedMenu && <OwnerCommunicationSheet menu={selectedMenu} type={sheetType} userProfile={userProfile} language={language} demoMode={demoMode} scanId={demoMode ? undefined : sourceScanId} onServerAnswer={() => void refreshServerResult()} initialResponse={getStoredResponse(selectedMenu, sheetType)} onResponseSelect={handleOwnerResponseSelect} onClose={closeSheet} />}
      {profileSheetOpen && <ProfileCommunicationSheet items={profileCommunicationItems} language={language} onClose={() => setProfileSheetOpen(false)} />}
      <Dialog.Root open={photoOpen && Boolean(photoUrl)} onOpenChange={setPhotoOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-soy-ink/80" />
          <Dialog.Content aria-describedby={undefined} className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <Dialog.Title className="sr-only">{t('스캔한 메뉴판 사진', 'Scanned menu photo', 'صورة القائمة الممسوحة')}</Dialog.Title>
            <Dialog.Close aria-label={t('닫기', 'Close', 'إغلاق')} className="absolute end-4 top-4 flex size-11 items-center justify-center rounded-full bg-surface-raised text-text-primary"><X className="size-5" /></Dialog.Close>
            {photoUrl && <img src={photoUrl} onError={() => { setScanImageUrl(null); setPhotoOpen(false); if (scanImageUrl) setScanImageError(t('사진 주소가 만료되었어요. 다시 불러와 주세요.', 'The photo link expired. Load it again.', 'انتهت صلاحية رابط الصورة. حمّلها مجددًا.')); }} alt={t('스캔한 메뉴판 사진', 'Scanned menu photo', 'صورة القائمة الممسوحة')} className="max-h-[85dvh] max-w-full rounded-xl object-contain" />}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
