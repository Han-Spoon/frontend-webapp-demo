export const LANGUAGE_CODES = ['ko', 'en', 'ar', 'zh-CN', 'ja', 'zh-TW', 'es'] as const;

export type Language = (typeof LANGUAGE_CODES)[number];
export type BaseLanguage = 'ko' | 'en' | 'ar';
export type BackendLanguage = Language;
export type NewLanguage = Exclude<Language, BaseLanguage>;

export type LocalizedText = Record<BaseLanguage, string> & Partial<Record<NewLanguage, string>>;

export const LANGUAGE_OPTIONS: Array<{ value: Language; label: string; sub: LocalizedText }> = [
  { value: 'ko', label: '한국어', sub: { ko: '한국어', en: 'Korean', ar: 'الكورية', 'zh-CN': '韩语', ja: '韓国語', 'zh-TW': '韓文', es: 'Coreano' } },
  { value: 'en', label: 'English', sub: { ko: '영어', en: 'English', ar: 'الإنجليزية', 'zh-CN': '英语', ja: '英語', 'zh-TW': '英文', es: 'Inglés' } },
  { value: 'ar', label: 'العربية', sub: { ko: '아랍어', en: 'Arabic', ar: 'العربية', 'zh-CN': '阿拉伯语', ja: 'アラビア語', 'zh-TW': '阿拉伯文', es: 'Árabe' } },
  { value: 'zh-CN', label: '简体中文', sub: { ko: '중국어 간체', en: 'Chinese (Simplified)', ar: 'الصينية المبسطة', 'zh-CN': '简体中文', ja: '中国語(簡体字)', 'zh-TW': '簡體中文', es: 'Chino simplificado' } },
  { value: 'ja', label: '日本語', sub: { ko: '일본어', en: 'Japanese', ar: 'اليابانية', 'zh-CN': '日语', ja: '日本語', 'zh-TW': '日文', es: 'Japonés' } },
  { value: 'zh-TW', label: '繁體中文', sub: { ko: '중국어 번체', en: 'Chinese (Traditional)', ar: 'الصينية التقليدية', 'zh-CN': '繁体中文', ja: '中国語(繁体字)', 'zh-TW': '繁體中文', es: 'Chino tradicional' } },
  { value: 'es', label: 'Español', sub: { ko: '스페인어', en: 'Spanish', ar: 'الإسبانية', 'zh-CN': '西班牙语', ja: 'スペイン語', 'zh-TW': '西班牙文', es: 'Español' } },
];

export const LANGUAGE_LOCALES: Record<Language, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  ar: 'ar',
  'zh-CN': 'zh-CN',
  ja: 'ja-JP',
  'zh-TW': 'zh-TW',
  es: 'es-ES',
};

type Dictionary = Record<string, string>;

// zh-CN·ja·zh-TW·es 임시 번역(한국어 원문이 키). 언어를 고를 때만 받음(ko·en·ar 사용자는 받지 않음).
const DICTIONARY_LOADERS: Record<NewLanguage, () => Promise<{ default: Dictionary }>> = {
  'zh-CN': () => import('./i18n/zh-CN'),
  ja: () => import('./i18n/ja'),
  'zh-TW': () => import('./i18n/zh-TW'),
  es: () => import('./i18n/es'),
};
const dictionaries: Partial<Record<NewLanguage, Dictionary>> = {};

const isNewLanguage = (language: Language): language is NewLanguage => language in DICTIONARY_LOADERS;

/** 사전이 필요 없거나 이미 받은 언어 */
export const isLanguageReady = (language: Language): boolean => !isNewLanguage(language) || Boolean(dictionaries[language]);

/** 언어 사전 받기. 실패하면 거부(호출부는 영어 fallback으로 계속). */
export async function loadLanguage(language: Language): Promise<void> {
  if (!isNewLanguage(language) || dictionaries[language]) return;
  dictionaries[language] = (await DICTIONARY_LOADERS[language]()).default;
}

const interpolateDynamicText = (language: Language, ko: string): string | undefined => {
  if (language === 'ko' || language === 'en' || language === 'ar') return undefined;

  const step = ko.match(/^STEP (\d+)$/)?.[1];
  if (step) {
    return ({ 'zh-CN': `第 ${step} 步`, ja: `ステップ ${step}`, 'zh-TW': `第 ${step} 步`, es: `PASO ${step}` } as Record<NewLanguage, string>)[language];
  }

  const count = ko.match(/^총 (\d+)개 메뉴 인식$/)?.[1];
  if (count) {
    return ({ 'zh-CN': `识别出 ${count} 个菜品`, ja: `${count}件のメニューを認識`, 'zh-TW': `辨識出 ${count} 道餐點`, es: `${count} platos detectados` } as Record<NewLanguage, string>)[language];
  }

  const analyzedCount = ko.match(/^메뉴 (\d+)개 분석$/)?.[1];
  if (analyzedCount) {
    return ({ 'zh-CN': `已分析 ${analyzedCount} 个菜品`, ja: `${analyzedCount}件のメニューを分析`, 'zh-TW': `已分析 ${analyzedCount} 道餐點`, es: `${analyzedCount} platos analizados` } as Record<NewLanguage, string>)[language];
  }

  const checkedCount = ko.match(/^메뉴 (\d+)개를 확인했어요$/)?.[1];
  if (checkedCount) {
    return ({ 'zh-CN': `已检查 ${checkedCount} 个菜品`, ja: `${checkedCount}件のメニューを確認しました`, 'zh-TW': `已檢查 ${checkedCount} 道餐點`, es: `Se comprobaron ${checkedCount} platos` } as Record<NewLanguage, string>)[language];
  }

  const slide = ko.match(/^슬라이드 (\d+)$/)?.[1];
  if (slide) {
    return ({ 'zh-CN': `第 ${slide} 张`, ja: `スライド ${slide}`, 'zh-TW': `第 ${slide} 張`, es: `Diapositiva ${slide}` } as Record<NewLanguage, string>)[language];
  }

  const size = ko.match(/^이미지는 (\d+)MB 이하만 업로드할 수 있어요\.$/)?.[1];
  if (size) {
    return ({ 'zh-CN': `图片大小必须为 ${size}MB 以下。`, ja: `画像は${size}MB以下にしてください。`, 'zh-TW': `圖片大小必須為 ${size}MB 以下。`, es: `La imagen debe ocupar ${size} MB o menos.` } as Record<NewLanguage, string>)[language];
  }

  const uploadGuideSize = ko.match(/^JPG, PNG, WEBP 사진만 가능 · 최대 (\d+)MB · GIF\/영상\/문서는 불가$/)?.[1];
  if (uploadGuideSize) {
    return ({
      'zh-CN': `仅支持 JPG、PNG、WEBP · 最大 ${uploadGuideSize}MB · 不支持 GIF、视频或文档`,
      ja: `JPG・PNG・WEBPのみ · 最大${uploadGuideSize}MB · GIF・動画・文書は不可`,
      'zh-TW': `僅支援 JPG、PNG、WEBP · 最大 ${uploadGuideSize}MB · 不支援 GIF、影片或文件`,
      es: `Solo JPG, PNG y WEBP · Máx. ${uploadGuideSize} MB · Sin GIF, vídeos ni documentos`,
    } as Record<NewLanguage, string>)[language];
  }

  const resultMenuCount = ko.match(/^메뉴 (\d+)개를 내 식단 기준으로 살펴봤어요\.$/)?.[1];
  if (resultMenuCount) {
    return ({ 'zh-CN': `已按照你的饮食需求查看 ${resultMenuCount} 个菜品。`, ja: `${resultMenuCount}件のメニューを食事条件に照らして確認しました。`, 'zh-TW': `已依照你的飲食需求查看 ${resultMenuCount} 道餐點。`, es: `Revisamos ${resultMenuCount} platos según tu perfil alimentario.` } as Record<NewLanguage, string>)[language];
  }

  const scanTimeMenuCount = ko.match(/^메뉴 (\d+)개를 스캔 당시 식단 기준으로 살펴봤어요\.$/)?.[1];
  if (scanTimeMenuCount) {
    return ({ 'zh-CN': `已按照扫描时的饮食需求查看 ${scanTimeMenuCount} 个菜品。`, ja: `${scanTimeMenuCount}件のメニューをスキャン時の食事条件に照らして確認しました。`, 'zh-TW': `已依照掃描時的飲食需求查看 ${scanTimeMenuCount} 道餐點。`, es: `Revisamos ${scanTimeMenuCount} platos según tu perfil alimentario al escanear.` } as Record<NewLanguage, string>)[language];
  }

  const staffEvidence = ko.match(/^확인 (\d+)건 중 사용 (\d+)건$/);
  if (staffEvidence) {
    return ({ 'zh-CN': `${staffEvidence[1]} 条确认记录中采用 ${staffEvidence[2]} 条`, ja: `${staffEvidence[1]}件の確認中${staffEvidence[2]}件を使用`, 'zh-TW': `${staffEvidence[1]} 筆確認紀錄中採用 ${staffEvidence[2]} 筆`, es: `${staffEvidence[2]} de ${staffEvidence[1]} verificaciones utilizadas` } as Record<NewLanguage, string>)[language];
  }

  const feedback = ko.match(/^(\d+)명 중 (\d+)명이 요청을 전달하기 편했어요$/);
  if (feedback) {
    return ({ 'zh-CN': `${feedback[1]} 人中有 ${feedback[2]} 人表示需求容易沟通`, ja: `${feedback[1]}人中${feedback[2]}人が希望を伝えやすかったと回答`, 'zh-TW': `${feedback[1]} 人中有 ${feedback[2]} 人表示需求很好溝通`, es: `${feedback[2]} de ${feedback[1]} personas pudieron comunicar su solicitud fácilmente` } as Record<NewLanguage, string>)[language];
  }

  const menuObservation = ko.match(/^메뉴판: (.+) · ([\d,]+)원$/);
  if (menuObservation) {
    const localizedMenu = dictionaries[language]?.[menuObservation[1]] ?? menuObservation[1];
    return ({
      'zh-CN': `菜单：${localizedMenu} · ₩${menuObservation[2]}`,
      ja: `メニュー：${localizedMenu} · ₩${menuObservation[2]}`,
      'zh-TW': `菜單：${localizedMenu} · ₩${menuObservation[2]}`,
      es: `Menú: ${localizedMenu} · ₩${menuObservation[2]}`,
    } as Record<NewLanguage, string>)[language];
  }

  return undefined;
};

export function translateText(language: Language, text: LocalizedText): string {
  const direct = text[language];
  if (direct) return direct;

  const dynamic = interpolateDynamicText(language, text.ko);
  if (dynamic) return dynamic;

  if (language !== 'ko' && language !== 'en' && language !== 'ar') {
    return dictionaries[language]?.[text.ko] ?? text.en;
  }

  return text[language];
}

export const createTranslator = (language: Language) =>
  (ko: string, en: string, ar: string): string => translateText(language, { ko, en, ar });

export const isLanguage = (value: string | null | undefined): value is Language =>
  Boolean(value && LANGUAGE_CODES.includes(value as Language));

export const isBackendLanguage = (value: string | null | undefined): value is BackendLanguage =>
  isLanguage(value);

export const toBackendLanguage = (language: Language): BackendLanguage => language;
