import type { Language } from '../../locales';

/** 7개 언어를 모두 적은 문구. 새 화면 문구는 이 모양으로 쓴다(번역 누락 없음). */
export type AllText = Record<Language, string>;

export const tx = (language: Language, text: AllText): string => text[language] ?? text.en;

/** 숫자가 들어가는 문구: 언어별 함수 */
export type CountText = Record<Language, (n: number) => string>;
export const txn = (language: Language, text: CountText, n: number): string => (text[language] ?? text.en)(n);

/** 화면 문구 공통 */
export const HS_TEXT = {
  close: { ko: '닫기', en: 'Close', ar: 'إغلاق', 'zh-CN': '关闭', ja: '閉じる', 'zh-TW': '關閉', es: 'Cerrar' },
  back: { ko: '뒤로', en: 'Back', ar: 'رجوع', 'zh-CN': '返回', ja: '戻る', 'zh-TW': '返回', es: 'Atrás' },
  cancel: { ko: '취소', en: 'Cancel', ar: 'إلغاء', 'zh-CN': '取消', ja: 'キャンセル', 'zh-TW': '取消', es: 'Cancelar' },
  retry: { ko: '다시 시도', en: 'Try again', ar: 'حاول مرة أخرى', 'zh-CN': '重试', ja: '再試行', 'zh-TW': '重試', es: 'Reintentar' },
  prevCard: { ko: '이전 카드', en: 'Previous card', ar: 'البطاقة السابقة', 'zh-CN': '上一张', ja: '前のカード', 'zh-TW': '上一張', es: 'Tarjeta anterior' },
  nextCard: { ko: '다음 카드', en: 'Next card', ar: 'البطاقة التالية', 'zh-CN': '下一张', ja: '次のカード', 'zh-TW': '下一張', es: 'Tarjeta siguiente' },
  offline: {
    ko: '오프라인이에요. 연결을 확인해 주세요.',
    en: 'You are offline. Check your connection.',
    ar: 'أنت غير متصل. تحقق من اتصالك.',
    'zh-CN': '当前处于离线状态，请检查网络连接。',
    ja: 'オフラインです。接続を確認してください。',
    'zh-TW': '目前為離線狀態，請檢查網路連線。',
    es: 'Sin conexión. Revisa tu conexión.',
  },
  loading: { ko: '불러오는 중…', en: 'Loading…', ar: 'جار التحميل…', 'zh-CN': '加载中…', ja: '読み込み中…', 'zh-TW': '載入中…', es: 'Cargando…' },
  showStaff: { ko: '직원에게 보여주세요', en: 'Show this to the staff', ar: 'اعرض هذا على الموظف', 'zh-CN': '请出示给店员', ja: 'スタッフに見せてください', 'zh-TW': '請出示給店員', es: 'Muéstraselo al personal' },
  listenKorean: { ko: '한국어 음성 듣기', en: 'Listen in Korean', ar: 'استمع بالكورية', 'zh-CN': '收听韩语语音', ja: '韓国語の音声を聞く', 'zh-TW': '收聽韓語語音', es: 'Escuchar en coreano' },
} satisfies Record<string, AllText>;
