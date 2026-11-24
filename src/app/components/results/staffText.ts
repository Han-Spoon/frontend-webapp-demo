import type { AllText } from '../hs/text';

/**
 * 직원에게 보여 주는 문장(7개 언어). 한국어가 직원이 읽는 원문이고, 다른 언어는 사용자가 뜻을 확인하는 번역이다.
 * 재료 · 식단 이름(term)은 언어별 값을 받아 문장에 끼운다.
 */

const LANGS = ['ko', 'en', 'ar', 'zh-CN', 'ja', 'zh-TW', 'es'] as const;

/** 받침 있으면 첫째, 없으면 둘째 조사 */
const particle = (word: string, withFinal: string, withoutFinal: string) => {
  const last = word.trim().at(-1);
  if (!last) return withoutFinal;
  const code = last.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0 ? withFinal : withoutFinal;
};
const subject = (word: string) => `${word}${particle(word, '이', '가')}`;
const object = (word: string) => `${word}${particle(word, '을', '를')}`;

/** 영어 · 스페인어 문장 가운데에 들어가는 보통 명사는 소문자로 */
const lower = (term: AllText): AllText => ({ ...term, en: term.en.toLocaleLowerCase('en'), es: term.es.toLocaleLowerCase('es') });

/** 빠진 언어는 영어, 그다음 한국어로 채운 term */
export function fillTerm(text: Partial<Record<(typeof LANGS)[number], string | undefined>> & { ko: string }): AllText {
  const en = text.en || text.ko;
  return Object.fromEntries(LANGS.map((lang) => [lang, text[lang] || (lang === 'ko' ? text.ko : en)])) as AllText;
}

/** 큰 글씨 한 문장 + (있으면) 작은 둘째 문장 */
export interface StaffSentence {
  main: AllText;
  sub?: AllText;
}

export const staffSentence = {
  /** 이 메뉴에 ○○가 들어가나요? */
  ingredientCheck: (raw: AllText): AllText => {
    const t = lower(raw);
    return {
      ko: `이 메뉴에 ${subject(t.ko)} 들어가나요?`,
      en: `Does this dish contain ${t.en}?`,
      ar: `هل يحتوي هذا الطبق على ${t.ar}؟`,
      'zh-CN': `这道菜里有${t['zh-CN']}吗？`,
      ja: `このメニューに${t.ja}は入っていますか？`,
      'zh-TW': `這道菜裡有${t['zh-TW']}嗎？`,
      es: `¿Este plato lleva ${t.es}?`,
    };
  },
  /** ○○를 빼고 만들어 주실 수 있나요? */
  exclude: (raw: AllText): AllText => {
    const t = lower(raw);
    return {
      ko: `${object(t.ko)} 빼고 만들어 주실 수 있나요?`,
      en: `Could you make it without ${t.en}?`,
      ar: `هل يمكن تحضيره بدون ${t.ar}؟`,
      'zh-CN': `可以不放${t['zh-CN']}吗？`,
      ja: `${t.ja}を抜いて作っていただけますか？`,
      'zh-TW': `可以不放${t['zh-TW']}嗎？`,
      es: `¿Podrían prepararlo sin ${t.es}?`,
    };
  },
  lessSpicy: {
    ko: '덜 맵게 만들어 주실 수 있나요?',
    en: 'Could you make it less spicy?',
    ar: 'هل يمكن تحضيره أقل حدة؟',
    'zh-CN': '可以做得不那么辣吗？',
    ja: '辛さを控えめにしていただけますか？',
    'zh-TW': '可以做得不那麼辣嗎？',
    es: '¿Podrían prepararlo menos picante?',
  } satisfies AllText,
  /** ○○ 하나 주세요 */
  order: (menu: AllText): AllText => ({
    ko: `${menu.ko} 하나 주세요.`,
    en: `One ${menu.en}, please.`,
    ar: `واحد ${menu.ar} من فضلك.`,
    'zh-CN': `请给我一份${menu['zh-CN']}。`,
    ja: `${menu.ja}を一つください。`,
    'zh-TW': `請給我一份${menu['zh-TW']}。`,
    es: `Un ${menu.es}, por favor.`,
  }),
  /** 이 메뉴가 제 식단(○○)에 맞나요? */
  dietCheck: (label: AllText): AllText => ({
    ko: `이 메뉴가 제 식단(${label.ko})에 맞나요?`,
    en: `Does this dish fit my diet (${label.en})?`,
    ar: `هل يناسب هذا الطبق نظامي الغذائي (${label.ar})؟`,
    'zh-CN': `这道菜符合我的饮食（${label['zh-CN']}）吗？`,
    ja: `このメニューは私の食事（${label.ja}）に合いますか？`,
    'zh-TW': `這道菜符合我的飲食（${label['zh-TW']}）嗎？`,
    es: `¿Este plato es apto para mi dieta (${label.es})?`,
  }),
  spicyCheck: {
    ko: '이 음식은 매운가요?',
    en: 'Is this dish spicy?',
    ar: 'هل هذا الطبق حار؟',
    'zh-CN': '这道菜辣吗？',
    ja: 'この料理は辛いですか？',
    'zh-TW': '這道菜辣嗎？',
    es: '¿Este plato es picante?',
  } satisfies AllText,
  /** 식단 기준 전달(메뉴 없이): 저는 ○○ 알레르기가 있어요. */
  allergyShare: (raw: AllText): StaffSentence => {
    const t = lower(raw);
    return {
      main: {
        ko: `저는 ${t.ko} 알레르기가 있어요.`,
        en: `I'm allergic to ${t.en}.`,
        ar: `لدي حساسية من ${t.ar}.`,
        'zh-CN': `我对${t['zh-CN']}过敏。`,
        ja: `${t.ja}のアレルギーがあります。`,
        'zh-TW': `我對${t['zh-TW']}過敏。`,
        es: `Tengo alergia a ${t.es}.`,
      },
      sub: {
        ko: `${subject(t.ko)} 들어가지 않은 메뉴를 알려 주실 수 있나요?`,
        en: `Could you tell me which dishes don't contain ${t.en}?`,
        ar: `هل يمكنك إخباري بالأطباق التي لا تحتوي على ${t.ar}؟`,
        'zh-CN': `可以告诉我哪些菜不含${t['zh-CN']}吗？`,
        ja: `${t.ja}が入っていないメニューを教えていただけますか？`,
        'zh-TW': `可以告訴我哪些菜不含${t['zh-TW']}嗎？`,
        es: `¿Podrían decirme qué platos no llevan ${t.es}?`,
      },
    };
  },
  /** 식단 기준 전달: 저는 ○○를 먹지 않아요.(알코올) */
  avoidShare: (raw: AllText): StaffSentence => {
    const t = lower(raw);
    return {
      main: {
        ko: `저는 ${object(t.ko)} 먹지 않아요.`,
        en: `I don't consume ${t.en}.`,
        ar: `أنا لا أتناول ${t.ar}.`,
        'zh-CN': `我不吃含${t['zh-CN']}的食物。`,
        ja: `${t.ja}は口にしません。`,
        'zh-TW': `我不吃含${t['zh-TW']}的食物。`,
        es: `No consumo ${t.es}.`,
      },
      sub: {
        ko: `${subject(t.ko)} 들어가지 않은 메뉴를 알려 주실 수 있나요?`,
        en: `Could you tell me which dishes don't contain ${t.en}?`,
        ar: `هل يمكنك إخباري بالأطباق التي لا تحتوي على ${t.ar}؟`,
        'zh-CN': `可以告诉我哪些菜不含${t['zh-CN']}吗？`,
        ja: `${t.ja}が入っていないメニューを教えていただけますか？`,
        'zh-TW': `可以告訴我哪些菜不含${t['zh-TW']}嗎？`,
        es: `¿Podrían decirme qué platos no llevan ${t.es}?`,
      },
    };
  },
  /** 식단 기준 전달: 저는 ○○ 식단을 지켜요. */
  dietShare: (label: AllText): StaffSentence => ({
    main: {
      ko: `저는 ${label.ko} 식단을 지켜요.`,
      en: `I follow a diet: ${label.en}.`,
      ar: `أتبع نظامًا غذائيًا: ${label.ar}.`,
      'zh-CN': `我遵循${label['zh-CN']}饮食。`,
      ja: `${label.ja}の食事を守っています。`,
      'zh-TW': `我遵循${label['zh-TW']}飲食。`,
      es: `Sigo una dieta: ${label.es}.`,
    },
    sub: {
      ko: '제 식단에 맞는 메뉴를 알려 주실 수 있나요?',
      en: 'Could you tell me which dishes fit my diet?',
      ar: 'هل يمكنك إخباري بالأطباق التي تناسب نظامي الغذائي؟',
      'zh-CN': '可以告诉我哪些菜符合我的饮食吗？',
      ja: '私の食事に合うメニューを教えていただけますか？',
      'zh-TW': '可以告訴我哪些菜符合我的飲食嗎？',
      es: '¿Podrían decirme qué platos son aptos para mi dieta?',
    },
  }),
  spicyShare: {
    main: {
      ko: '저는 매운 음식을 잘 못 먹어요.',
      en: "I can't eat spicy food well.",
      ar: 'لا أستطيع تناول الطعام الحار جيدًا.',
      'zh-CN': '我不太能吃辣。',
      ja: '辛い料理が苦手です。',
      'zh-TW': '我不太能吃辣。',
      es: 'No tolero bien la comida picante.',
    },
    sub: {
      ko: '맵지 않은 메뉴를 알려 주실 수 있나요?',
      en: "Could you tell me which dishes aren't spicy?",
      ar: 'هل يمكنك إخباري بالأطباق غير الحارة؟',
      'zh-CN': '可以告诉我哪些菜不辣吗？',
      ja: '辛くないメニューを教えていただけますか？',
      'zh-TW': '可以告訴我哪些菜不辣嗎？',
      es: '¿Podrían decirme qué platos no son picantes?',
    },
  } satisfies StaffSentence,
};
