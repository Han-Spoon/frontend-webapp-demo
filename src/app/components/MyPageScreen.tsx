import { useEffect, useState } from 'react';
import { ArrowLeft, User, LogOut, ChevronRight, Heart, MessageSquare, Check, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clearAuthData, logout } from '../../api/auth';
import { getConsentStatus, type ConsentStatus } from '../../api/consent';
import { deleteMe } from '../../api/user';
import type { CurrentUser } from '../../api/user';
import type { HistoryItem, Language, UserProfile } from '../App';
import { createTranslator, LANGUAGE_OPTIONS } from '../locales';
import { getProfileSummary } from '../results/resultViewModel';
import { MAP_LANGUAGE_OPTIONS, setMapLanguage, useMapLanguage } from '../../lib/mapLanguage';
import {
  getCountryFlag,
  getCountryName,
} from '../constants/onboarding';
import { ScanHistoryList } from './ScanHistoryList';
import { HistoryLoadError } from './HistoryLoadError';
import { ConfirmDialog } from './common/ConfirmDialog';
import { OfflineBanner } from './OfflineBanner';

type ProfileSection = 'language' | 'country' | 'diet';

interface MyPageScreenProps {
  language: Language;
  setLanguage: (language: Language) => void;
  currentUser: CurrentUser | null;
  demoMode: boolean;
  userProfile: UserProfile | null;
  history: HistoryItem[];
  /** 서버 기록 목록을 불러오지 못함 */
  historyLoadFailed: boolean;
  onRetryHistory: () => void;
  onBack: () => void;
  /** section 없으면 전체 온보딩(신규), 있으면 해당 단위만 수정 */
  onEditProfile: (section?: ProfileSection) => void;
  onHistoryClick: (item: HistoryItem) => Promise<void>;
  onEditHistoryTitle: (id: string, title: string) => Promise<void>;
  onDeleteHistory: (id: string) => Promise<void>;
  onTerms: () => void;
  onLogout: () => void;
}

type TabType = 'profile' | 'scan' | 'setting';

export function MyPageScreen({
  language,
  currentUser,
  demoMode,
  userProfile,
  history,
  historyLoadFailed,
  onRetryHistory,
  onBack,
  onEditProfile,
  onHistoryClick,
  onEditHistoryTitle,
  onDeleteHistory,
  onTerms,
  onLogout,
}: MyPageScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  // 로그아웃·탈퇴 요청 중 확인창 닫기·중복 누름 방지.
  const [accountBusy, setAccountBusy] = useState(false);
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | null>(null);
  const [consentError, setConsentError] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [consentReload, setConsentReload] = useState(0);
  const navigate = useNavigate();

  const t = createTranslator(language);
  const mapLanguage = useMapLanguage();

  useEffect(() => {
    if (demoMode || activeTab !== 'setting') return;
    let active = true;
    setConsentLoading(true);
    setConsentError(false);
    getConsentStatus().then(status => { if (active) setConsentStatus(status); })
      .catch(() => { if (active) setConsentError(true); })
      .finally(() => { if (active) setConsentLoading(false); });
    return () => { active = false; };
  }, [activeTab, consentReload, demoMode]);

  const currentLanguageLabel = LANGUAGE_OPTIONS.find((o) => o.value === language)?.label ?? language;
  const profileSummary = getProfileSummary(userProfile, language);

  const sectionHeader = (title: string, section: ProfileSection) => (
    <div className="flex min-h-11 items-center justify-between">
      <h3 className="text-base font-extrabold text-text-primary">{title}</h3>
      <button
        type="button"
        onClick={() => onEditProfile(section)}
        className="flex min-h-11 items-center gap-1 px-2 text-sm font-bold text-brand-primary"
      >
        {t('수정', 'Edit', 'تعديل')}
        <ChevronRight className="size-4 rtl:rotate-180" />
      </button>
    </div>
  );

  const handleLogout = async () => {
    if (accountBusy) return;
    setAccountBusy(true);
    try {
      await logout();
    } catch (error) {
      console.error(error);
    } finally {
      setAccountBusy(false);
      onLogout();
    }
  };

  const handleDeleteAccount = async () => {
    if (accountBusy) return;
    setAccountBusy(true);
    setDeleteError('');
    try {
      await deleteMe();
      clearAuthData();
      onLogout();
    } catch (error) {
      console.error('Delete account failed:', error);
      setDeleteError(
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : t('계정 삭제에 실패했습니다.', 'Account deletion failed.', 'فشل حذف الحساب.'),
      );
    } finally {
      setAccountBusy(false);
    }
  };

  return (
    <div className="h-dvh flex flex-col bg-rice-cream">
      <div className="h-16 border-b border-border-warm bg-rice-white/95 flex items-center px-5 relative flex-shrink-0">
        <button onClick={onBack} className="absolute start-4 inline-flex size-11 items-center justify-center rounded-full hover:bg-brand-green-50" aria-label={t('이전', 'Back', 'رجوع')}>
          <ArrowLeft className="size-5 text-soy-ink rtl:rotate-180" />
        </button>
        <h1 className="text-base font-bold text-soy-ink mx-auto">{t('마이페이지', 'My Page', 'صفحتي')}</h1>
      </div>
      <OfflineBanner language={language} />

      <div className="border-b border-border-warm bg-surface-subtle px-5 py-6">
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-[18px] bg-brand-primary-soft">
            <User className="size-6 text-brand-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-extrabold text-text-primary">{currentUser?.nickname ?? t('사용자', 'User', 'مستخدم')}</div>
            {currentUser?.email && <div className="break-all text-sm text-text-secondary">{currentUser.email}</div>}
          </div>
        </div>
      </div>

      <div className="flex border-b border-border-warm bg-rice-white" role="tablist" aria-label={t('마이페이지 메뉴', 'My page sections', 'أقسام صفحتي')}>
        {[
          { value: 'profile', label: t('프로필', 'Profile', 'الملف') },
          { value: 'scan', label: t('스캔 기록', 'Scans', 'عمليات المسح') },
          { value: 'setting', label: t('설정', 'Setting', 'الإعدادات') },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value as TabType)}
            role="tab"
            aria-selected={activeTab === value}
            className={`flex-1 min-h-12 px-1 text-sm font-bold transition-colors relative ${
              activeTab === value ? 'text-brand-green-700' : 'text-sesame-gray hover:text-soy-ink'
            }`}
          >
            {label}
            {activeTab === value && <div className="absolute bottom-0 inset-x-3 h-0.5 rounded-full bg-brand-primary" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'profile' && (
          <div className="space-y-4 px-5 py-5 pb-8">
            {userProfile ? (
              <>
                <section className="rounded-[20px] border border-border-warm bg-surface-raised px-4 py-1">
                  {sectionHeader(t('언어', 'Language', 'اللغة'), 'language')}
                  <div className="flex min-h-11 items-center justify-between gap-3 border-t border-border-warm py-3 text-sm">
                    <span className="font-semibold text-text-secondary">{t('앱 언어', 'App language', 'لغة التطبيق')}</span>
                    <span className="font-bold text-text-primary">{currentLanguageLabel}</span>
                  </div>
                </section>

                <section className="rounded-[20px] border border-border-warm bg-surface-raised px-4 py-1">
                  {sectionHeader(t('나라', 'Country', 'البلد'), 'country')}
                  <div className="flex min-h-11 items-center justify-between gap-3 border-t border-border-warm py-3 text-sm">
                    <span className="font-semibold text-text-secondary">{t('국가', 'Country', 'البلد')}</span>
                    {userProfile.nationality ? (
                      <span className="flex items-center gap-1.5 font-bold text-text-primary">
                        <span aria-hidden="true">{getCountryFlag(userProfile.nationality)}</span>
                        <span>
                          {getCountryName(userProfile.nationality, language)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-text-secondary">{t('없음', 'None', 'لا شيء')}</span>
                    )}
                  </div>
                </section>

                <section className="rounded-[20px] border border-border-warm bg-surface-raised px-4 py-1">
                  {sectionHeader(t('식단', 'Diet', 'النظام الغذائي'), 'diet')}
                  <div className="flex min-h-11 items-start justify-between gap-3 border-t border-border-warm py-3 text-sm">
                    <span className="shrink-0 font-semibold text-text-secondary">{t('고른 항목', 'Selected', 'المحدد')}</span>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {profileSummary.length ? profileSummary.map(item => <span key={item} className="rounded-[14px] border border-border-warm bg-surface-subtle px-2.5 py-1.5 text-xs font-bold text-text-secondary">{item}</span>) : <span className="font-bold text-text-primary">{t('특별히 가리는 음식 없어요', 'No food restrictions', 'لا توجد قيود غذائية')}</span>}
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <div className="py-12 text-center space-y-4">
                <p className="text-sm text-sesame-gray">
                  {t('설정된 프로필이 없습니다', 'No profile set', 'لا يوجد ملف محدد')}
                </p>
                <button
                  onClick={() => onEditProfile()}
                  className="h-13 px-6 bg-brand-green-700 text-white text-sm font-bold rounded-2xl hover:bg-brand-green-900 transition-colors"
                >
                  {t('프로필 설정하기', 'Set up profile', 'إعداد الملف')}
                </button>
              </div>
            )}
            <button type="button" onClick={() => navigate('/mypage/saved-menus')} className="flex min-h-14 w-full items-center gap-3 rounded-[20px] border border-border-warm bg-surface-raised px-4 text-start text-sm font-extrabold text-brand-primary"><Heart className="size-5" />{t('저장한 메뉴', 'Saved menus', 'الأطباق المحفوظة')}<ChevronRight className="ms-auto size-4 rtl:rotate-180" /></button>
            <button type="button" onClick={() => navigate('/mypage/reviews')} className="flex min-h-14 w-full items-center gap-3 rounded-[20px] border border-border-warm bg-surface-raised px-4 text-start text-sm font-extrabold text-brand-primary"><MessageSquare className="size-5" />{t('내가 작성한 후기', 'My reviews', 'مراجعاتي')}<ChevronRight className="ms-auto size-4 rtl:rotate-180" /></button>
          </div>
        )}

        {activeTab === 'scan' && (
          <div className="px-5 py-6">
            {historyLoadFailed && <HistoryLoadError language={language} onRetry={onRetryHistory} />}
            {history.length > 0 ? (
              <ScanHistoryList
                language={language}
                history={history}
                onOpen={onHistoryClick}
                onDelete={onDeleteHistory}
                onRename={onEditHistoryTitle}
              />
            ) : !historyLoadFailed && (
              <div className="py-16 text-center">
                <div className="text-4xl mb-4">📋</div>
                <p className="text-sm text-sesame-gray">
                  {t('스캔 기록이 없어요', 'No scan history yet', 'لا يوجد سجل مسح بعد')}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/scan')}
                  className="mt-5 min-h-11 rounded-xl bg-brand-primary px-5 text-sm font-bold text-white"
                >
                  {t('메뉴 스캔하기', 'Scan a menu', 'امسح قائمة')}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'setting' && (
          <div className="space-y-12 px-5 py-8 pb-12">
            {/* 지도 언어: 앱 언어와 별개인 기기 설정(네이버 지도는 ko/en/zh/ja만 지원) */}
            <section>
              <h3 className="text-base font-extrabold text-text-primary">
                {t('지도 언어', 'Map language', 'لغة الخريطة')}
              </h3>
              <p className="mt-0.5 text-sm text-text-secondary">
                {t(
                  '지도에 표시되는 지명 언어예요. 기본은 한국어예요.',
                  'Language for place names on the map. Korean by default.',
                  'لغة أسماء الأماكن على الخريطة. الكورية افتراضياً.',
                )}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {MAP_LANGUAGE_OPTIONS.map((option) => {
                  const active = option.value === mapLanguage;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMapLanguage(option.value)}
                      aria-pressed={active}
                      className={`flex min-h-[62px] items-center justify-between gap-2 rounded-[22px] border px-5 text-base font-extrabold transition-colors ${
                        active
                          ? 'border-brand-primary bg-brand-primary-soft text-text-primary'
                          : 'border-border-warm bg-surface-raised text-text-primary hover:bg-brand-primary-soft'
                      }`}
                    >
                      <span>{option.label}</span>
                      <span aria-hidden="true" className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 ${active ? 'border-brand-primary bg-brand-primary text-white' : 'border-text-tertiary'}`}>{active && <Check className="size-4" />}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[20px] border border-border-warm bg-surface-raised px-4 py-1">
              <div className="flex min-h-12 items-center justify-between gap-2">
                <h3 className="text-base font-extrabold">{t('알림 · 동의', 'Notifications · consent', 'الإشعارات · الموافقة')}</h3>
                <button type="button" onClick={onTerms} className="flex min-h-11 items-center gap-1 px-2 text-sm font-bold text-brand-primary"><Pencil className="size-4" aria-hidden="true" />{t('수정', 'Edit', 'تعديل')}</button>
              </div>
              <div className="flex min-h-11 items-center justify-between gap-2 border-t border-border-warm py-3 text-sm">
                <span className="font-semibold text-text-secondary">{t('마케팅 정보 수신', 'Marketing messages', 'الرسائل التسويقية')}</span>
                <span className="text-end font-bold">{demoMode
                  ? t('시연용 선택', 'Demo choice', 'اختيار تجريبي')
                  : consentLoading ? t('확인 중…', 'Checking…', 'جارٍ التحقق…')
                    : consentError || consentStatus?.decisions.marketing === undefined ? t('확인 필요', 'Check status', 'تحقق من الحالة')
                      : consentStatus.decisions.marketing ? t('동의함', 'Agreed', 'موافق') : t('동의 안 함', 'Not agreed', 'غير موافق')}</span>
              </div>
              {consentError && <button type="button" onClick={() => setConsentReload(value => value + 1)} className="mb-2 min-h-11 text-sm font-bold text-brand-primary">{t('동의 상태 다시 확인', 'Retry consent status', 'إعادة التحقق من الموافقة')}</button>}
            </section>

            <section className="border-t border-border-warm pt-7">
              <h3 className="mb-4 text-base font-extrabold">{t('계정', 'Account', 'الحساب')}</h3>
              <button type="button" onClick={() => setShowLogoutConfirm(true)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[18px] border border-border-warm bg-surface-raised text-sm font-bold"><LogOut className="size-4" aria-hidden="true" />{t('로그아웃', 'Log out', 'تسجيل الخروج')}</button>
              <p className="mt-12 text-xs leading-5 text-text-secondary">{t('탈퇴하면 스캔 기록·식사 후기·직원 카드가 모두 지워지고 되돌릴 수 없어요.', 'Deleting your account removes scans, reviews and staff cards permanently.', 'حذف الحساب يزيل السجلات والمراجعات والبطاقات نهائياً.')}</p>
              <button type="button" onClick={() => setShowDeleteConfirm(true)} className="mt-3 min-h-11 rounded-[18px] border border-status-danger px-4 text-sm font-bold text-status-danger-text">{t('회원 탈퇴', 'Delete account', 'حذف الحساب')}</button>
            </section>
          </div>
        )}
      </div>

      {showLogoutConfirm && (
        <ConfirmDialog
          language={language}
          title={t('로그아웃', 'Log out', 'تسجيل الخروج')}
          description={t('정말 로그아웃하시겠습니까?', 'Are you sure you want to log out?', 'هل أنت متأكد أنك تريد تسجيل الخروج؟')}
          cancelLabel={t('취소', 'Cancel', 'إلغاء')}
          confirmLabel={t('로그아웃', 'Log out', 'تسجيل الخروج')}
          busy={accountBusy}
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={() => void handleLogout()}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          language={language}
          tone="danger"
          title={t('회원 탈퇴', 'Delete account', 'حذف الحساب')}
          description={t(
            '정말 계정을 삭제하시겠습니까? 모든 데이터가 삭제됩니다.',
            'Delete your account? All data will be removed.',
            'هل تريد حذف حسابك؟ سيتم حذف جميع البيانات.',
          )}
          cancelLabel={t('취소', 'Cancel', 'إلغاء')}
          confirmLabel={t('삭제', 'Delete', 'حذف')}
          busy={accountBusy}
          error={deleteError}
          onCancel={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
          onConfirm={() => void handleDeleteAccount()}
        />
      )}
    </div>
  );
}
