import { useState } from 'react';
import { ArrowLeft, User, LogOut, ChevronRight, Heart, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clearAuthData, logout } from '../../api/auth';
import { deleteMe } from '../../api/user';
import type { CurrentUser } from '../../api/user';
import type { Language, UserProfile } from '../App';
import { createTranslator, LANGUAGE_OPTIONS } from '../locales';
import { getProfileSummary } from '../results/resultViewModel';
import { MAP_LANGUAGE_OPTIONS, setMapLanguage, useMapLanguage } from '../../lib/mapLanguage';
import {
  getCountryFlag,
  getCountryName,
} from '../constants/onboarding';
import { ScanHistoryList } from './ScanHistoryList';
import { OfflineBanner } from './OfflineBanner';

type ProfileSection = 'language' | 'country' | 'diet';

interface HistoryItem {
  id: string;
  title: string;
  date: string;
  menuCount: number;
  dangerCount: number;
  menus: any[];
}

interface MyPageScreenProps {
  language: Language;
  setLanguage: (language: Language) => void;
  currentUser: CurrentUser | null;
  userProfile: UserProfile | null;
  history: HistoryItem[];
  onBack: () => void;
  /** section 미지정 시 전체 온보딩(신규 생성), 지정 시 해당 단위만 수정 */
  onEditProfile: (section?: ProfileSection) => void;
  onHistoryClick: (item: HistoryItem) => void;
  onEditHistoryTitle: (id: string, title: string) => Promise<void>;
  onDeleteHistory: (id: string) => void;
  onTerms: () => void;
  onLogout: () => void;
}

type TabType = 'profile' | 'scan' | 'setting';

export function MyPageScreen({
  language,
  currentUser,
  userProfile,
  history,
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
  const navigate = useNavigate();

  const t = createTranslator(language);
  const mapLanguage = useMapLanguage();

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
    try {
      await logout();
    } catch (error) {
      console.error(error);
    } finally {
      onLogout();
    }
  };

  const handleDeleteAccount = async () => {
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
            {history.length > 0 ? (
              <ScanHistoryList
                language={language}
                history={history}
                onOpen={onHistoryClick}
                onDelete={onDeleteHistory}
                onRename={onEditHistoryTitle}
              />
            ) : (
              <div className="py-16 text-center">
                <div className="text-4xl mb-4">📋</div>
                <p className="text-sm text-sesame-gray">
                  {t('스캔 기록이 없어요', 'No scan history yet', 'لا يوجد سجل مسح بعد')}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'setting' && (
          <div className="px-5 py-6 space-y-3">
            {/* 지도 언어 — 앱 언어와 독립된 로컬 표시 설정이라 프로필 편집 플로우를 타지 않는다.
                네이버 지도가 ko/en/zh/ja 4개만 지원해서 앱 언어(7개)와 1:1 대응이 불가능하다. */}
            <section>
              <h3 className="mb-1 text-sm font-bold text-soy-ink">
                {t('지도 언어', 'Map language', 'لغة الخريطة')}
              </h3>
              <p className="mb-2 text-xs text-sesame-gray/80">
                {t(
                  '지도에 표시되는 지명 언어예요. 기본은 한국어예요.',
                  'Language for place names on the map. Korean by default.',
                  'لغة أسماء الأماكن على الخريطة. الكورية افتراضياً.',
                )}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {MAP_LANGUAGE_OPTIONS.map((option) => {
                  const active = option.value === mapLanguage;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMapLanguage(option.value)}
                      aria-pressed={active}
                      className={`min-h-11 rounded-2xl border px-2 text-xs font-semibold transition-colors ${
                        active
                          ? 'border-brand-green-700 bg-brand-green-50 text-brand-green-900'
                          : 'border-border-warm bg-rice-white text-sesame-gray hover:bg-brand-green-50/50'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <button onClick={onTerms} className="w-full h-13 bg-rice-white border border-border-warm text-soy-ink text-sm font-bold rounded-2xl hover:bg-brand-green-50 transition-colors flex items-center justify-center gap-2">
              {t('약관 및 동의 설정', 'Terms and consent', 'الشروط والموافقة')}
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full h-13 bg-rice-white border border-border-warm text-soy-ink text-sm font-bold rounded-2xl hover:bg-brand-green-50 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              {t('로그아웃', 'Log out', 'تسجيل الخروج')}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full h-13 border border-red-400 bg-rice-white text-red-600 text-sm font-bold rounded-2xl hover:bg-red-50 transition-colors"
            >
              {t('회원 탈퇴', 'Delete account', 'حذف الحساب')}
            </button>
          </div>
        )}
      </div>

      {showLogoutConfirm && (
        <>
          <div className="fixed inset-0 bg-soy-ink/55 z-40" onClick={() => setShowLogoutConfirm(false)} />
          <div className="fixed inset-x-5 top-1/2 z-50 mx-auto max-w-[350px] -translate-y-1/2">
            <div className="bg-rice-white border border-border-warm rounded-[1.5rem] p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="logout-dialog-title" aria-describedby="logout-dialog-description">
              <h3 id="logout-dialog-title" className="text-lg font-bold text-soy-ink mb-2">{t('로그아웃', 'Log out', 'تسجيل الخروج')}</h3>
              <p id="logout-dialog-description" className="text-sm text-sesame-gray mb-6">
                {t('정말 로그아웃하시겠습니까?', 'Are you sure you want to log out?', 'هل أنت متأكد أنك تريد تسجيل الخروج؟')}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 h-12 bg-brand-green-50 text-brand-green-700 rounded-2xl text-sm font-bold hover:bg-brand-green-100 transition-colors"
                >
                  {t('취소', 'Cancel', 'إلغاء')}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 h-12 bg-brand-green-700 text-white rounded-2xl text-sm font-bold hover:bg-brand-green-900 transition-colors"
                >
                  {t('로그아웃', 'Log out', 'تسجيل الخروج')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 bg-soy-ink/55 z-40" onClick={() => setShowDeleteConfirm(false)} />
          <div className="fixed inset-x-5 top-1/2 z-50 mx-auto max-w-[350px] -translate-y-1/2">
            <div className="bg-rice-white border border-border-warm rounded-[1.5rem] p-6 shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description">
              <h3 id="delete-dialog-title" className="text-lg font-bold text-soy-ink mb-2">
                {t('회원 탈퇴', 'Delete account', 'حذف الحساب')}
              </h3>
              <p id="delete-dialog-description" className="text-sm text-sesame-gray mb-4">
                {t(
                  '정말 계정을 삭제하시겠습니까? 모든 데이터가 삭제됩니다.',
                  'Delete your account? All data will be removed.',
                  'هل تريد حذف حسابك؟ سيتم حذف جميع البيانات.',
                )}
              </p>
              {deleteError && <p className="text-sm text-red-500 mb-3" role="alert">{deleteError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 h-12 bg-rice-white border border-border-warm rounded-2xl text-sm font-bold text-soy-ink hover:bg-brand-green-50 transition-colors"
                >
                  {t('취소', 'Cancel', 'إلغاء')}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 h-12 bg-red-600 text-white rounded-2xl text-sm font-bold hover:bg-red-700 transition-colors"
                >
                  {t('삭제', 'Delete', 'حذف')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
