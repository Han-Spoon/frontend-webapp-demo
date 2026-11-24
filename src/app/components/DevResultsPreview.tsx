import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Language } from '../types';
import { isLanguage } from '../locales';
import { FILMING_MENUS, FILMING_PROFILE } from '../results/filmingFixtures';
import { GUIDE_PREVIEW_MENUS, GUIDE_PREVIEW_PROFILE } from '../results/guideFixtures';
import { ResultsScreen } from './ResultsScreen';

interface DevResultsPreviewProps {
  fallbackLanguage: Language;
}

export function DevResultsPreview({ fallbackLanguage }: DevResultsPreviewProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedLanguage = searchParams.get('lang');
  const language = isLanguage(requestedLanguage) ? requestedLanguage : fallbackLanguage;
  // ?set=filming: 촬영용 분식 시나리오 / 기본: F4 보드와 같은 메뉴. ?store=0: 식당 없이 스캔.
  const filming = searchParams.get('set') === 'filming';
  const withStore = searchParams.get('store') !== '0';

  useEffect(() => {
    const previousLanguage = document.documentElement.lang;
    const previousDirection = document.documentElement.dir;
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    return () => {
      document.documentElement.lang = previousLanguage;
      document.documentElement.dir = previousDirection;
    };
  }, [language]);

  return (
    <ResultsScreen
      language={language}
      menus={filming ? FILMING_MENUS : GUIDE_PREVIEW_MENUS}
      demoMode
      userProfile={{ ...(filming ? FILMING_PROFILE : GUIDE_PREVIEW_PROFILE), languageCode: language }}
      store={withStore ? { storeId: 1, name: '초록식탁' } : null}
      title={withStore ? '초록식탁 저녁' : null}
      scannedAt="2026-11-24T18:32:00+09:00"
      onBack={() => navigate('/home')}
      onRescan={() => window.location.assign(`/scan?demo=1&lang=${language}`)}
    />
  );
}
