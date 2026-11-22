import { useEffect } from 'react';
import { translateText, type Language } from '../locales';

/** 앱 언어 → 문서 제목·설명, `lang`·`dir`(아랍어 RTL), 언어 저장 */
export function useDocumentLanguage(language: Language) {
  useEffect(() => {
    document.title = translateText(language, {
      ko: '한스푼 | 낯선 메뉴도, 안심하고 한 스푼',
      en: 'Han Spoon | Discover Korean food with confidence',
      ar: 'Han Spoon | اكتشف الطعام الكوري بثقة',
      'zh-CN': 'Han Spoon | 安心探索韩国美食',
      ja: 'Han Spoon | 韓国のメニューを安心して楽しむ',
      'zh-TW': 'Han Spoon | 安心探索韓國美食',
      es: 'Han Spoon | Descubre la comida coreana con confianza',
    });
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute(
      'content',
      translateText(language, {
        ko: '낯선 한국 메뉴도 안심하고 발견하도록 돕는 여행 식탁 가이드',
        en: 'A dining guide that helps travelers explore unfamiliar Korean menus with confidence.',
        ar: 'دليل طعام يساعد المسافرين على استكشاف القوائم الكورية بثقة.',
        'zh-CN': '帮助旅客安心探索陌生韩国菜单的餐饮指南。',
        ja: '旅行者が初めての韓国メニューを安心して楽しむための食事ガイド。',
        'zh-TW': '幫助旅客安心探索陌生韓國菜單的用餐指南。',
        es: 'Una guía para descubrir menús coreanos desconocidos con confianza.',
      }),
    );
  }, [language]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('han-spoon-language', language);
  }, [language]);
}
