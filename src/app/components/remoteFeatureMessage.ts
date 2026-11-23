import { translateText, type Language } from '../locales';

export function remoteFeatureUnavailable(language: Language): string {
  return translateText(language, {
    ko: '지금은 이 기능을 이용할 수 없어요. 잠시 후 다시 확인해 주세요.',
    en: 'This feature is currently unavailable. Please check again later.',
    ar: 'هذه الميزة غير متاحة حالياً. يرجى المحاولة لاحقاً.',
    'zh-CN': '此功能暂时无法使用，请稍后再试。',
    'zh-TW': '此功能暫時無法使用，請稍後再試。',
    ja: '現在この機能は利用できません。しばらくしてから再度お試しください。',
    es: 'Esta función no está disponible actualmente. Inténtalo más tarde.',
  });
}
