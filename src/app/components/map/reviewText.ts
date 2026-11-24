import type { ReviewAnswer, RestaurantReview } from '../../../api/reviews';
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

const SAME: Record<Language, (tag: string) => string> = {
  ko: (t) => `${t} 같음`,
  en: (t) => `Same: ${t}`,
  ar: (t) => `مثلك: ${t}`,
  'zh-CN': (t) => `同为${t}`,
  ja: (t) => `同じ${t}`,
  'zh-TW': (t) => `同為${t}`,
  es: (t) => `Igual: ${t}`,
};

/** 프로필 칩 글자(예: 새우 알레르기 · 비건). same이면 '같음'을 붙인다. */
export function profileTagText(id: string, language: Language, same = false): string {
  const item = itemOf(id);
  const label = answerLabel(id, language);
  const tag = item?.kind === 'allergy' ? (ALLERGY[language] ?? ALLERGY.en)(label) : label;
  return same ? (SAME[language] ?? SAME.en)(tag) : tag;
}

export const toAnswerValue = (answer: ReviewAnswer): ReviewAnswerValue =>
  answer === 'yes' ? 'present' : answer === 'no' ? 'absent' : 'unknown';

/** 내 프로필 조건 id 목록 */
export const profileIds = (profile: UserProfile | null) => getProfileCommunicationItems(profile).map((item) => item.id);

/** 내 조건이 하나 이상 답에 있는 후기(숨김 후기 제외) */
export function matchesProfile(review: RestaurantReview, ids: string[]) {
  return !review.hidden && review.menus.some((menu) => ids.some((id) => menu.answers[id] !== undefined));
}

/** 미리보기 카드: 후기 메뉴 하나 + 겹치는 첫 조건 */
export interface ReviewPreview {
  key: string;
  matchId: string;
  menuName: string;
  answer: ReviewAnswer;
  note: string;
}

export function reviewPreviews(reviews: RestaurantReview[], ids: string[], limit = 6): ReviewPreview[] {
  const previews: ReviewPreview[] = [];
  for (const review of reviews) {
    if (review.hidden) continue;
    review.menus.forEach((menu, index) => {
      const matchId = ids.find((id) => menu.answers[id] !== undefined);
      if (matchId) previews.push({ key: `${review.id}-${index}`, matchId, menuName: menu.name, answer: menu.answers[matchId], note: menu.note });
    });
  }
  return previews.slice(0, limit);
}

export const REVIEW_TEXT = {
  title: { ko: '나와 같은 프로필의 경험', en: 'Experiences from diners like you', ar: 'تجارب أشخاص مثلك', 'zh-CN': '与我相同条件的体验', ja: '私と同じ条件の体験', 'zh-TW': '與我相同條件的體驗', es: 'Experiencias de personas como tú' },
  subtitle: { ko: '선택한 조건이 하나 이상 같은 방문자의 선택형 후기예요.', en: 'Multiple-choice reviews from visitors who share at least one of your conditions.', ar: 'مراجعات اختيار من متعدد من زوار يشاركونك شرطًا واحدًا على الأقل.', 'zh-CN': '至少有一项条件与你相同的访客留下的选择式评价。', ja: '選んだ条件が1つ以上同じ訪問者の選択式レビューです。', 'zh-TW': '至少有一項條件與你相同的訪客留下的選擇式評價。', es: 'Reseñas de opción múltiple de visitantes que comparten al menos una de tus condiciones.' },
  seeAll: { ko: '전체 보기', en: 'See all', ar: 'عرض الكل', 'zh-CN': '查看全部', ja: 'すべて見る', 'zh-TW': '查看全部', es: 'Ver todo' },
  caution: { ko: '다른 사용자의 경험이에요. 재료는 매장에 꼭 확인하세요.', en: "These are other diners' experiences. Always confirm ingredients with the restaurant.", ar: 'هذه تجارب مستخدمين آخرين. تأكد دائمًا من المكونات لدى المطعم.', 'zh-CN': '这是其他用户的体验，请务必向店家确认食材。', ja: '他の利用者の体験です。材料は必ずお店に確認してください。', 'zh-TW': '這是其他使用者的體驗，請務必向店家確認食材。', es: 'Son experiencias de otras personas. Confirma siempre los ingredientes con el restaurante.' },
  writeReview: { ko: '후기 작성', en: 'Write a review', ar: 'اكتب مراجعة', 'zh-CN': '写评价', ja: 'レビューを書く', 'zh-TW': '寫評價', es: 'Escribir reseña' },
  noMatch: { ko: '아직 같은 프로필의 후기가 없어요.', en: 'No reviews from diners like you yet.', ar: 'لا توجد مراجعات من أشخاص مثلك بعد.', 'zh-CN': '还没有相同条件的评价。', ja: 'まだ同じ条件のレビューはありません。', 'zh-TW': '還沒有相同條件的評價。', es: 'Aún no hay reseñas de personas como tú.' },
  noProfile: { ko: '식단 프로필을 설정하면 나와 같은 조건의 경험을 볼 수 있어요.', en: 'Set up your diet profile to see experiences from diners like you.', ar: 'أعد ملفك الغذائي لترى تجارب أشخاص مثلك.', 'zh-CN': '设置饮食档案后，即可查看与你条件相同的体验。', ja: '食事プロフィールを設定すると、同じ条件の体験を見られます。', 'zh-TW': '設定飲食檔案後，即可查看與你條件相同的體驗。', es: 'Configura tu perfil alimentario para ver experiencias de personas como tú.' },
  loadFailed: { ko: '후기를 불러오지 못했어요.', en: 'Could not load reviews.', ar: 'تعذر تحميل المراجعات.', 'zh-CN': '无法加载评价。', ja: 'レビューを読み込めませんでした。', 'zh-TW': '無法載入評價。', es: 'No se pudieron cargar las reseñas.' },
  preparing: { ko: '후기 기능을 준비하고 있어요.', en: 'Reviews are coming soon.', ar: 'ميزة المراجعات قيد التحضير.', 'zh-CN': '评价功能正在准备中。', ja: 'レビュー機能は準備中です。', 'zh-TW': '評價功能準備中。', es: 'Las reseñas llegarán pronto.' },
} satisfies Record<string, AllText>;
