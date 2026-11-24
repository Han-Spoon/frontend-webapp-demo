import type { ReviewAnswer } from '../../../api/reviews';
import type { Language, UserProfile } from '../../types';
import { getProfileCommunicationItems, localizeMenuText, type ProfileCommunicationItem } from '../../results/resultViewModel';
import type { ReviewAnswerValue } from '../hs/cards';
import type { AllText } from '../hs/text';

/** 후기 답 id(allergy:shrimp · vegan:vegan · religion:halal · preference:no-spicy)를 화면 이름으로 */
function itemOf(id: string): ProfileCommunicationItem | null {
  const [kind, value = ''] = id.split(':');
  const base: UserProfile = {
    nationality: '', languageCode: 'en', isFirstTime: false, isVegan: false, hasReligion: false, hasAllergies: false,
    allergies: [], noSpicy: false, noAlcohol: false,
  };
  const profile: UserProfile | null =
    kind === 'allergy' ? { ...base, hasAllergies: true, allergies: [value] }
      : kind === 'vegan' ? { ...base, isVegan: true, veganType: value }
        : kind === 'religion' ? { ...base, hasReligion: true, religionType: value }
          : id === 'preference:no-spicy' ? { ...base, noSpicy: true }
            : id === 'preference:no-alcohol' ? { ...base, noAlcohol: true }
              : null;
  return getProfileCommunicationItems(profile)[0] ?? null;
}

/** 답 줄 이름(예: 새우) */
export function answerLabel(id: string, language: Language): string {
  const item = itemOf(id);
  return item ? localizeMenuText(item.label, language) : id;
}

const ALLERGY: Record<Language, (label: string) => string> = {
  ko: (l) => `${l} 알레르기`,
  en: (l) => `${l} allergy`,
  ar: (l) => `حساسية ${l}`,
  'zh-CN': (l) => `${l}过敏`,
  ja: (l) => `${l}アレルギー`,
  'zh-TW': (l) => `${l}過敏`,
  es: (l) => `Alergia: ${l}`,
};

/** 프로필 칩 글자(예: 새우 알레르기 · 비건) */
export function profileTagText(id: string, language: Language): string {
  const item = itemOf(id);
  const label = answerLabel(id, language);
  const tag = item?.kind === 'allergy' ? (ALLERGY[language] ?? ALLERGY.en)(label) : label;
  return tag;
}

export const toAnswerValue = (answer: ReviewAnswer): ReviewAnswerValue =>
  answer === 'yes' ? 'present' : answer === 'no' ? 'absent' : 'unknown';

/** 내 프로필 조건 id 목록 */
export const profileIds = (profile: UserProfile | null) => getProfileCommunicationItems(profile).map((item) => item.id);

export const REVIEW_TEXT = {
  title: { ko: '나와 같은 프로필의 경험', en: 'Experiences from diners like you', ar: 'تجارب أشخاص مثلك', 'zh-CN': '与我相同条件的体验', ja: '私と同じ条件の体験', 'zh-TW': '與我相同條件的體驗', es: 'Experiencias de personas como tú' },
  caution: { ko: '다른 사용자의 경험이에요. 재료는 매장에 꼭 확인하세요.', en: "These are other diners' experiences. Always confirm ingredients with the restaurant.", ar: 'هذه تجارب مستخدمين آخرين. تأكد دائمًا من المكونات لدى المطعم.', 'zh-CN': '这是其他用户的体验，请务必向店家确认食材。', ja: '他の利用者の体験です。材料は必ずお店に確認してください。', 'zh-TW': '這是其他使用者的體驗，請務必向店家確認食材。', es: 'Son experiencias de otras personas. Confirma siempre los ingredientes con el restaurante.' },
  writeReview: { ko: '후기 작성', en: 'Write a review', ar: 'اكتب مراجعة', 'zh-CN': '写评价', ja: 'レビューを書く', 'zh-TW': '寫評價', es: 'Escribir reseña' },
  loadFailed: { ko: '후기를 불러오지 못했어요.', en: 'Could not load reviews.', ar: 'تعذر تحميل المراجعات.', 'zh-CN': '无法加载评价。', ja: 'レビューを読み込めませんでした。', 'zh-TW': '無法載入評價。', es: 'No se pudieron cargar las reseñas.' },
  preparing: { ko: '후기 기능을 준비하고 있어요.', en: 'Reviews are coming soon.', ar: 'ميزة المراجعات قيد التحضير.', 'zh-CN': '评价功能正在准备中。', ja: 'レビュー機能は準備中です。', 'zh-TW': '評價功能準備中。', es: 'Las reseñas llegarán pronto.' },
} satisfies Record<string, AllText>;
