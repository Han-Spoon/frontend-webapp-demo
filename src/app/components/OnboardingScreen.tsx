import { useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Language, UserProfile } from '../types';
import { ApiError } from '../../api/user';
import { ALLERGY_OPTIONS, COUNTRY_CODES, RELIGION_OPTIONS, VEGETARIAN_OPTIONS, getCountryName } from '../constants/onboarding';
import { LANGUAGE_OPTIONS, translateText } from '../locales';
import {
  BowlTile, ChoiceChip, EmptyState, FLIP_RTL, HsButton, HsIcon, HsIconButton, HS_TEXT, SearchField, Stepper, tx, txn,
  type AllText, type CountText, type HsIconName,
} from './hs';

interface OnboardingScreenProps {
  language: Language;
  setLanguage: (language: Language) => void;
  initialProfile?: UserProfile;
  onComplete: (profile: UserProfile) => Promise<void> | void;
}

const TOTAL_STEPS = 3;
type EditSection = 'language' | 'country' | 'diet';
const SECTION_TO_STEP: Record<EditSection, number> = { language: 1, country: 2, diet: 3 };

// 나라 목록 맨 앞(캔버스 순서). COUNTRY_CODES에 있는 것만.
const POPULAR = ['US', 'JP', 'CN', 'TW', 'HK', 'VN', 'TH', 'SG', 'MY', 'ID', 'GB', 'FR'].filter((code) => COUNTRY_CODES.includes(code));

const T = {
  progress: { ko: '프로필 설정 진행률', en: 'Profile setup progress', ar: 'تقدم إعداد الملف', 'zh-CN': '资料设置进度', ja: 'プロフィール設定の進み具合', 'zh-TW': '個人檔案設定進度', es: 'Progreso de configuración' },
  editProfile: { ko: '프로필 수정', en: 'Edit profile', ar: 'تعديل الملف', 'zh-CN': '编辑资料', ja: 'プロフィール編集', 'zh-TW': '編輯個人檔案', es: 'Editar perfil' },
  step1Title: { ko: '어떤 언어를 쓰시나요?', en: 'Which language do you use?', ar: 'ما اللغة التي تستخدمها؟', 'zh-CN': '你使用哪种语言？', ja: 'どの言語を使いますか？', 'zh-TW': '你使用哪種語言？', es: '¿Qué idioma usas?' },
  step1Sub: { ko: '앱에서 쓸 언어를 골라 주세요.', en: 'Choose the language for the app.', ar: 'اختر لغة التطبيق.', 'zh-CN': '请选择应用使用的语言。', ja: 'アプリで使う言語を選んでください。', 'zh-TW': '請選擇應用程式使用的語言。', es: 'Elige el idioma de la app.' },
  step2Title: { ko: '어느 나라에서 오셨나요?', en: 'Where are you from?', ar: 'من أي بلد أنت؟', 'zh-CN': '你来自哪个国家？', ja: 'どちらの国から来ましたか？', 'zh-TW': '你來自哪個國家？', es: '¿De dónde eres?' },
  step2Sub: { ko: '사는 곳에 맞는 언어와 통화 정보를 알려 드려요.', en: 'We use it for local language and currency guidance.', ar: 'نستخدمه لإرشادات اللغة والعملة.', 'zh-CN': '我们会据此提供语言和货币信息。', ja: '住んでいる地域に合った言語と通貨の情報をお知らせします。', 'zh-TW': '我們會據此提供語言與貨幣資訊。', es: 'Lo usamos para orientarte sobre idioma y moneda.' },
  currencyNote: { ko: '환산 통화는 앱 언어를 기준으로 표시해요.', en: 'Converted prices follow the app language.', ar: 'تتبع الأسعار المحولة لغة التطبيق.', 'zh-CN': '换算货币按应用语言显示。', ja: '換算通貨はアプリの言語に合わせて表示します。', 'zh-TW': '換算貨幣依應用程式語言顯示。', es: 'Los precios convertidos siguen el idioma de la app.' },
  countrySearch: { ko: '나라 검색', en: 'Search country', ar: 'ابحث عن بلد', 'zh-CN': '搜索国家', ja: '国を検索', 'zh-TW': '搜尋國家', es: 'Buscar país' },
  noCountry: { ko: '검색 결과가 없어요', en: 'No results', ar: 'لا توجد نتائج', 'zh-CN': '没有搜索结果', ja: '検索結果がありません', 'zh-TW': '沒有搜尋結果', es: 'Sin resultados' },
  noCountryHint: { ko: '나라 이름이나 영문 두 글자 코드(예: US)로 찾아보세요.', en: 'Try a country name or a two-letter code (e.g. US).', ar: 'جرّب اسم البلد أو الرمز المكوّن من حرفين (مثل US).', 'zh-CN': '请尝试国家名称或两位字母代码（如 US）。', ja: '国名か2文字のコード（例：US）で探してみてください。', 'zh-TW': '請嘗試國家名稱或兩位字母代碼（如 US）。', es: 'Prueba con el nombre del país o el código de dos letras (p. ej., US).' },
  step3Title: { ko: '식단을 알려 주세요', en: 'Tell us about your diet', ar: 'أخبرنا عن نظامك الغذائي', 'zh-CN': '请告诉我们你的饮食需求', ja: '食事について教えてください', 'zh-TW': '請告訴我們你的飲食需求', es: 'Cuéntanos sobre tu dieta' },
  step3Sub: { ko: '해당하는 것만 고르면 돼요.', en: 'Select only what applies to you.', ar: 'اختر فقط ما ينطبق عليك.', 'zh-CN': '只需选择适用的项目。', ja: '当てはまるものだけ選んでください。', 'zh-TW': '只需選擇適用的項目。', es: 'Elige solo lo que se aplique a ti.' },
  noSpicy: { ko: '매운 음식 비선호', en: 'Avoid spicy food', ar: 'تجنب الطعام الحار', 'zh-CN': '不吃辣', ja: '辛い料理が苦手', 'zh-TW': '不吃辣', es: 'Evitar picante' },
  vegan: { ko: '채식·비건', en: 'Vegetarian · Vegan', ar: 'نباتي · نباتي صرف', 'zh-CN': '素食·纯素', ja: 'ベジタリアン・ヴィーガン', 'zh-TW': '素食·純素', es: 'Vegetariana · Vegana' },
  religion: { ko: '종교 식단', en: 'Religious diet', ar: 'نظام غذائي ديني', 'zh-CN': '宗教饮食', ja: '宗教上の食事制限', 'zh-TW': '宗教飲食', es: 'Dieta religiosa' },
  allergy: { ko: '음식 알레르기', en: 'Food allergies', ar: 'حساسية الطعام', 'zh-CN': '食物过敏', ja: '食物アレルギー', 'zh-TW': '食物過敏', es: 'Alergias alimentarias' },
  pickOne: { ko: '하나만 골라 주세요', en: 'Choose one', ar: 'اختر واحدًا', 'zh-CN': '请选择一项', ja: 'ひとつ選んでください', 'zh-TW': '請選擇一項', es: 'Elige una' },
  allergySource: { ko: '식품의약품안전처(식약처)가 알레르기 표시 대상으로 정한 19가지 재료예요. 목록에 없는 재료는 직원에게 따로 확인해 주세요.', en: 'These are the 19 allergens that Korea’s Ministry of Food and Drug Safety requires to be labeled. Check other ingredients with the staff.', ar: 'هذه 19 مادة مسببة للحساسية تُلزم وزارة سلامة الغذاء والدواء الكورية بالإشارة إليها. تحقّق من المكونات الأخرى مع الموظفين.', 'zh-CN': '这是韩国食品药品安全处规定需标示的 19 种过敏原。清单以外的食材请向店员确认。', ja: '韓国の食品医薬品安全処がアレルギー表示の対象と定めた19品目です。一覧にない食材はスタッフに確認してください。', 'zh-TW': '這是韓國食品藥物安全處規定需標示的 19 種過敏原。清單以外的食材請向店員確認。', es: 'Son los 19 alérgenos que el Ministerio de Seguridad Alimentaria de Corea obliga a etiquetar. Consulta otros ingredientes con el personal.' },
  or: { ko: '또는', en: 'or', ar: 'أو', 'zh-CN': '或', ja: 'または', 'zh-TW': '或', es: 'o' },
  none: { ko: '해당 없음', en: 'None of these', ar: 'لا شيء مما سبق', 'zh-CN': '都不适用', ja: '当てはまらない', 'zh-TW': '都不適用', es: 'Ninguna de estas' },
  next: { ko: '다음', en: 'Next', ar: 'التالي', 'zh-CN': '下一步', ja: '次へ', 'zh-TW': '下一步', es: 'Siguiente' },
  save: { ko: '저장', en: 'Save', ar: 'حفظ', 'zh-CN': '保存', ja: '保存', 'zh-TW': '儲存', es: 'Guardar' },
  saveStart: { ko: '저장하고 시작하기', en: 'Save and start', ar: 'حفظ والبدء', 'zh-CN': '保存并开始', ja: '保存して始める', 'zh-TW': '儲存並開始', es: 'Guardar y empezar' },
  saving: { ko: '저장 중...', en: 'Saving...', ar: 'جارٍ الحفظ...', 'zh-CN': '正在保存...', ja: '保存中...', 'zh-TW': '正在儲存...', es: 'Guardando...' },
  saveFailed: { ko: '저장에 실패했어요. 잠시 후 다시 시도해 주세요.', en: 'Failed to save. Please try again shortly.', ar: 'فشل الحفظ. حاول مرة أخرى بعد قليل.', 'zh-CN': '保存失败，请稍后重试。', ja: '保存に失敗しました。しばらくしてからもう一度お試しください。', 'zh-TW': '儲存失敗，請稍後重試。', es: 'No se pudo guardar. Inténtalo de nuevo en unos momentos.' },
  expired: { ko: '세션이 만료되었어요. 다시 로그인해 주세요.', en: 'Your session expired. Please sign in again.', ar: 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.', 'zh-CN': '会话已过期，请重新登录。', ja: 'セッションの有効期限が切れました。もう一度ログインしてください。', 'zh-TW': '工作階段已過期，請重新登入。', es: 'Tu sesión caducó. Vuelve a iniciar sesión.' },
  noApi: { ko: '백엔드에 프로필 API가 없어요. 백엔드 버전을 확인해 주세요.', en: 'Profile API not found on the server. Check the backend version.', ar: 'واجهة الملف غير موجودة على الخادم. تحقق من إصدار الخادم.', 'zh-CN': '服务器上没有资料 API，请检查后端版本。', ja: 'サーバーにプロフィール API がありません。バックエンドのバージョンを確認してください。', 'zh-TW': '伺服器上沒有個人檔案 API，請檢查後端版本。', es: 'No se encontró la API de perfil. Revisa la versión del backend.' },
} satisfies Record<string, AllText>;

const ALLERGY_COUNT: CountText = { ko: (n) => `피해야 하는 재료를 모두 골라 주세요 · ${n}개 선택`, en: (n) => `Choose everything you avoid · ${n} selected`, ar: (n) => `اختر كل ما تتجنبه · ${n} محدد`, 'zh-CN': (n) => `请选择所有需要避开的食材 · 已选 ${n} 个`, ja: (n) => `避けたい食材をすべて選んでください · ${n}件選択`, 'zh-TW': (n) => `請選擇所有需要避開的食材 · 已選 ${n} 個`, es: (n) => `Elige todo lo que evitas · ${n} seleccionados` };
const ALLERGY_SHORT: CountText = { ko: (n) => `알레르기 ${n}개`, en: (n) => `${n} allerg${n === 1 ? 'y' : 'ies'}`, ar: (n) => `${n} حساسية`, 'zh-CN': (n) => `过敏 ${n} 项`, ja: (n) => `アレルギー${n}件`, 'zh-TW': (n) => `過敏 ${n} 項`, es: (n) => `${n} alergia${n === 1 ? '' : 's'}` };
const SELECTED: Record<Language, (items: string) => string> = { ko: (s) => `${s} 선택됨`, en: (s) => `${s} selected`, ar: (s) => `تم اختيار ${s}`, 'zh-CN': (s) => `已选：${s}`, ja: (s) => `${s}を選択`, 'zh-TW': (s) => `已選：${s}`, es: (s) => `Seleccionado: ${s}` };

/** 식단 항목 카드: 아이콘 타일 + 제목 + 원형 체크, 켜지면 2px brand 테두리 + 아래 세부 선택 */
function DietCard({ icon, tileClass, title, on, onToggle, children }: { icon: HsIconName; tileClass: string; title: string; on: boolean; onToggle: () => void; children?: ReactNode }) {
  return (
    <div className={`overflow-hidden rounded-3xl bg-hs-surface-0 ${on ? 'border-2 border-hs-brand-700' : 'border-[1.5px] border-hs-line-200'}`}>
      <button type="button" role="checkbox" aria-checked={on} onClick={onToggle} className="flex w-full items-center gap-3 py-3 ps-3 pe-3.5 text-start">
        <BowlTile className={`h-10 w-11 rounded-t-[14px] rounded-b-[22px] ${tileClass}`}><HsIcon name={icon} size={22} strokeWidth={2.1} /></BowlTile>
        <span className="min-w-0 flex-1 text-[16px] font-black">{title}</span>
        <span aria-hidden="true" className={`flex size-[26px] flex-none items-center justify-center rounded-hs-pill ${on ? 'bg-hs-brand-700 text-hs-surface-0' : 'border-2 border-hs-line-dash bg-hs-surface-0'}`}>{on && <HsIcon name="check" size={16} strokeWidth={3.2} />}</span>
      </button>
      {on && children && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

/** 흐름 1 ④ 온보딩 1 언어 · 2 국가 · 3 식단. 마이페이지 '프로필 수정'에서 해당 단계만 재사용. */
export function OnboardingScreen({ language, setLanguage, initialProfile, onComplete }: OnboardingScreenProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const editSection = (location.state as { editSection?: EditSection } | null)?.editSection;
  const editMode = !!editSection;
  const [step, setStep] = useState(editMode ? SECTION_TO_STEP[editSection!] : 1);

  const [nationality, setNationality] = useState(initialProfile?.nationality ?? '');
  const [countrySearch, setCountrySearch] = useState('');
  const [noSpicy, setNoSpicy] = useState(initialProfile?.noSpicy ?? false);
  const [isVegan, setIsVegan] = useState(initialProfile?.isVegan ?? false);
  const [veganType, setVeganType] = useState(initialProfile?.veganType ?? '');
  const [hasReligion, setHasReligion] = useState(initialProfile?.hasReligion ?? false);
  const [religionType, setReligionType] = useState(initialProfile?.religionType ?? '');
  const [hasAllergies, setHasAllergies] = useState(initialProfile?.hasAllergies ?? false);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(initialProfile?.allergies ?? []);
  const [noneSelected, setNoneSelected] = useState(Boolean(initialProfile && !initialProfile.noSpicy && !initialProfile.isVegan && !initialProfile.hasReligion && !initialProfile.hasAllergies));
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const countries = useMemo(() => {
    const named = COUNTRY_CODES.map((code) => ({ code, name: getCountryName(code, language) }));
    const query = countrySearch.trim().toLowerCase();
    if (query) {
      return named
        .filter((country) => country.name.toLowerCase().includes(query) || country.code.toLowerCase() === query || (country.code === 'KR' && '한국 코리아 korea'.includes(query)))
        .sort((a, b) => a.name.localeCompare(b.name, language));
    }
    const popular = POPULAR.map((code) => named.find((country) => country.code === code)!).filter(Boolean);
    const rest = named.filter((country) => !POPULAR.includes(country.code)).sort((a, b) => a.name.localeCompare(b.name, language));
    return [...popular, ...rest];
  }, [language, countrySearch]);

  const pickOn = (setter: (value: boolean) => void, value: boolean) => { setter(value); if (value) setNoneSelected(false); };
  const toggleAllergy = (code: string) => setSelectedAllergies((prev) => (prev.includes(code) ? prev.filter((a) => a !== code) : [...prev, code]));
  const selectNone = () => {
    const next = !noneSelected;
    setNoneSelected(next);
    if (next) {
      setNoSpicy(false); setIsVegan(false); setVeganType('');
      setHasReligion(false); setReligionType(''); setHasAllergies(false); setSelectedAllergies([]);
    }
  };

  const step3Valid =
    (noneSelected || noSpicy || isVegan || hasReligion || hasAllergies) &&
    (!isVegan || !!veganType) &&
    (!hasReligion || !!religionType) &&
    (!hasAllergies || selectedAllergies.length > 0);

  const summary = [
    noSpicy && tx(language, T.noSpicy),
    isVegan && veganType && translateText(language, VEGETARIAN_OPTIONS.find((o) => o.value === veganType)!.label),
    hasReligion && religionType && translateText(language, RELIGION_OPTIONS.find((o) => o.value === religionType)!.label),
    hasAllergies && selectedAllergies.length > 0 && txn(language, ALLERGY_SHORT, selectedAllergies.length),
    noneSelected && tx(language, T.none),
  ].filter(Boolean).join(' · ');

  const handleSave = async () => {
    if ((step === 3 && !step3Valid) || saving) return;
    // 온보딩에 '한국 음식 처음' · '금주' 버튼이 없음 → 프로필 API(No 11 · 13) 필수 값이라 항상 false로 보냄(11/24 결정 1).
    const profile: UserProfile = {
      nationality,
      languageCode: language,
      isFirstTime: false,
      isVegan,
      veganType: isVegan ? veganType : null,
      hasReligion,
      religionType: hasReligion ? religionType : null,
      hasAllergies,
      allergies: hasAllergies ? selectedAllergies : [],
      noSpicy,
      noAlcohol: false,
    };
    try {
      setSaving(true);
      setErrorMessage('');
      await onComplete(profile);
    } catch (error) {
      console.error('Profile save failed:', error);
      let message = tx(language, T.saveFailed);
      if (error instanceof ApiError) {
        if (error.status === 401) message = tx(language, T.expired);
        else if (error.status === 404) message = tx(language, T.noApi);
        else message = `${message} (${error.status})`;
      }
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (editMode || step === 1) navigate(-1);
    else setStep((s) => s - 1);
  };

  const heading = step === 1 ? [T.step1Title, T.step1Sub] : step === 2 ? [T.step2Title, T.step2Sub] : [T.step3Title, T.step3Sub];
  const isLast = editMode || step === TOTAL_STEPS;

  return (
    <div className="flex h-dvh flex-col bg-hs-surface-0 text-hs-ink-900">
      <div className="flex flex-none items-center gap-3 px-5 pt-[max(18px,env(safe-area-inset-top))]">
        <HsIconButton icon="back" tone="soft" label={tx(language, HS_TEXT.back)} iconClassName={FLIP_RTL} onClick={goBack} />
        {editMode ? <span className="hs-title-sm">{tx(language, T.editProfile)}</span> : <Stepper step={step} total={TOTAL_STEPS} label={tx(language, T.progress)} />}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-6">
        <div className="px-6 pt-6">
          <h1 className="text-[26px] leading-[1.3] font-black tracking-[-0.02em]">{tx(language, heading[0])}</h1>
          <p className="mt-2 text-[14px] leading-[1.5] font-semibold text-hs-ink-500">{tx(language, heading[1])}</p>
          {step === 2 && (
            <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-hs-sm bg-hs-surface-100 px-2.5 py-1.5 text-[12px] font-bold text-hs-ink-700">
              <HsIcon name="alert" size={14} strokeWidth={2.4} className="flex-none" />
              {tx(language, T.currencyNote)}
            </p>
          )}
        </div>

        {step === 1 && (
          <div role="radiogroup" aria-label={tx(language, T.step1Title)} className="flex flex-col gap-2 px-5 pt-[22px]">
            {LANGUAGE_OPTIONS.map((option) => {
              const on = language === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setLanguage(option.value)}
                  className={`flex h-[58px] items-center gap-2.5 rounded-hs-xl ps-[18px] pe-4 text-start ${on ? 'border-2 border-hs-brand-700 bg-hs-mint-100' : 'border-[1.5px] border-hs-line-200 bg-hs-surface-0'}`}
                >
                  <span lang={option.value} className="min-w-0 flex-1 text-[17px] font-black">{option.label}</span>
                  <span className="text-[13px] font-bold text-hs-ink-500">{translateText(language, option.sub)}</span>
                  {on && <span aria-hidden="true" className="flex size-6 flex-none items-center justify-center rounded-hs-pill bg-hs-brand-700 text-hs-surface-0"><HsIcon name="check" size={14} strokeWidth={3.2} /></span>}
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <>
            <div className="px-5 pt-4">
              <SearchField language={language} label={tx(language, T.countrySearch)} placeholder={tx(language, T.countrySearch)} value={countrySearch} onChange={setCountrySearch} />
            </div>
            {countries.length === 0 ? (
              <div className="px-5 pt-4"><EmptyState icon="search" title={tx(language, T.noCountry)} description={tx(language, T.noCountryHint)} /></div>
            ) : (
              <div role="radiogroup" aria-label={tx(language, T.step2Title)} className="grid grid-cols-3 gap-2.5 px-5 pt-4">
                {countries.map((country) => {
                  const on = nationality === country.code;
                  return (
                    <button
                      key={country.code}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setNationality(country.code)}
                      className={`relative flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-t-[22px] rounded-b-[34px] px-1.5 py-2 ${on ? 'border-2 border-hs-brand-700 bg-hs-mint-100' : 'border-[1.5px] border-hs-line-200 bg-hs-surface-0'}`}
                    >
                      <span dir="ltr" className={`flex size-[38px] items-center justify-center rounded-hs-pill text-[12px] font-black ${on ? 'bg-hs-surface-0' : 'bg-hs-surface-100'}`}>{country.code}</span>
                      <span className="line-clamp-2 text-center text-[13px] leading-[1.25] font-extrabold">{country.name}</span>
                      {on && <span aria-hidden="true" className="absolute end-2 top-2 flex size-5 items-center justify-center rounded-hs-pill bg-hs-brand-700 text-hs-surface-0"><HsIcon name="check" size={13} strokeWidth={3} /></span>}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-2.5 px-5 pt-5">
            <DietCard icon="chili" tileClass="bg-hs-coral-100 text-hs-coral-700" title={tx(language, T.noSpicy)} on={noSpicy} onToggle={() => pickOn(setNoSpicy, !noSpicy)} />
            <DietCard icon="leaf" tileClass="bg-hs-mint-100 text-hs-brand-700" title={tx(language, T.vegan)} on={isVegan} onToggle={() => pickOn(setIsVegan, !isVegan)}>
              <p className="mb-2 text-[12px] font-extrabold text-hs-ink-500">{tx(language, T.pickOne)}</p>
              <div role="radiogroup" aria-label={tx(language, T.vegan)} className="flex flex-wrap gap-1.5">
                {VEGETARIAN_OPTIONS.map((option) => <ChoiceChip key={option.value} role="radio" aria-checked={veganType === option.value} selected={veganType === option.value} onClick={() => setVeganType(option.value)}>{translateText(language, option.label)}</ChoiceChip>)}
              </div>
            </DietCard>
            <DietCard icon="shield" tileClass="bg-hs-surface-100 text-hs-ink-700" title={tx(language, T.religion)} on={hasReligion} onToggle={() => pickOn(setHasReligion, !hasReligion)}>
              <p className="mb-2 text-[12px] font-extrabold text-hs-ink-500">{tx(language, T.pickOne)}</p>
              <div role="radiogroup" aria-label={tx(language, T.religion)} className="flex flex-wrap gap-1.5">
                {RELIGION_OPTIONS.map((option) => <ChoiceChip key={option.value} role="radio" aria-checked={religionType === option.value} selected={religionType === option.value} onClick={() => setReligionType(option.value)}>{translateText(language, option.label)}</ChoiceChip>)}
              </div>
            </DietCard>
            <DietCard icon="alert" tileClass="bg-hs-coral-100 text-hs-coral-700" title={tx(language, T.allergy)} on={hasAllergies} onToggle={() => pickOn(setHasAllergies, !hasAllergies)}>
              <div className="mb-3 flex items-start gap-2 rounded-2xl bg-hs-surface-100 px-3 py-2.5">
                <HsIcon name="alert" size={16} className="mt-px flex-none text-hs-brand-700" />
                <p className="text-[12px] leading-[1.5] font-semibold text-hs-ink-700">{tx(language, T.allergySource)}</p>
              </div>
              <p className="mb-2 text-[12px] font-extrabold text-hs-ink-500">{txn(language, ALLERGY_COUNT, selectedAllergies.length)}</p>
              <div className="flex flex-wrap gap-1.5">
                {ALLERGY_OPTIONS.map((option) => <ChoiceChip key={option.value} selected={selectedAllergies.includes(option.value)} onClick={() => toggleAllergy(option.value)}>{translateText(language, option.label)}</ChoiceChip>)}
              </div>
            </DietCard>
            <div className="my-1 flex items-center gap-2.5" aria-hidden="true">
              <span className="h-[1.5px] flex-1 bg-hs-line-200" />
              <span className="text-[12px] font-extrabold text-hs-ink-500">{tx(language, T.or)}</span>
              <span className="h-[1.5px] flex-1 bg-hs-line-200" />
            </div>
            <button
              type="button"
              aria-pressed={noneSelected}
              onClick={selectNone}
              className={`flex h-14 items-center justify-center gap-1.5 rounded-hs-pill text-[15px] font-extrabold ${noneSelected ? 'border-2 border-hs-brand-700 bg-hs-mint-100 text-hs-ink-900' : 'border-[1.5px] border-dashed border-hs-line-dash bg-hs-surface-0 text-hs-ink-700'}`}
            >
              {noneSelected && <HsIcon name="check" size={16} strokeWidth={3} className="text-hs-brand-700" />}
              {tx(language, T.none)}
            </button>
          </div>
        )}
      </div>

      <div className="flex-none bg-hs-surface-0 px-5 pt-3 pb-[max(28px,env(safe-area-inset-bottom))]">
        {errorMessage && <p role="alert" className="mb-2.5 text-center text-[13px] font-bold text-hs-danger-700">{errorMessage}</p>}
        {step === 3 && summary && !errorMessage && <p className="mb-2.5 text-center text-[13px] font-bold text-hs-ink-500">{SELECTED[language](summary)}</p>}
        {!isLast ? (
          <HsButton size="cta" disabled={step === 2 && !nationality} onClick={() => setStep((s) => s + 1)}>{tx(language, T.next)}</HsButton>
        ) : (
          <HsButton size="cta" disabled={step === 3 ? !step3Valid : step === 2 ? !nationality : false} busy={saving} onClick={handleSave}>
            {saving ? tx(language, T.saving) : tx(language, editMode ? T.save : T.saveStart)}
          </HsButton>
        )}
      </div>
    </div>
  );
}
