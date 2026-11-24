import type { ReactNode } from 'react';
import type { Language, UserProfile } from '../../types';
import { LANGUAGE_OPTIONS } from '../../locales';
import { getCountryFlag, getCountryName } from '../../constants/onboarding';
import { getProfileCommunicationItems } from '../../results/resultViewModel';
import { EmptyState, HsButton, HsIcon, tx } from '../hs';
import { FLIP_RTL } from '../hs/icons';
import { profileTagText } from '../map/reviewText';
import { M } from './text';

export type ProfileSection = 'language' | 'country' | 'diet';

/** F7-01 프로필 탭: 언어 · 나라 · 식단 카드(각 [수정 ›]) */
export function ProfileTab({ language, userProfile, onEdit }: { language: Language; userProfile: UserProfile | null; onEdit: (section?: ProfileSection) => void }) {
  if (!userProfile) {
    return (
      <div className="px-5 pt-[18px] pb-8">
        <EmptyState
          icon="user"
          title={tx(language, M.noProfile)}
          description={tx(language, M.noProfileBody)}
          action={<HsButton size="md" onClick={() => onEdit()}>{tx(language, M.setupProfile)}</HsButton>}
        />
      </div>
    );
  }
  const languageLabel = LANGUAGE_OPTIONS.find((option) => option.value === language)?.label ?? language;
  const dietIds = getProfileCommunicationItems(userProfile).map((item) => item.id);

  return (
    <div className="space-y-2.5 px-5 pt-[18px] pb-8">
      <ProfileCard language={language} title={tx(language, M.language)} onEdit={() => onEdit('language')}>
        <Row label={tx(language, M.appLanguage)}><span className="text-[14px] font-black">{languageLabel}</span></Row>
      </ProfileCard>
      <ProfileCard language={language} title={tx(language, M.country)} onEdit={() => onEdit('country')}>
        <Row label={tx(language, M.countryRow)}>
          {userProfile.nationality ? (
            <span className="flex items-center gap-1.5 text-[14px] font-black">
              <span aria-hidden="true">{getCountryFlag(userProfile.nationality)}</span>
              {getCountryName(userProfile.nationality, language)}
            </span>
          ) : <span className="text-[14px] font-bold text-hs-ink-500">{tx(language, M.none)}</span>}
        </Row>
      </ProfileCard>
      <ProfileCard language={language} title={tx(language, M.diet)} onEdit={() => onEdit('diet')}>
        <Row label={tx(language, M.dietItems)}>
          <span className="flex flex-wrap justify-end gap-[5px]">
            {dietIds.length > 0
              ? dietIds.map((id) => <span key={id} className="inline-flex h-[30px] items-center rounded-hs-pill bg-hs-surface-100 px-[11px] text-[12px] font-extrabold text-hs-ink-700">{profileTagText(id, language)}</span>)
              : <span className="text-[14px] font-black">{tx(language, M.noRestriction)}</span>}
          </span>
        </Row>
        <p className="pe-2 pb-3 text-[12px] leading-[1.5] font-semibold text-hs-ink-500">{tx(language, M.dietNote)}</p>
      </ProfileCard>
    </div>
  );
}

function ProfileCard({ language, title, onEdit, children }: { language: Language; title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="rounded-3xl border-[1.5px] border-hs-line-200 bg-hs-surface-0 py-1.5 ps-[18px] pe-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[16px] font-black">{title}</h3>
        <button type="button" onClick={onEdit} aria-label={`${title} ${tx(language, M.edit)}`} className="inline-flex min-h-11 items-center gap-0.5 ps-2.5 pe-1.5 text-[13px] font-extrabold text-hs-brand-700">
          {tx(language, M.edit)}
          <HsIcon name="forward" size={14} strokeWidth={2.6} className={FLIP_RTL} />
        </button>
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t-[1.5px] border-hs-line-200 py-3 pe-2">
      <span className="flex-none pt-0.5 text-[13px] font-bold text-hs-ink-500">{label}</span>
      {children}
    </div>
  );
}
