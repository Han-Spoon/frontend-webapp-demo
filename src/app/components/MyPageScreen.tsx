import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clearAuthData, logout } from '../../api/auth';
import { deleteMe, type CurrentUser } from '../../api/user';
import type { HistoryItem, Language, UserProfile } from '../types';
import type { ScanHistory } from '../hooks/useScanHistory';
import symbol from '../../assets/brand/han-spoon-symbol.svg';
import { HsDialog, HsIcon, HsIconButton, OfflineBanner, PillTabs, tx } from './hs';
import { FLIP_RTL } from './hs/icons';
import { HS_TEXT } from './hs/text';
import { ProfileTab, type ProfileSection } from './mypage/ProfileTab';
import { RecordsTab, type RecordsView } from './mypage/RecordsTab';
import { SettingsTab } from './mypage/SettingsTab';
import { M } from './mypage/text';

type TabType = 'profile' | 'records' | 'settings';

const isTab = (value: string | null): value is TabType => value === 'profile' || value === 'records' || value === 'settings';
const isView = (value: string | null): value is RecordsView => value === 'scans' || value === 'saved' || value === 'reviews';

/**
 * 흐름 7 마이페이지(F7-01~08). 탭: 프로필 · 내 기록(스캔 기록 · 저장한 음식 · 내 후기) · 설정.
 * 주소 `?tab=records&view=saved`로 바로 열 수 있다(옛 `/history` · `/mypage/saved-menus` · `/mypage/reviews`도 여기로).
 */
export function MyPageScreen({
  language,
  currentUser,
  demoMode,
  userProfile,
  scanHistory,
  onBack,
  onEditProfile,
  onOpenHistory,
  onTerms,
  onLogout,
}: {
  language: Language;
  currentUser: CurrentUser | null;
  demoMode: boolean;
  userProfile: UserProfile | null;
  scanHistory: ScanHistory;
  onBack: () => void;
  /** section 없으면 전체 온보딩(신규), 있으면 해당 단위만 수정 */
  onEditProfile: (section?: ProfileSection) => void;
  onOpenHistory: (item: HistoryItem) => Promise<void>;
  onTerms: () => void;
  onLogout: () => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: TabType = isTab(searchParams.get('tab')) ? searchParams.get('tab') as TabType : 'profile';
  const view: RecordsView = isView(searchParams.get('view')) ? searchParams.get('view') as RecordsView : 'scans';
  const go = (next: { tab?: TabType; view?: RecordsView }) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', next.tab ?? tab);
    if ((next.tab ?? tab) === 'records') params.set('view', next.view ?? view);
    else params.delete('view');
    setSearchParams(params, { replace: true });
  };

  const [confirm, setConfirm] = useState<'logout' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);
    try { await logout(); } catch (error) { console.error(error); } finally {
      setBusy(false);
      onLogout();
    }
  };
  const handleDeleteAccount = async () => {
    if (busy) return;
    setBusy(true);
    setDeleteError('');
    try {
      await deleteMe();
      clearAuthData();
      onLogout();
    } catch (error) {
      console.error('Delete account failed:', error);
      setDeleteError(tx(language, M.deleteAccountFailed));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-dvh flex-col bg-hs-surface-0 text-hs-ink-900">
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <header className="relative flex-none overflow-hidden rounded-b-[40px] bg-hs-mint-100 px-5 pt-[max(16px,env(safe-area-inset-top))] pb-[22px]">
          <img src={symbol} alt="" aria-hidden="true" className="pointer-events-none absolute -end-[30px] top-6 w-[130px] opacity-[0.14]" />
          <div className="relative flex items-center gap-2.5">
            <HsIconButton icon="back" label={tx(language, HS_TEXT.back)} iconClassName={FLIP_RTL} onClick={onBack} />
            <h1 className="text-[20px] font-black">{tx(language, M.title)}</h1>
          </div>
          <div className="relative mt-[18px] flex items-center gap-3.5">
            <span className="flex size-[58px] flex-none items-center justify-center rounded-t-[20px] rounded-b-[30px] bg-hs-surface-0 text-hs-brand-700">
              <HsIcon name="person" size={26} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[20px] font-black">{currentUser?.nickname ?? tx(language, M.user)}</span>
              {currentUser?.email && <span className="mt-0.5 block break-all text-[13px] font-semibold text-hs-ink-700">{currentUser.email}</span>}
            </span>
          </div>
        </header>

        <OfflineBanner language={language} className="mx-5 mt-4" />

        <PillTabs
          label={tx(language, M.tabs)}
          value={tab}
          onChange={(next) => go({ tab: next })}
          items={[
            { value: 'profile', label: tx(language, M.profile) },
            { value: 'records', label: tx(language, M.records) },
            { value: 'settings', label: tx(language, M.settings) },
          ]}
          className="mx-5 mt-[18px] flex-none"
        />

        <div role="tabpanel" className="flex flex-1 flex-col" aria-label={tx(language, tab === 'profile' ? M.profile : tab === 'records' ? M.records : M.settings)}>
          {tab === 'profile' && <ProfileTab language={language} userProfile={userProfile} onEdit={onEditProfile} />}
          {tab === 'records' && (
            <RecordsTab
              language={language}
              demoMode={demoMode}
              profile={userProfile}
              view={view}
              onViewChange={(next) => go({ tab: 'records', view: next })}
              scanHistory={scanHistory}
              onOpenHistory={onOpenHistory}
            />
          )}
          {tab === 'settings' && (
            <SettingsTab
              language={language}
              demoMode={demoMode}
              onTerms={onTerms}
              onLogout={() => setConfirm('logout')}
              onDeleteAccount={() => { setDeleteError(''); setConfirm('delete'); }}
            />
          )}
        </div>
      </main>

      {confirm === 'logout' && (
        <HsDialog
          language={language}
          icon="logout"
          title={tx(language, M.logout)}
          description={tx(language, M.logoutConfirm)}
          cancelLabel={tx(language, M.cancel)}
          confirmLabel={tx(language, M.logout)}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => void handleLogout()}
        />
      )}
      {confirm === 'delete' && (
        <HsDialog
          language={language}
          tone="danger"
          title={tx(language, M.deleteAccount)}
          description={<span className="whitespace-pre-line">{tx(language, M.deleteAccountBody)}</span>}
          cancelLabel={tx(language, M.cancel)}
          confirmLabel={tx(language, M.delete)}
          busy={busy}
          error={deleteError}
          onCancel={() => { setConfirm(null); setDeleteError(''); }}
          onConfirm={() => void handleDeleteAccount()}
        />
      )}
    </div>
  );
}
