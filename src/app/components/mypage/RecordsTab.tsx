import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { HistoryItem, Language, UserProfile } from '../../types';
import type { ScanHistory } from '../../hooks/useScanHistory';
import { deleteSavedMenu, getSavedMenus, type SavedMenu } from '../../../api/savedMenus';
import { deleteReview, getMyReviews, type RestaurantReview } from '../../../api/reviews';
import { isEndpointUnavailable } from '../../../api/user';
import { liveFeatures } from '../../featureAvailability';
import { useDemoValue } from '../../demo/storage';
import { deleteDemoReview, listDemoMyReviews } from '../../demo/reviews';
import { LANGUAGE_LOCALES } from '../../locales';
import { formatScanDate } from '../../utils/scanDate';
import { remoteFeatureUnavailable } from '../remoteFeatureMessage';
import { MealReviewSheet } from '../reviews/MealReviewSheet';
import { EmptyState, ErrorState, HsButton, HsDialog, HsHeart, HsIcon, InlineError, ReviewCard, RiskBadge, RiskCountBadge, ScanHistoryCard, SkeletonLine, UnderlineTabs, tx, txn, useToast } from '../hs';
import { answerLabel, toAnswerValue } from '../map/reviewText';
import { M, MENU_COUNT } from './text';

export type RecordsView = 'scans' | 'saved' | 'reviews';

/** F7-02~06 내 기록 탭: 스캔 기록 · 저장한 음식 · 내 후기(밑줄 탭) */
export function RecordsTab({ language, demoMode, profile, view, onViewChange, scanHistory, onOpenHistory }: {
  language: Language;
  demoMode: boolean;
  profile: UserProfile | null;
  view: RecordsView;
  onViewChange: (view: RecordsView) => void;
  scanHistory: ScanHistory;
  onOpenHistory: (item: HistoryItem) => Promise<void>;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <UnderlineTabs
        label={tx(language, M.recordTabs)}
        value={view}
        onChange={onViewChange}
        items={[
          { value: 'scans', label: tx(language, M.scans) },
          { value: 'saved', label: tx(language, M.savedMenus) },
          { value: 'reviews', label: tx(language, M.myReviews) },
        ]}
        className="mt-3.5 px-1.5"
      />
      <div className="flex-1 bg-hs-surface-100 px-5 pt-3.5 pb-10">
        {view === 'scans' && <ScanRecords language={language} scanHistory={scanHistory} onOpen={onOpenHistory} demoMode={demoMode} />}
        {view === 'saved' && <SavedMenus language={language} demoMode={demoMode} />}
        {view === 'reviews' && <MyReviews language={language} demoMode={demoMode} profile={profile} />}
      </div>
    </div>
  );
}

/** 회색 영역 위 카드 모양 스켈레톤 3장(C-02) */
function LoadingCards({ language }: { language: Language }) {
  return (
    <div role="status" aria-live="polite">
      <p className="ms-1 mb-2.5 text-[13px] font-semibold text-hs-ink-500">{tx(language, M.loading)}</p>
      <div className="space-y-2.5">
        {[0, 1, 2].map((index) => (
          <div key={index} className="rounded-hs-xl bg-hs-surface-0 p-4">
            <SkeletonLine width="60%" />
            <SkeletonLine width="38%" className="mt-2.5" />
            <div className="mt-3.5 flex gap-1.5">{[0, 1, 2, 3].map((chip) => <i key={chip} className="block h-[22px] w-14 rounded-hs-pill bg-hs-surface-skeleton" />)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────── 스캔 기록(F7-02 ~ 04) ───────────── */

type ItemError = { id: string; kind: 'open' | 'delete' };

function riskCounts(item: HistoryItem): { danger: number | null; caution: number | null } {
  if (item.menus.length > 0) {
    return {
      danger: item.menus.filter((menu) => menu.riskLevel === 'danger').length,
      caution: item.menus.filter((menu) => menu.riskLevel === 'caution').length,
    };
  }
  const valid = (value: number | null | undefined) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null);
  return { danger: valid(item.dangerCount), caution: valid(item.cautionCount) };
}

function ScanRecords({ language, scanHistory, onOpen, demoMode }: { language: Language; scanHistory: ScanHistory; onOpen: (item: HistoryItem) => Promise<void>; demoMode: boolean }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { history, loadFailed, loading, hasMore } = scanHistory;
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [itemError, setItemError] = useState<ItemError | null>(null);
  const [confirming, setConfirming] = useState<HistoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const open = async (item: HistoryItem) => {
    if (opening) return;
    setOpening(item.id);
    setItemError(null);
    try { await onOpen(item); } catch { setItemError({ id: item.id, kind: 'open' }); } finally { setOpening(null); }
  };
  const submitRename = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing || renaming) return;
    const title = editing.title.trim();
    if (!title) return;
    setRenaming(true);
    setRenameError(false);
    try {
      await scanHistory.renameHistory(editing.id, title);
      setEditing(null);
      toast.show(tx(language, M.renamed), { tone: 'success' });
    } catch {
      setRenameError(true);
    } finally {
      setRenaming(false);
    }
  };
  const confirmDelete = async () => {
    if (!confirming || deleting) return;
    setDeleting(true);
    setItemError(null);
    try {
      await scanHistory.deleteHistory(confirming.id);
      toast.show(tx(language, M.deleted), { tone: 'success' });
    } catch {
      setItemError({ id: confirming.id, kind: 'delete' });
    } finally {
      setDeleting(false);
      setConfirming(null);
    }
  };

  if (loading && history.length === 0) return <LoadingCards language={language} />;

  return (
    <div className="space-y-2.5">
      {loadFailed && <ErrorState language={language} title={tx(language, M.scansFailed)} description={tx(language, M.retryLater)} onRetry={() => void scanHistory.loadHistory()} />}
      {history.length === 0 && !loadFailed && (
        <EmptyState
          icon="scan"
          title={tx(language, M.noScans)}
          description={tx(language, M.noScansBody)}
          action={<HsButton size="md" icon="scan" onClick={() => navigate('/scan')}>{tx(language, M.scanMenu)}</HsButton>}
          className="bg-hs-surface-0"
        />
      )}
      {history.map((item) => {
        const { danger, caution } = riskCounts(item);
        const menuCount = item.menus.length > 0 ? item.menus.length : item.menuCount;
        const dateText = formatScanDate(item.date);
        const isEditing = editing?.id === item.id;
        return (
          <div key={item.id} className="relative">
            <ScanHistoryCard
              language={language}
              title={item.title}
              dateText={dateText}
              storeName={item.store?.name}
              menuCount={menuCount}
              cautionCount={caution}
              dangerCount={danger}
              onOpen={() => void open(item)}
              onMore={isEditing ? undefined : () => setMenuFor(menuFor === item.id ? null : item.id)}
              titleSlot={isEditing ? (
                <form onSubmit={submitRename} className="min-w-0 flex-1 pe-2">
                  <input
                    autoFocus
                    value={editing.title}
                    maxLength={255}
                    aria-label={tx(language, M.recordTitle)}
                    onChange={(event) => setEditing({ id: item.id, title: event.target.value })}
                    onKeyDown={(event) => { if (event.key === 'Escape') setEditing(null); }}
                    className="h-12 w-full rounded-hs-lg border-2 border-hs-brand-700 bg-hs-surface-0 px-3.5 text-[15px] font-black text-hs-ink-900 outline-none focus-visible:outline-none"
                  />
                  <div className="mt-2.5 flex gap-1.5">
                    <HsButton type="submit" size="sm" busy={renaming} disabled={!editing.title.trim()} className="px-3.5!">{tx(language, M.save)}</HsButton>
                    <HsButton type="button" size="sm" variant="soft" disabled={renaming} onClick={() => setEditing(null)} className="px-3.5!">{tx(language, M.cancel)}</HsButton>
                  </div>
                  {renameError && <InlineError className="mt-2">{tx(language, M.renameFailed)}</InlineError>}
                  <span className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    {item.store?.name && <span className="inline-flex items-center gap-[3px] text-[12px] font-extrabold text-hs-brand-700"><HsIcon name="pin" size={12} strokeWidth={2.4} />{item.store.name}</span>}
                    <span dir="ltr" className="text-[12px] font-semibold text-hs-ink-500">{dateText}</span>
                  </span>
                  <span className="mt-2.5 flex flex-wrap items-center gap-[5px]">
                    <span className="text-[12px] font-extrabold text-hs-ink-700">{txn(language, MENU_COUNT, menuCount)}</span>
                    {typeof caution === 'number' && caution > 0 && <RiskCountBadge risk="caution">{tx(language, { ko: `주의 ${caution}개`, en: `Caution ${caution}`, ar: `تنبيه ${caution}`, 'zh-CN': `注意 ${caution} 个`, ja: `注意 ${caution}件`, 'zh-TW': `注意 ${caution} 道`, es: `Precaución ${caution}` })}</RiskCountBadge>}
                    {typeof danger === 'number' && danger > 0 && <RiskCountBadge risk="danger">{tx(language, { ko: `위험 ${danger}개`, en: `Danger ${danger}`, ar: `خطر ${danger}`, 'zh-CN': `危险 ${danger} 个`, ja: `危険 ${danger}件`, 'zh-TW': `危險 ${danger} 道`, es: `Peligro ${danger}` })}</RiskCountBadge>}
                  </span>
                </form>
              ) : undefined}
            />
            {opening === item.id && <span className="sr-only" role="status">{tx(language, M.loading)}</span>}
            {menuFor === item.id && (
              <MoreMenu
                language={language}
                onClose={() => setMenuFor(null)}
                onRename={() => { setMenuFor(null); setRenameError(false); setEditing({ id: item.id, title: item.title }); }}
                onDelete={() => { setMenuFor(null); setItemError(null); setConfirming(item); }}
              />
            )}
            {itemError?.id === item.id && <InlineError className="mt-2 ms-1">{tx(language, itemError.kind === 'open' ? M.openFailed : M.deleteFailed)}</InlineError>}
          </div>
        );
      })}
      {!demoMode && hasMore && history.length > 0 && (
        <div className="flex justify-center pt-2">
          <HsButton variant="outline" size="md" busy={loading} onClick={() => void scanHistory.loadMore()}>{tx(language, loading ? M.loading : M.loadMore)}</HsButton>
        </div>
      )}
      {confirming && (
        <HsDialog
          language={language}
          tone="danger"
          title={tx(language, M.deleteTitle)}
          description={tx(language, M.cannotUndo)}
          cancelLabel={tx(language, M.cancel)}
          confirmLabel={tx(language, M.delete)}
          busy={deleting}
          onCancel={() => setConfirming(null)}
          onConfirm={() => void confirmDelete()}
        >
          <div className="mt-4 flex items-center gap-3 rounded-[20px] border-[1.5px] border-dashed border-[#F2B8B3] bg-[#FFF8F7] p-3 text-start">
            <span className="flex size-10 flex-none items-center justify-center rounded-[14px] border-[1.5px] border-hs-line-200 bg-hs-surface-0 text-hs-ink-700"><HsIcon name="file" size={18} /></span>
            <span className="min-w-0">
              <span dir="auto" className="block truncate text-[15px] font-black text-hs-ink-900">{confirming.title}</span>
              <span className="mt-0.5 block text-[12px] font-bold text-hs-ink-500"><span dir="ltr">{formatScanDate(confirming.date)}</span> · {txn(language, MENU_COUNT, confirming.menus.length || confirming.menuCount)}</span>
            </span>
          </div>
        </HsDialog>
      )}
    </div>
  );
}

/** ··· 누르면 카드 아래 뜨는 작은 메뉴(이름 수정 · 삭제) */
function MoreMenu({ language, onClose, onRename, onDelete }: { language: Language; onClose: () => void; onRename: () => void; onDelete: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const onPointer = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) onClose(); };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [onClose]);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); items[(index + 1) % items.length]?.focus(); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); items[(index - 1 + items.length) % items.length]?.focus(); }
  };
  return (
    <div ref={ref} role="menu" aria-label={tx(language, M.more)} onKeyDown={onKeyDown} className="absolute end-3.5 top-14 z-20 w-[180px] rounded-[20px] bg-hs-surface-0 p-1.5 shadow-[0_10px_30px_rgba(23,32,28,0.16)]">
      <button type="button" role="menuitem" onClick={onRename} className="flex min-h-11 w-full items-center gap-2.5 rounded-[14px] px-3 text-start text-[14px] font-extrabold text-hs-ink-900 hover:bg-hs-surface-100 focus:bg-hs-surface-100 focus:outline-none">
        <HsIcon name="edit" size={17} />{tx(language, M.rename)}
      </button>
      <button type="button" role="menuitem" onClick={onDelete} className="flex min-h-11 w-full items-center gap-2.5 rounded-[14px] px-3 text-start text-[14px] font-extrabold text-hs-danger-700 hover:bg-hs-danger-100 focus:bg-hs-danger-100 focus:outline-none">
        <HsIcon name="trash" size={17} />{tx(language, M.delete)}
      </button>
    </div>
  );
}

/* ───────────── 저장한 음식(F7-05) ───────────── */

export function SavedMenus({ language, demoMode }: { language: Language; demoMode: boolean }) {
  const toast = useToast();
  const [demoMenus, setDemoMenus] = useDemoValue<SavedMenu[]>('saved-menus', []);
  const [serverMenus, setServerMenus] = useState<SavedMenu[]>([]);
  const available = demoMode || liveFeatures.savedMenus;
  const [loading, setLoading] = useState(!demoMode && available);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (demoMode || !available) return;
    let active = true;
    setLoading(true);
    setError('');
    getSavedMenus().then((items) => { if (active) setServerMenus(items); })
      .catch((err) => { if (active) setError(isEndpointUnavailable(err) ? remoteFeatureUnavailable(language) : tx(language, M.savedFailed)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [demoMode, reload]);

  if (!available) return <EmptyState icon="heart" tone="coral" title={tx(language, M.savedMenus)} description={tx(language, M.preparing)} className="bg-hs-surface-0" />;
  if (loading) return <LoadingCards language={language} />;
  if (error) return <ErrorState language={language} title={error} description={tx(language, M.retryLater)} onRetry={() => setReload((value) => value + 1)} />;

  const menus = demoMode ? demoMenus : serverMenus;
  const remove = async (item: SavedMenu) => {
    if (busy) return;
    setBusy(item.id);
    try {
      if (demoMode) setDemoMenus(demoMenus.filter((menu) => menu.id !== item.id));
      else {
        await deleteSavedMenu(item.id);
        setServerMenus((current) => current.filter((menu) => menu.id !== item.id));
      }
      toast.show(tx(language, M.unsaved), { tone: 'success' });
    } catch {
      toast.show(tx(language, M.unsaveFailed), { tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  if (menus.length === 0) return <EmptyState icon="heart" tone="coral" title={tx(language, M.noSaved)} description={tx(language, M.noSavedBody)} className="bg-hs-surface-0" />;
  return (
    <>
      <p className="ms-1 mb-2.5 text-[13px] font-semibold text-hs-ink-500">{tx(language, M.savedNote)}</p>
      <ul className="grid grid-cols-2 gap-2">
        {menus.map((item) => (
          <li key={item.id} className="flex min-h-[150px] flex-col rounded-[22px] bg-hs-surface-0 py-3.5 ps-3.5 pe-3 shadow-[0_2px_10px_rgba(23,32,28,0.05)]">
            <div className="flex items-start justify-between gap-1">
              <RiskBadge risk={item.riskLevel} language={language} size="lg" className="h-[26px]! text-[12px]!" />
              <HsHeart on language={language} busy={busy === item.id} onToggle={() => void remove(item)} className="-mt-1.5 -me-1" />
            </div>
            <h3 lang="ko" className="mt-2.5 break-keep text-[17px] leading-[1.3] font-black text-hs-ink-900">{item.menuName}</h3>
            {item.translatedName && item.translatedName !== item.menuName && <p className="mt-0.5 text-[12px] font-semibold text-hs-ink-500">{item.translatedName}</p>}
            <p className="mt-auto flex items-center gap-1 pt-2.5 text-[12px] font-bold text-hs-ink-500">
              {item.store ? <><HsIcon name="pin" size={13} strokeWidth={2.4} className="flex-none" /><span className="truncate">{item.store.name}</span></> : <span className="text-hs-ink-400">{tx(language, M.noStore)}</span>}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ───────────── 내 후기(F7-06) ───────────── */

export function MyReviews({ language, demoMode, profile }: { language: Language; demoMode: boolean; profile: UserProfile | null }) {
  const toast = useToast();
  const available = demoMode || liveFeatures.reviews;
  const [reviews, setReviews] = useState<RestaurantReview[]>(() => (demoMode ? listDemoMyReviews() : []));
  const [loading, setLoading] = useState(!demoMode && available);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<RestaurantReview | null>(null);
  const [deleting, setDeleting] = useState<RestaurantReview | null>(null);
  const [removing, setRemoving] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (demoMode || !available) return;
    let active = true;
    setLoading(true);
    setError('');
    getMyReviews().then((items) => { if (active) setReviews(items); })
      .catch((err) => { if (active) setError(isEndpointUnavailable(err) ? remoteFeatureUnavailable(language) : tx(language, M.reviewsFailed)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [demoMode, reload]);

  if (!available) return <EmptyState icon="message" title={tx(language, M.myReviews)} description={tx(language, M.preparing)} className="bg-hs-surface-0" />;
  if (loading) return <LoadingCards language={language} />;
  if (error) return <ErrorState language={language} title={error} description={tx(language, M.retryLater)} onRetry={() => setReload((value) => value + 1)} />;

  const remove = async () => {
    if (!deleting || removing) return;
    setRemoving(true);
    setDeleteError('');
    try {
      if (demoMode) deleteDemoReview(deleting.id); else await deleteReview(deleting.id);
      setReviews((current) => current.filter((item) => item.id !== deleting.id));
      setDeleting(null);
      toast.show(tx(language, M.reviewDeleted), { tone: 'success' });
    } catch {
      setDeleteError(tx(language, M.deleteReviewFailed));
    } finally {
      setRemoving(false);
    }
  };
  const dateText = (iso: string) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], { dateStyle: 'long' }).format(date);
  };

  return (
    <>
      {reviews.length === 0 ? (
        <EmptyState icon="message" title={tx(language, M.noReviews)} description={tx(language, M.noReviewsBody)} className="bg-hs-surface-0" />
      ) : (
        <>
          <p className="ms-1 mb-2.5 text-[13px] font-semibold text-hs-ink-500">{tx(language, M.reviewsNote)}</p>
          <div className="space-y-2.5">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                language={language}
                storeName={review.storeName}
                dateText={dateText(review.createdAt)}
                hidden={review.hidden}
                mine
                menus={review.menus.map((menu) => ({
                  name: menu.name,
                  answers: Object.entries(menu.answers).map(([id, answer]) => ({ label: answerLabel(id, language), answer: toAnswerValue(answer) })),
                  comment: menu.note || null,
                }))}
                onEdit={() => setEditing(review)}
                onDelete={() => { setDeleteError(''); setDeleting(review); }}
              />
            ))}
          </div>
        </>
      )}
      {editing && (
        <MealReviewSheet
          language={language}
          profile={profile}
          store={{ id: editing.storeId, name: editing.storeName }}
          demoMode={demoMode}
          initialReview={editing}
          onClose={() => setEditing(null)}
          onSaved={(next) => setReviews((current) => current.map((item) => (item.id === next.id ? next : item)))}
        />
      )}
      {deleting && (
        <HsDialog
          language={language}
          tone="danger"
          title={tx(language, M.deleteReviewTitle)}
          description={<><span dir="auto" className="block font-black text-hs-ink-900">{deleting.storeName}</span>{tx(language, M.cannotUndo)}</>}
          cancelLabel={tx(language, M.cancel)}
          confirmLabel={tx(language, M.delete)}
          busy={removing}
          error={deleteError}
          onCancel={() => { setDeleting(null); setDeleteError(''); }}
          onConfirm={() => void remove()}
        />
      )}
    </>
  );
}
