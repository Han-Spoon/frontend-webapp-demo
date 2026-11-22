import { useEffect, useState } from 'react';
import { isLanguageReady, loadLanguage, type Language } from '../locales';

/**
 * 화면에 쓸 언어: 사전을 받은 뒤에 바꿈(받는 동안 이전 언어 유지, 첫 화면이면 null).
 * 받기 실패 시 그 언어로 바꾸고 사전 없는 문구는 영어 fallback.
 */
export function useShownLanguage(language: Language): Language | null {
  const [shown, setShown] = useState<Language | null>(() => (isLanguageReady(language) ? language : null));

  useEffect(() => {
    if (isLanguageReady(language)) {
      setShown(language);
      return;
    }
    let active = true;
    loadLanguage(language)
      .catch((error) => console.warn('Unable to load language dictionary:', error))
      .finally(() => {
        if (active) setShown(language);
      });
    return () => {
      active = false;
    };
  }, [language]);

  return shown;
}
