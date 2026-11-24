import { useEffect, useState } from 'react';
import { getConsentStatus, type ConsentStatus } from '../../../api/consent';
import type { Language } from '../../types';
import { MAP_LANGUAGE_OPTIONS, setMapLanguage, useMapLanguage } from '../../../lib/mapLanguage';
import { HsButton, HsIcon, tx } from '../hs';
import { FLIP_RTL } from '../hs/icons';
import { M } from './text';

/** F7-07 설정 탭: 지도 언어 · 알림·동의 · 계정(로그아웃 · 회원 탈퇴) */
export function SettingsTab({ language, demoMode, onTerms, onLogout, onDeleteAccount }: {
  language: Language;
  demoMode: boolean;
  onTerms: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
}) {
  const mapLanguage = useMapLanguage();
  const [consent, setConsent] = useState<ConsentStatus | null>(null);
  const [consentLoading, setConsentLoading] = useState(!demoMode);
  const [consentError, setConsentError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (demoMode) return;
    let active = true;
    setConsentLoading(true);
    setConsentError(false);
    getConsentStatus().then((status) => { if (active) setConsent(status); })
      .catch(() => { if (active) setConsentError(true); })
      .finally(() => { if (active) setConsentLoading(false); });
    return () => { active = false; };
  }, [demoMode, reload]);

  const marketing = consent?.decisions.marketing;
  const status = demoMode ? { text: tx(language, M.demoChoice), on: false }
    : consentLoading ? { text: tx(language, M.checking), on: false }
      : consentError || marketing === undefined ? { text: tx(language, M.checkNeeded), on: false }
        : { text: tx(language, marketing ? M.agreed : M.notAgreed), on: marketing };

  return (
    <div className="px-5 pt-6 pb-10">
      <section aria-labelledby="settings-map">
        <h3 id="settings-map" className="ms-1 text-[17px] font-black">{tx(language, M.mapLanguage)}</h3>
        <p className="ms-1 mt-1 text-[13px] leading-[1.5] font-semibold text-hs-ink-500">{tx(language, M.mapLanguageBody)}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {MAP_LANGUAGE_OPTIONS.map((option) => {
            const on = option.value === mapLanguage;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={on}
                onClick={() => setMapLanguage(option.value)}
                className={`flex h-[60px] items-center justify-between gap-2 rounded-[22px] ps-[18px] pe-3.5 text-start ${on ? 'border-2 border-hs-brand-700 bg-hs-mint-100' : 'border-[1.5px] border-hs-line-200 bg-hs-surface-0'}`}
              >
                <span className="min-w-0">
                  <span className="block text-[16px] font-black">{option.label}</span>
                  {option.value === 'ko' && <span className="block text-[11px] font-bold text-hs-ink-500">{tx(language, M.default)}</span>}
                </span>
                <span aria-hidden="true" className={`flex size-[26px] flex-none items-center justify-center rounded-hs-pill ${on ? 'bg-hs-brand-700 text-hs-surface-0' : 'border-2 border-[#C9D6CF] bg-hs-surface-0'}`}>
                  {on && <HsIcon name="check" size={14} strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="settings-consent" className="mt-[26px] border-t-[1.5px] border-hs-line-200 pt-6">
        <h3 id="settings-consent" className="ms-1 text-[17px] font-black">{tx(language, M.consent)}</h3>
        <button type="button" onClick={onTerms} className="mt-3 flex min-h-14 w-full items-center gap-2.5 rounded-[20px] bg-hs-surface-100 ps-4 pe-3 text-start">
          <span className="min-w-0 flex-1 text-[14px] font-extrabold">{tx(language, M.marketing)}</span>
          <span className={`inline-flex h-7 flex-none items-center rounded-hs-pill px-2.5 text-[12px] font-black ${status.on ? 'bg-hs-mint-100 text-hs-brand-700' : 'bg-hs-surface-0 text-hs-ink-700'}`}>{status.text}</span>
          <span className="inline-flex flex-none items-center text-[13px] font-extrabold text-hs-brand-700">
            {tx(language, M.edit)}
            <HsIcon name="forward" size={14} strokeWidth={2.6} className={FLIP_RTL} />
          </span>
        </button>
        {consentError && !demoMode && (
          <button type="button" onClick={() => setReload((value) => value + 1)} className="ms-1 mt-1 min-h-11 text-[13px] font-extrabold text-hs-brand-700">{tx(language, M.retryConsent)}</button>
        )}
      </section>

      <section aria-labelledby="settings-account" className="mt-[26px] border-t-[1.5px] border-hs-line-200 pt-6">
        <h3 id="settings-account" className="ms-1 text-[17px] font-black">{tx(language, M.account)}</h3>
        <HsButton block variant="outline" icon="logout" className="mt-3 h-[52px]! border-hs-line-200! font-extrabold!" onClick={onLogout}>{tx(language, M.logout)}</HsButton>
        <p className="mx-1 mt-6 text-[12px] leading-[1.6] font-semibold text-hs-ink-500">{tx(language, M.deleteNote)}</p>
        <button type="button" onClick={onDeleteAccount} className="mt-1 min-h-10 px-1 text-[13px] font-extrabold text-hs-danger-700 underline underline-offset-2">{tx(language, M.deleteAccount)}</button>
      </section>
    </div>
  );
}
