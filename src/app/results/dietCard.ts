import type { Language } from '../App';
import type { LocalizedText } from '../locales';
import { localizeMenuText, type ProfileCommunicationItem } from './resultViewModel';

/**
 * 결과 위계 A 데모 전용: 내 식단 항목 전체를 한 장의 직원 전달 카드 문장으로 만든다.
 * 식단·알레르기·매운맛·알코올 문장을 이어 붙이고, 마지막에 재료 확인을 부탁한다.
 */
const LANGUAGES: Language[] = ['ko', 'en', 'ar', 'zh-CN', 'ja', 'zh-TW', 'es'];

const separator = (language: Language) =>
  language === 'zh-CN' || language === 'zh-TW' || language === 'ja' ? '、' : language === 'ar' ? '، ' : ', ';

const SENTENCES: Record<'diet' | 'allergy', Record<Language, (value: string) => string>> & Record<'spicy' | 'alcohol' | 'closing', Record<Language, string>> = {
  diet: {
    ko: value => `저는 ${value} 식단을 지켜요.`,
    en: value => `I follow a ${value} diet.`,
    ar: value => `أتبع نظامًا غذائيًا ${value}.`,
    'zh-CN': value => `我遵循${value}饮食。`,
    ja: value => `${value}の食事基準があります。`,
    'zh-TW': value => `我遵循${value}飲食。`,
    es: value => `Sigo una dieta ${value}.`,
  },
  allergy: {
    ko: value => `${value} 알레르기가 있어요.`,
    en: value => `I'm allergic to ${value}.`,
    ar: value => `لدي حساسية من ${value}.`,
    'zh-CN': value => `我对${value}过敏。`,
    ja: value => `${value}のアレルギーがあります。`,
    'zh-TW': value => `我對${value}過敏。`,
    es: value => `Soy alérgico/a a ${value}.`,
  },
  spicy: {
    ko: '매운 음식은 먹지 못해요.',
    en: "I can't eat spicy food.",
    ar: 'لا أستطيع تناول الطعام الحار.',
    'zh-CN': '我不能吃辣。',
    ja: '辛い料理は食べられません。',
    'zh-TW': '我不能吃辣。',
    es: 'No puedo comer picante.',
  },
  alcohol: {
    ko: '알코올이 들어간 음식은 먹지 않아요.',
    en: "I don't consume alcohol, including in food.",
    ar: 'لا أتناول الكحول، حتى في الطعام.',
    'zh-CN': '我不吃含酒精的食物。',
    ja: 'アルコールを含む料理は食べません。',
    'zh-TW': '我不吃含酒精的食物。',
    es: 'No consumo alcohol, tampoco en la comida.',
  },
  closing: {
    ko: '주문 전에 재료를 확인해 주세요.',
    en: 'Please check the ingredients before I order.',
    ar: 'يرجى التحقق من المكونات قبل أن أطلب.',
    'zh-CN': '点餐前请帮我确认食材。',
    ja: '注文前に材料を確認してください。',
    'zh-TW': '點餐前請幫我確認食材。',
    es: 'Por favor, revise los ingredientes antes de que pida.',
  },
};

function sentenceFor(items: ProfileCommunicationItem[], language: Language) {
  const names = (kind: ProfileCommunicationItem['kind']) =>
    items.filter(item => item.kind === kind).map(item => localizeMenuText(item.label, language)).join(separator(language));
  const diets = names('diet');
  const allergies = names('allergy');
  const space = language === 'zh-CN' || language === 'zh-TW' || language === 'ja' ? '' : ' ';
  return [
    diets && SENTENCES.diet[language](diets),
    allergies && SENTENCES.allergy[language](allergies),
    items.some(item => item.kind === 'spicy') && SENTENCES.spicy[language],
    items.some(item => item.kind === 'alcohol') && SENTENCES.alcohol[language],
    SENTENCES.closing[language],
  ].filter(Boolean).join(space);
}

export function buildDietCardText(items: ProfileCommunicationItem[]): LocalizedText {
  const text = Object.fromEntries(LANGUAGES.map(language => [language, sentenceFor(items, language)]));
  return text as unknown as LocalizedText;
}
