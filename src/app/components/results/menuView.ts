import type { Language, LocalizedMenuText, MenuAnalysis } from '../../types';
import { buildMenuResultViewModel, localizeMenuText } from '../../results/resultViewModel';
import type { AllText } from '../hs/text';
import type { HsRisk } from '../hs/risk';
import { fillTerm } from './staffText';

const LANGS: Language[] = ['ko', 'en', 'ar', 'zh-CN', 'ja', 'zh-TW', 'es'];

/** 보조 언어: 앱 언어, 한국어 앱이면 영어(직원 카드 · 메뉴 이름 아래 줄 공통) */
export const secondaryLanguage = (language: Language): Language => (language === 'ko' ? 'en' : language);

/** 메뉴 이름(한국어 원문) + 아래 줄(보조 언어). 같으면 아래 줄 없음. */
export function menuNames(menu: MenuAnalysis, language: Language): { korean: string; secondary: string | null } {
  const lang = secondaryLanguage(language);
  const localized = menu.menuNameLocalized?.[lang];
  const secondary = (localized || (lang === 'ar' ? menu.menuNameAr : undefined) || menu.menuNameEn || '').trim();
  return { korean: menu.menuName, secondary: secondary && secondary !== menu.menuName.trim() ? secondary : null };
}

/** 메뉴 설명(한국어) + 아래 줄(보조 언어) */
export function menuDescription(menu: MenuAnalysis, language: Language): { korean: string; secondary: string | null } {
  const lang = secondaryLanguage(language);
  const korean = (menu.descriptionLocalized?.ko ?? menu.description ?? '').trim();
  const secondary = (menu.descriptionLocalized?.[lang] || (lang === 'ar' ? menu.descriptionAr : undefined) || menu.descriptionEn || '').trim();
  return { korean, secondary: secondary && secondary !== korean ? secondary : null };
}

/** 메뉴 이름을 7개 언어로(주문 카드 · 카드 저장). 없는 언어는 영어 → 한국어. */
export function menuNameAll(menu: MenuAnalysis): AllText {
  return fillTerm({ ...(menu.menuNameLocalized ?? {}), ko: menu.menuName, en: menu.menuNameLocalized?.en || menu.menuNameEn, ar: menu.menuNameLocalized?.ar || menu.menuNameAr });
}

export const localizedAll = (text: LocalizedMenuText): AllText => fillTerm(text);

export type IngredientMark = 'present' | 'absent' | 'pending' | 'probability' | 'plain';

export interface IngredientRow {
  key: string;
  name: string;
  /** 숨은 재료 · 주재료 */
  role: 'hidden' | 'identity' | null;
  mark: IngredientMark;
  /** 0–100 정수(mark=probability일 때만) */
  probability?: number;
}

const MARK_ORDER: Record<IngredientMark, number> = { present: 0, probability: 1, pending: 2, absent: 3, plain: 4 };

/**
 * 내 식단과 관련된 재료 줄.
 * - 들어 있음(present) → 확률 높은 순 → 확인 전 → 없음 → 확률 없는 재료(이름만, 맨 끝)
 * - 확률은 주의 판정 + 내 식단 재료 + 0–100 유한한 숫자일 때만(안전 확률로 부르지 않음)
 * - 근거가 적다는 표시('–' · 점선 막대)는 쓰지 않는다(2026-11-24 결정).
 */
export function ingredientRows(menu: MenuAnalysis, risk: HsRisk, activeProfileIds: Set<string>, anyProfile: boolean, language: Language): IngredientRow[] {
  const ingredients = menu.explainability?.ingredients;
  if (!ingredients) {
    if (risk !== 'caution' && risk !== 'danger') return [];
    return buildMenuResultViewModel(menu, language).ingredients.map((item, index) => ({ key: `${item.localizedName}-${index}`, name: item.localizedName, role: null, mark: 'plain' as const }));
  }
  const related = ingredients.filter((item) => anyProfile ? (item.profileIds?.length ?? 0) > 0 : item.profileIds?.some((id) => activeProfileIds.has(id)));
  const rows = related.map((item, index): IngredientRow => {
    const p = item.inclusionProbability;
    const validProbability = risk === 'caution' && typeof p === 'number' && Number.isFinite(p) && p >= 0 && p <= 100;
    const mark: IngredientMark = item.status === 'present' ? 'present'
      : item.status === 'absent' ? 'absent'
      : validProbability ? 'probability'
      : menu.evidenceBasis === 'confirmed' ? 'pending'
      : 'plain';
    return {
      key: `${item.name.ko}-${index}`,
      name: localizeMenuText(item.name, language),
      role: item.role === 'hidden' || item.role === 'identity' ? item.role : null,
      mark,
      probability: mark === 'probability' ? Math.round(p as number) : undefined,
    };
  });
  return rows.sort((a, b) => MARK_ORDER[a.mark] - MARK_ORDER[b.mark] || (b.probability ?? 0) - (a.probability ?? 0));
}

/** 접힌 카드의 '관련 재료' 태그: 없음으로 확인된 재료는 뺀다 */
export const tagRows = (rows: IngredientRow[]) => rows.filter((row) => row.mark !== 'absent');

export { LANGS };

/** 식단 칩 이름(새우 알레르기 · 매운 음식 비선호 · 비건) */
export function dietTagLabel(item: { kind: 'allergy' | 'diet' | 'spicy' | 'alcohol'; label: LocalizedMenuText }, language: Language): string {
  const t = localizedAll(item.label);
  if (item.kind === 'allergy') {
    const text: AllText = { ko: `${t.ko} 알레르기`, en: `${t.en} allergy`, ar: `حساسية ${t.ar}`, 'zh-CN': `${t['zh-CN']}过敏`, ja: `${t.ja}アレルギー`, 'zh-TW': `${t['zh-TW']}過敏`, es: `Alergia a ${t.es.toLocaleLowerCase('es')}` };
    return text[language];
  }
  if (item.kind === 'spicy') return ({ ko: '매운 음식 비선호', en: 'Avoids spicy food', ar: 'يتجنب الطعام الحار', 'zh-CN': '不吃辣', ja: '辛い料理が苦手', 'zh-TW': '不吃辣', es: 'Evita el picante' } satisfies AllText)[language];
  if (item.kind === 'alcohol') return ({ ko: '알코올 피함', en: 'Avoids alcohol', ar: 'يتجنب الكحول', 'zh-CN': '不含酒精', ja: 'アルコールを避ける', 'zh-TW': '不含酒精', es: 'Evita el alcohol' } satisfies AllText)[language];
  return t[language];
}
