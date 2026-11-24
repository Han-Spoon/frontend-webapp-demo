import type { Language, MenuAnalysis } from '../../types';
import {
  BowlTile,
  EvidenceBadge,
  HsButton,
  HsHeart,
  HsIcon,
  HsNote,
  HsSheet,
  IngredientTag,
  PlainTag,
  RISK_COLOR,
  RiskBadge,
  RiskTile,
  VerdictBox,
  tx,
  txn,
  type HsRisk,
} from '../hs';
import { localizeMenuText } from '../../results/resultViewModel';
import { tagRows, menuDescription, menuNames, type IngredientRow } from './menuView';
import { R, RISK_FALLBACK, RN } from './resultText';

export interface CardPrice {
  original: string;
  converted: string | null;
}

interface ResultMenuCardProps {
  language: Language;
  menu: MenuAnalysis;
  risk: HsRisk;
  /** 식단 조건이 없으면 판정 배지 없이 재료만 */
  showVerdict: boolean;
  rows: IngredientRow[];
  price: CardPrice | null;
  priceOptions: Array<{ label: string; price: CardPrice | null; raw: string; inferred: boolean }>;
  expanded: boolean;
  onToggle: () => void;
  favorite: { on: boolean; busy: boolean; disabled: boolean; onToggle: () => void };
  onStaffCards: () => void;
  onAllIngredients: () => void;
}

const TOP = 3;

function Price({ price, raw, language }: { price: CardPrice | null; raw?: string; language: Language }) {
  if (!price) return raw ? <span>{raw}</span> : <span className="text-hs-ink-500">{tx(language, R.noPrice)}</span>;
  return (
    <span dir="ltr" className="inline-flex flex-wrap gap-x-1">
      <span>{price.original}</span>
      {price.converted && <span className="font-bold text-hs-ink-500">≈ {price.converted}</span>}
    </span>
  );
}

/** 재료 한 줄: 이름(+숨은 재료 · 주재료) / 오른쪽 들어 있음 · 없음 · 확인 전 · % 막대 · 비움 */
function IngredientLine({ row, risk, language, first }: { row: IngredientRow; risk: HsRisk; language: Language; first: boolean }) {
  const roleLabel = row.role === 'hidden' ? tx(language, R.hidden) : row.role === 'identity' ? tx(language, R.main) : null;
  return (
    <li className={`flex min-h-10 items-center gap-2.5 px-0.5 py-1 ${first ? '' : 'border-t-[1.5px] border-hs-line-200'}`}>
      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5">
        <span className="text-[14px] font-black text-hs-ink-900">{row.name}</span>
        {roleLabel && <span className="text-[12px] font-bold text-hs-ink-500">{roleLabel}</span>}
      </span>
      {row.mark === 'present' && <span className={`flex-none text-[13px] font-black ${risk === 'danger' ? 'text-hs-danger-700' : RISK_COLOR[risk].fg}`}>{tx(language, R.present)}</span>}
      {row.mark === 'absent' && <span className="flex-none text-[13px] font-black text-hs-safe-700">{tx(language, R.absent)}</span>}
      {row.mark === 'pending' && <span className="flex-none text-[13px] font-extrabold text-hs-ink-500">{tx(language, R.pending)}</span>}
      {row.mark === 'probability' && row.probability !== undefined && (
        <span className="flex flex-none items-center gap-1.5" dir="ltr">
          <span className="w-10 text-end text-[13px] font-black text-hs-caution-700">{row.probability}%</span>
          <span role="img" aria-label={txn(language, RN.probability, row.probability)} className="flex h-1.5 w-16 overflow-hidden rounded-hs-pill bg-hs-surface-100">
            <span className="rounded-hs-pill bg-hs-caution-500" style={{ width: `${row.probability}%` }} />
          </span>
        </span>
      )}
    </li>
  );
}

export function IngredientList({ rows, risk, language }: { rows: IngredientRow[]; risk: HsRisk; language: Language }) {
  return (
    <ul className="m-0 list-none p-0">
      {rows.map((row, index) => <IngredientLine key={row.key} row={row} risk={risk} language={language} first={index === 0} />)}
    </ul>
  );
}

/** 결과 카드(접힘 · 펼침). 펼치면 판정색 2px 테두리. */
export function ResultMenuCard({ language, menu, risk, showVerdict, rows, price, priceOptions, expanded, onToggle, favorite, onStaffCards, onAllIngredients }: ResultMenuCardProps) {
  const names = menuNames(menu, language);
  const description = menuDescription(menu, language);
  const explain = menu.explainability;
  const verdict = (explain?.verdict ? localizeMenuText(explain.verdict, language).trim() : '')
    || (explain?.decisionReason ? localizeMenuText(explain.decisionReason, language).trim() : '')
    || tx(language, RISK_FALLBACK[risk]);
  const reasonRaw = explain?.verdict && explain.decisionReason ? localizeMenuText(explain.decisionReason, language).trim() : '';
  const reason = reasonRaw && reasonRaw !== verdict ? reasonRaw : '';
  const notes = (menu.notes ?? []).map((note) => note.text.trim()).filter(Boolean);
  const tags = showVerdict && (risk === 'caution' || risk === 'danger') ? tagRows(rows).slice(0, TOP) : [];
  const spicy = Boolean(menu.isSpicy || menu.is_spicy);
  const hasProbability = rows.some((row) => row.mark === 'probability');
  const many = rows.length > TOP;
  const detailsId = `menu-details-${menu.id}`;
  const border = expanded && showVerdict ? `border-2 ${RISK_COLOR[risk].border} px-[15px] py-[13px]` : 'border-[1.5px] border-hs-line-200 p-3.5';

  return (
    <article className={`rounded-hs-2xl bg-hs-surface-0 ${border}`} aria-label={menu.menuName}>
      <div className="flex items-start gap-3">
        {showVerdict ? <RiskTile risk={risk} /> : <BowlTile className="size-[var(--hs-size-tile)] bg-hs-surface-100 text-hs-ink-500"><HsIcon name="bowl" size={24} /></BowlTile>}
        <div className="min-w-0 flex-1">
          {showVerdict && (
            <div className="flex flex-wrap items-center gap-[5px]">
              <RiskBadge risk={risk} language={language} />
              <EvidenceBadge basis={risk === 'unknown' ? null : menu.evidenceBasis} language={language} />
            </div>
          )}
          <h3 lang="ko" className={`break-keep text-[18px] leading-[1.35] font-black text-hs-ink-900 ${showVerdict ? 'mt-1.5' : ''}`}>{names.korean}</h3>
          {names.secondary && <p className="text-[13px] font-bold text-hs-ink-500">{names.secondary}</p>}
          <p className="mt-[3px] text-[13px] font-extrabold text-hs-ink-700"><Price price={price} raw={menu.price} language={language} /></p>
          {priceOptions.map((option, index) => (
            <p key={index} className="text-[12px] font-bold text-hs-ink-500">
              {option.label} <Price price={option.price} raw={option.raw} language={language} />
              {option.inferred && <> · <span className="underline decoration-dotted underline-offset-2">{tx(language, R.inferred)}</span></>}
            </p>
          ))}
        </div>
        <HsHeart on={favorite.on} busy={favorite.busy} disabled={favorite.disabled} onToggle={favorite.onToggle} language={language} />
      </div>

      {!expanded && tags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="me-0.5 text-[12px] font-extrabold text-hs-ink-500">{tx(language, R.related)}</span>
          {tags.map((row) => <IngredientTag key={row.key} risk={risk}>{row.name}</IngredientTag>)}
        </div>
      )}

      {showVerdict && (
        <VerdictBox className="mt-3" verdict={verdict} reason={expanded ? reason : null} notes={expanded ? notes : []} />
      )}
      {showVerdict && !expanded && risk === 'unknown' && notes.map((note) => <HsNote key={note} className="mt-2 px-0.5">{note}</HsNote>)}

      {expanded && (
        <div id={detailsId}>
          {(description.korean || description.secondary) && (
            <p lang="ko" className="mx-0.5 mt-3 text-[13px] leading-[1.5] font-bold text-hs-ink-700">
              {description.korean}
              {description.secondary && <span lang={language === 'ko' ? 'en' : language} className="block text-[12px] font-semibold text-hs-ink-500">{description.secondary}</span>}
            </p>
          )}
          {spicy && <PlainTag className="mt-2.5 gap-1"><HsIcon name="chili" size={13} strokeWidth={2.4} />{tx(language, R.spicy)}</PlainTag>}
          {rows.length > 0 && (
            <>
              <div className="mx-0.5 mt-4 mb-0.5 flex items-baseline justify-between gap-2">
                <p className="text-[13px] font-black text-hs-ink-900">
                  {many ? tx(language, R.topLikely) : <>{tx(language, R.myRelated)} <span className="font-extrabold text-hs-ink-500">{txn(language, RN.count, rows.length)}</span></>}
                </p>
                {many
                  ? <span className="text-[12px] font-extrabold text-hs-ink-500">{txn(language, RN.outOf, rows.length)}</span>
                  : hasProbability && <span className="text-[12px] font-extrabold text-hs-ink-500">{tx(language, R.likelyFirst)}</span>}
              </div>
              <IngredientList rows={rows.slice(0, TOP)} risk={risk} language={language} />
              {many && (
                <HsButton variant="outline" size="md" block className="mt-2" trailingIcon="forward" onClick={onAllIngredients}>
                  {txn(language, RN.seeAll, rows.length)}
                </HsButton>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <HsButton variant="outline" size="md" icon="message" className="min-w-0 flex-1" onClick={onStaffCards}>{tx(language, R.staffCards)}</HsButton>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={expanded ? detailsId : undefined}
          onClick={onToggle}
          className="inline-flex h-[var(--hs-size-btn-md)] w-[104px] flex-none items-center justify-end gap-[3px] pe-1.5 text-[13px] font-extrabold text-hs-ink-900"
        >
          {tx(language, expanded ? R.less : R.more)}
          <HsIcon name={expanded ? 'chevronUp' : 'chevronDown'} size={16} strokeWidth={2.4} />
        </button>
      </div>
    </article>
  );
}

/** 관련 재료 전체 시트(한 목록 · 가능성 높은 순) */
export function AllIngredientsSheet({ language, menu, risk, rows, dietLabel, onClose }: { language: Language; menu: MenuAnalysis; risk: HsRisk; rows: IngredientRow[]; dietLabel: string; onClose: () => void }) {
  const subtitle = [menu.menuName, dietLabel].filter(Boolean).join(' · ');
  return (
    <HsSheet language={language} onClose={onClose} title={txn(language, RN.sheetTitle, rows.length)} subtitle={subtitle}>
      {rows.some((row) => row.mark === 'probability') && (
        <p className="mb-1 text-end text-[12px] font-extrabold text-hs-ink-500">{tx(language, R.likelyFirst)}</p>
      )}
      <IngredientList rows={rows} risk={risk} language={language} />
    </HsSheet>
  );
}
