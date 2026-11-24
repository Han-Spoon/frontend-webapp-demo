import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getStoreReviews, reportReview, type ReportReason, type RestaurantReview } from '../../../api/reviews';
import { storeDetailToCandidate, type StoreCandidate, type StoreDetail } from '../../../api/store';
import { liveFeatures } from '../../featureAvailability';
import { demoRestaurantOf } from '../../demo/mapDemoStores';
import { listDemoStoreReviews, reportDemoReview } from '../../demo/reviews';
import { useDemoValue } from '../../demo/storage';
import { demoStoreDistrict } from '../../demo/storeDetails';
import { useGrantedPosition } from '../../hooks/useGrantedPosition';
import { useStoreDetail } from '../../hooks/useStoreDetail';
import type { Language, UserProfile } from '../../types';
import { ErrorState, HsButton, HsIcon, HsIconButton, OfflineBanner, SkeletonLine, tx, txn, useToast } from '../hs';
import { FLIP_RTL } from '../hs/icons';
import { BowlTile } from '../hs/RiskBadge';
import { HS_TEXT } from '../hs/text';
import { REVIEW_TEXT } from '../map/reviewText';
import { useSavedStores } from '../map/savedStores';
import { StoreReviewsPanel } from '../map/StoreReviewsPanel';
import { MealReviewSheet } from '../reviews/MealReviewSheet';
import { distanceBetween, distanceText, storeMetaLine, storeName } from './storeFormat';
import { StoreMenuRow } from './StoreMenuRow';
import { STORE_TEXT, TAB_COUNT } from './storeText';

type StoreTab = 'menu' | 'reviews';

/** 지도에서 넘겨주는 값: 고른 후보(목록의 거리) */
export interface StoreDetailRouteState {
  candidate?: StoreCandidate;
}

interface ReviewState {
  items: RestaurantReview[];
  loading: boolean;
  error: boolean;
}

/**
 * 흐름 2 가게 상세(F2-08 메뉴 탭 · F2-05 후기 탭 · F2-09 메뉴 · 사진 없음). `/stores/:storeId?tab=menu|reviews`.
 * 데이터: 가게 상세 API(`GET /stores/{storeId}`) + 후기(`GET /stores/{storeId}/reviews`). 판정은 붙이지 않는다.
 */
export function StoreDetailScreen({ language, userProfile, demoMode, onSelectStore }: {
  language: Language;
  userProfile: UserProfile | null;
  demoMode: boolean;
  onSelectStore: (store: StoreCandidate | null) => void;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const params = useParams();
  const storeId = Number(params.storeId);
  const validId = Number.isInteger(storeId) && storeId > 0;
  const routeState = (useLocation().state ?? null) as StoreDetailRouteState | null;
  const fromMap = routeState?.candidate?.storeId === storeId ? routeState.candidate : null;
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: StoreTab = searchParams.get('tab') === 'reviews' ? 'reviews' : 'menu';
  const state = useStoreDetail(validId ? storeId : null, demoMode);
  const detail = state.detail;
  const position = useGrantedPosition();
  const { isSaved, toggle } = useSavedStores();
  const [, setDemoRestaurant] = useDemoValue<string | null>('selected-restaurant', null);

  const back = () => {
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (historyIndex > 0) navigate(-1);
    else navigate('/map');
  };

  // 후기(후기 탭 · 탭 숫자는 상세의 reviewCount)
  const demoRestaurant = demoMode ? demoRestaurantOf({ storeId } as StoreCandidate) : null;
  const reviewsEnabled = demoMode || liveFeatures.reviews;
  const [reviewVersion, setReviewVersion] = useState(0);
  const [reviews, setReviews] = useState<ReviewState>({ items: [], loading: true, error: false });
  useEffect(() => {
    if (!validId || !reviewsEnabled) return;
    let active = true;
    setReviews((current) => ({ ...current, loading: true, error: false }));
    const request = demoMode
      ? Promise.resolve(demoRestaurant ? listDemoStoreReviews(demoRestaurant.id) : [])
      : getStoreReviews(storeId);
    request
      .then((items) => { if (active) setReviews({ items, loading: false, error: false }); })
      .catch(() => { if (active) setReviews({ items: [], loading: false, error: true }); });
    return () => { active = false; };
  }, [storeId, reviewVersion, demoMode]);
  const report = async (review: RestaurantReview, reason: ReportReason) => { if (demoMode) reportDemoReview(review.id, reason); else await reportReview(review.id, reason); };
  const [writing, setWriting] = useState(false);

  // 위로 올리면 사진이 접히고 이름 줄 + 탭이 위에 붙는다(F2-05).
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const threshold = () => {
    const tabs = tabsRef.current;
    if (!tabs) return Number.POSITIVE_INFINITY;
    return tabs.offsetTop + tabs.offsetHeight - (stickyRef.current?.offsetHeight ?? 0);
  };
  const onScroll = () => setCollapsed((scrollRef.current?.scrollTop ?? 0) >= threshold());
  useLayoutEffect(onScroll, [detail, tab]);

  const selectTab = (next: StoreTab) => {
    if (next === tab) return;
    const keep = collapsed;
    setSearchParams((current) => {
      const nextParams = new URLSearchParams(current);
      if (next === 'menu') nextParams.delete('tab'); else nextParams.set('tab', next);
      return nextParams;
    }, { replace: true, state: routeState });
    // 위에 붙은 상태면 새 탭의 맨 위가 붙은 줄 바로 아래 오게.
    if (keep) requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: threshold() }));
  };

  const candidate = useMemo(() => (detail ? storeDetailToCandidate(detail) : null), [detail]);
  const saved = isSaved(storeId);
  const toggleSave = () => {
    if (!candidate) return;
    toggle(candidate);
    if (!saved) toast.show(tx(language, STORE_TEXT.savedToast), { tone: 'success' });
  };

  // [이 식당 메뉴 스캔]: 어디서 들어왔든 storeId + storeMatchMethod 'store_detail'(서버 관측용)로 촬영 화면에 연결.
  // 지도 미리보기 시트에서 바로 스캔할 때만 후보의 원래 matchMethod를 보낸다(지도 화면 쪽).
  const scan = () => {
    if (!detail) return;
    if (demoMode) {
      // 시연: 시연 지도 가게만 촬영 화면의 식당으로 연결된다.
      setDemoRestaurant(demoRestaurant?.id ?? null);
    } else {
      onSelectStore(storeDetailToCandidate(detail, 'store_detail'));
    }
    navigate('/scan');
  };

  const distanceMeters = typeof fromMap?.distanceMeters === 'number'
    ? fromMap.distanceMeters
    : detail && position ? distanceBetween(position, detail) : null;
  const districtFallback = demoMode ? demoStoreDistrict(storeId, language) : null;

  if (!validId || state.status === 'error') {
    return (
      <div className="flex h-dvh flex-col bg-hs-surface-0">
        <div className="flex-none px-4 pt-[max(18px,env(safe-area-inset-top))]">
          <HsIconButton icon="back" tone="soft" label={tx(language, HS_TEXT.back)} iconClassName={FLIP_RTL} onClick={back} />
        </div>
        <OfflineBanner language={language} onRetry={state.retry} className="mx-5 mt-3" />
        <ErrorState language={language} title={tx(language, STORE_TEXT.loadFailed)} description={tx(language, STORE_TEXT.loadFailedBody)} onRetry={validId ? state.retry : undefined} className="mx-5 mt-6" />
      </div>
    );
  }

  if (!detail) return <StoreDetailSkeleton language={language} onBack={back} />;

  const name = storeName(detail);
  const meta = storeMetaLine(detail, language, districtFallback);
  const menus = detail.menus ?? [];
  const tabs = (
    <StoreTabs
      language={language}
      value={tab}
      onChange={selectTab}
      menuCount={menus.length}
      reviewCount={detail.reviewCount ?? 0}
    />
  );
  const saveButton = (onPhoto: boolean) => (
    <HsIconButton
      icon="bookmark"
      tone={onPhoto ? 'white' : 'soft'}
      label={tx(language, saved ? STORE_TEXT.unsave : STORE_TEXT.save)}
      aria-pressed={saved}
      onClick={toggleSave}
      className={saved ? 'text-hs-brand-700 [&_svg]:fill-current' : ''}
    />
  );

  return (
    <div className="relative flex h-dvh flex-col bg-hs-surface-0 text-hs-ink-900">
      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
        <StoreHero
          language={language}
          detail={detail}
          name={name}
          onBack={back}
          saveButton={saveButton}
        />
        <div className="px-5 pt-3 pb-3.5">
          <h1 className="text-[24px] leading-tight font-black break-words">{name}</h1>
          {meta && <p className="mt-1 text-[13px] font-semibold text-hs-ink-500">{meta}</p>}
          {typeof distanceMeters === 'number' && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-extrabold text-hs-brand-700">
              <HsIcon name="pin" size={13} strokeWidth={2.4} />
              {distanceText(distanceMeters, language)}
            </p>
          )}
        </div>
        <OfflineBanner language={language} onRetry={state.retry} className="mx-5 mb-3" />
        <div ref={tabsRef} className="px-5">{tabs}</div>

        <div id={`store-panel-${tab}`} role="tabpanel" aria-labelledby={`store-tab-${tab}`}>
          {tab === 'menu' ? (
            <div className="px-5 pb-6">
              <p className="mt-3.5 flex items-start gap-1.5 rounded-[14px] bg-hs-surface-100 px-3 py-2.5 text-[12px] leading-[1.5] font-bold text-hs-ink-700">
                <HsIcon name="alert" size={16} strokeWidth={2.4} className="mt-px flex-none text-hs-brand-700" />
                <span>{tx(language, STORE_TEXT.menuNote)}</span>
              </p>
              {menus.length > 0 ? (
                <ul>{menus.map((menu) => <StoreMenuRow key={menu.storeMenuId} language={language} menu={menu} />)}</ul>
              ) : (
                <div className="mt-5 flex flex-col items-center rounded-[26px] border-2 border-dashed border-hs-line-300 px-[22px] py-[30px] text-center">
                  <BowlTile className="h-[72px] w-[84px] bg-hs-mint-100 text-hs-brand-700"><HsIcon name="file" size={30} /></BowlTile>
                  <h2 className="mt-4 text-[18px] font-black">{tx(language, STORE_TEXT.noMenuTitle)}</h2>
                  <p className="mt-2 text-[14px] leading-[1.55] font-semibold whitespace-pre-line text-hs-ink-500">{tx(language, STORE_TEXT.noMenuBody)}</p>
                </div>
              )}
            </div>
          ) : (
            <StoreReviewsPanel
              language={language}
              profile={userProfile}
              reviews={reviews.items}
              loading={reviews.loading}
              error={reviews.error}
              preparing={!reviewsEnabled}
              onRetry={() => setReviewVersion((value) => value + 1)}
              onReport={report}
            />
          )}
        </div>
      </div>

      {/* 위로 올리면 붙는 이름 줄 + 탭(F2-05) */}
      {collapsed && (
        <div ref={stickyRef} className="absolute inset-x-0 top-0 z-20 bg-hs-surface-0 shadow-[var(--hs-shadow-sticky)]">
          <div className="flex items-center gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-1.5">
            <HsIconButton icon="back" tone="soft" label={tx(language, HS_TEXT.back)} iconClassName={FLIP_RTL} onClick={back} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-black">{name}</p>
              {meta && <p className="truncate text-[12px] font-semibold text-hs-ink-500">{meta}</p>}
            </div>
            {saveButton(false)}
          </div>
          <div className="px-5">{tabs}</div>
        </div>
      )}

      <div className="flex flex-none gap-2 border-t-[1.5px] border-hs-line-200 bg-hs-surface-0 px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
        {tab === 'reviews' && (
          <HsButton variant="outline" className="h-auto! min-h-[54px] flex-none px-5 text-[16px]! whitespace-nowrap" disabled={!reviewsEnabled} onClick={() => setWriting(true)}>
            {tx(language, REVIEW_TEXT.writeReview)}
          </HsButton>
        )}
        <HsButton icon="scan" className="h-auto! min-h-[54px] min-w-0 flex-1 py-2 text-center text-[16px]!" onClick={scan}>{tx(language, STORE_TEXT.scanStore)}</HsButton>
      </div>

      {writing && (
        <MealReviewSheet
          language={language}
          profile={userProfile}
          store={{ id: demoRestaurant?.id ?? storeId, name }}
          demoMode={demoMode}
          onClose={() => setWriting(false)}
          onSaved={() => { setWriting(false); setReviewVersion((value) => value + 1); }}
        />
      )}
    </div>
  );
}

/** 위: 가게 사진(230, contain + 어두운 바탕) 위에 흰 원형 [뒤로] · [저장]. 사진이 없거나 실패하면 버튼 줄만. */
function StoreHero({ language, detail, name, onBack, saveButton }: {
  language: Language;
  detail: StoreDetail;
  name: string;
  onBack: () => void;
  saveButton: (onPhoto: boolean) => ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const photo = detail.thumbnailUrl && !failed ? detail.thumbnailUrl : null;
  if (!photo) {
    return (
      <div className="flex justify-between px-4 pt-[max(18px,env(safe-area-inset-top))]">
        <HsIconButton icon="back" tone="soft" label={tx(language, HS_TEXT.back)} iconClassName={FLIP_RTL} onClick={onBack} />
        {saveButton(false)}
      </div>
    );
  }
  return (
    <div className="relative flex h-[230px] items-center justify-center overflow-hidden bg-[#1F2623]">
      <img src={photo} alt={`${tx(language, STORE_TEXT.photo)} · ${name}`} onError={() => setFailed(true)} className="h-full w-full object-contain" />
      <div className="absolute inset-x-4 top-[max(16px,env(safe-area-inset-top))] flex justify-between">
        <HsIconButton icon="back" tone="white" label={tx(language, HS_TEXT.back)} iconClassName={FLIP_RTL} onClick={onBack} />
        {saveButton(true)}
      </div>
    </div>
  );
}

/** 밑줄 탭 2등분: [메뉴 N개] [후기 N개]. 선택은 ink-900 + 3px 밑줄, 숫자 brand-700. */
function StoreTabs({ language, value, onChange, menuCount, reviewCount }: {
  language: Language;
  value: StoreTab;
  onChange: (tab: StoreTab) => void;
  menuCount: number;
  reviewCount: number;
}) {
  const items: Array<{ id: StoreTab; label: string; count: number }> = [
    { id: 'menu', label: tx(language, STORE_TEXT.menuTab), count: menuCount },
    { id: 'reviews', label: tx(language, STORE_TEXT.reviewTab), count: reviewCount },
  ];
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = value === 'menu' ? 'reviews' : 'menu';
    onChange(next);
    requestAnimationFrame(() => document.getElementById(`store-tab-${next}`)?.focus());
  };
  return (
    <div role="tablist" aria-label={tx(language, STORE_TEXT.tabs)} onKeyDown={onKeyDown} className="flex">
      {items.map((item) => {
        const on = item.id === value;
        return (
          <button
            key={item.id}
            id={`store-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={`store-panel-${item.id}`}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={`h-[50px] flex-1 text-[15px] ${on ? 'border-b-[3px] border-hs-ink-900 font-black text-hs-ink-900' : 'border-b-[1.5px] border-hs-line-200 font-extrabold text-hs-ink-400'}`}
          >
            {item.label} <span dir="ltr" className={on ? 'text-hs-brand-700' : ''}>{txn(language, TAB_COUNT, item.count)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 불러오는 중: 사진 · 정보 · 메뉴 줄 스켈레톤 */
function StoreDetailSkeleton({ language, onBack }: { language: Language; onBack: () => void }) {
  return (
    <div role="status" aria-live="polite" className="flex h-dvh flex-col overflow-hidden bg-hs-surface-0">
      <span className="sr-only">{tx(language, HS_TEXT.loading)}</span>
      <div className="relative h-[230px] flex-none bg-[#E6ECE9]">
        <div className="absolute inset-x-4 top-[max(16px,env(safe-area-inset-top))]">
          <HsIconButton icon="back" tone="white" label={tx(language, HS_TEXT.back)} iconClassName={FLIP_RTL} onClick={onBack} />
        </div>
      </div>
      <div className="px-5 pt-4">
        <SkeletonLine width="55%" className="h-6!" />
        <SkeletonLine width="70%" className="mt-2.5" />
        <SkeletonLine width="35%" className="mt-2.5" />
      </div>
      <div className="mt-5 flex border-b-[1.5px] border-hs-line-200 px-5"><SkeletonLine width="30%" className="my-4" /></div>
      <div className="px-5">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex gap-3.5 border-b-[1.5px] border-hs-line-200 py-4">
            <div className="size-[88px] flex-none rounded-[18px] bg-[#E6ECE9]" />
            <div className="min-w-0 flex-1 pt-1">
              <SkeletonLine width="50%" />
              <SkeletonLine width="35%" className="mt-2.5" />
              <SkeletonLine width="40%" className="mt-2.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
