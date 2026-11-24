import { useState } from 'react';
import { LANGUAGE_OPTIONS, translateText, type Language } from '../../locales';
import { HsIcon } from './icons';
import { OptionRow } from './OptionRow';
import { HsSheet } from './Sheet';
import { tx } from './text';

const T = {
  choose: { ko: '언어 선택', en: 'Choose language', ar: 'اختر اللغة', 'zh-CN': '选择语言', ja: '言語を選択', 'zh-TW': '選擇語言', es: 'Elegir idioma' },
};

/** 흰 알약 언어 버튼 → 7개 언어 시트. `short`면 언어 코드(KO)만 보여 준다. */
export function LanguageButton({ language, setLanguage, short = false }: { language: Language; setLanguage: (language: Language) => void; short?: boolean }) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGE_OPTIONS.find((option) => option.value === language);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${tx(language, T.choose)}: ${current?.label ?? language}`}
        aria-haspopup="dialog"
        className="flex h-11 flex-none items-center gap-1.5 rounded-hs-pill bg-hs-surface-0 ps-3.5 pe-3 text-[14px] font-extrabold text-hs-ink-900"
      >
        <HsIcon name="globe" size={18} className="text-hs-brand-700" />
        <span lang={language}>{short ? language.slice(0, 2).toUpperCase() : current?.label}</span>
        {!short && <HsIcon name="chevronDown" size={14} />}
      </button>
      {open && (
        <HsSheet language={language} title={tx(language, T.choose)} onClose={() => setOpen(false)}>
          <div role="radiogroup" aria-label={tx(language, T.choose)} className="flex flex-col gap-2">
            {LANGUAGE_OPTIONS.map((option) => (
              <OptionRow
                key={option.value}
                title={option.label}
                description={translateText(language, option.sub)}
                selected={option.value === language}
                onClick={() => { setLanguage(option.value); setOpen(false); }}
              />
            ))}
          </div>
        </HsSheet>
      )}
    </>
  );
}
