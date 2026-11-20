import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Language } from '../App';
import { isLanguage } from '../locales';
import { FILMING_MENUS as RESULT_PREVIEW_MENUS, FILMING_PROFILE as RESULT_PREVIEW_PROFILE } from '../results/filmingFixtures';
import { LAYOUT_PREVIEW_EXTRA_MENUS, LAYOUT_PREVIEW_STORE } from '../results/layoutPreviewFixtures';
import { ResultsScreen, type ResultsLayoutVariant } from './ResultsScreen';

interface DevResultsPreviewProps {
  fallbackLanguage: Language;
}

const LAYOUT_OPTIONS: { value: ResultsLayoutVariant; label: string }[] = [
  { value: 'current', label: '현재' },
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
];

export function DevResultsPreview({ fallbackLanguage }: DevResultsPreviewProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedLanguage = searchParams.get('lang');
  const language = isLanguage(requestedLanguage) ? requestedLanguage : fallbackLanguage;
  // 결과 위계 비교(ui-audit 4번). layout 파라미터가 있을 때만 '확인 필요' 예시 메뉴를 붙인다.
  const requestedLayout = searchParams.get('layout');
  const layout = LAYOUT_OPTIONS.find(option => option.value === requestedLayout)?.value;
  const menus = layout ? [...RESULT_PREVIEW_MENUS, ...LAYOUT_PREVIEW_EXTRA_MENUS] : RESULT_PREVIEW_MENUS;
  // ?store=1: 가게를 고르고 스캔한 경우(서버 가게 요약만 있음)를 본다.
  const withStore = Boolean(layout) && searchParams.get('store') === '1';

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

  const selectLayout = (value: ResultsLayoutVariant) => {
    const next = new URLSearchParams(searchParams);
    next.set('layout', value);
    setSearchParams(next, { replace: true });
  };
  const toggleStore = () => {
    const next = new URLSearchParams(searchParams);
    if (withStore) next.delete('store'); else next.set('store', '1');
    setSearchParams(next, { replace: true });
  };

  return (
    <>
      <ResultsScreen
        key={`${layout ?? 'default'}-${withStore}`}
        language={language}
        menus={menus}
        demoMode
        layoutVariant={layout ?? 'current'}
        store={withStore ? LAYOUT_PREVIEW_STORE : null}
        userProfile={{ ...RESULT_PREVIEW_PROFILE, languageCode: language }}
        onBack={() => navigate('/home')}
        onRescan={() => window.location.assign(`/scan?demo=1&lang=${language}`)}
      />
      {layout && (
        <div role="group" aria-label="Layout preview" className="fixed bottom-[84px] start-2 z-40 flex overflow-hidden rounded-full border border-border-warm bg-surface-raised text-[11px] font-bold shadow-[var(--shadow-card)]">
          {LAYOUT_OPTIONS.map(option => (
            <button key={option.value} type="button" aria-pressed={layout === option.value} onClick={() => selectLayout(option.value)} className={`min-h-10 px-2.5 ${layout === option.value ? 'bg-text-primary text-white' : 'text-text-secondary'}`}>
              {option.label}
            </button>
          ))}
          <button type="button" aria-pressed={withStore} onClick={toggleStore} className={`min-h-10 border-s border-border-warm px-2.5 ${withStore ? 'bg-brand-primary text-white' : 'text-text-secondary'}`}>가게</button>
        </div>
      )}
    </>
  );
}
