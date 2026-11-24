import type { HsIconName } from './icons';
import type { AllText } from './text';

/** 화면 판정 상태(디자인 시스템 judgment.md) */
export type HsRisk = 'safe' | 'caution' | 'danger' | 'unknown';

/**
 * 서버 판정 → 화면 판정. 필터 개수 · 배지 · 아이콘은 이 함수 하나로 정한다.
 * - riskLevel null(판정 못함) → 확인 필요
 * - caution + evidenceBasis unknown(확률 없음) → 확인 필요
 * - 모르는 값은 안전으로 추정하지 않는다.
 */
export function riskOf(menu: { riskLevel?: string | null; evidenceBasis?: string | null }): HsRisk {
  const level = typeof menu.riskLevel === 'string' ? menu.riskLevel.trim().toLowerCase() : null;
  if (level === 'caution' && menu.evidenceBasis === 'unknown') return 'unknown';
  if (level === 'safe' || level === 'caution' || level === 'danger') return level;
  return 'unknown';
}

/** 화면 순서: 안전 → 주의 → 위험 → 확인 필요(2026-11-24 결정). 같은 묶음 안은 들어온 순서(서버 displayOrder) 그대로. */
export const RISK_ORDER: readonly HsRisk[] = ['safe', 'caution', 'danger', 'unknown'];

export function orderByRisk<T>(items: readonly T[], getRisk: (item: T) => HsRisk): T[] {
  return RISK_ORDER.flatMap((risk) => items.filter((item) => getRisk(item) === risk));
}

export const RISK_ICON: Record<HsRisk, HsIconName> = {
  safe: 'check',
  caution: 'alert',
  danger: 'x',
  unknown: 'question',
};

/** 판정색: -500 점 · 테두리 · 막대 / -700 글자 / -100 바탕 */
export const RISK_COLOR: Record<HsRisk, { dot: string; fg: string; bg: string; border: string; text: string; surface: string }> = {
  safe: { dot: 'bg-hs-safe-500', border: 'border-hs-safe-500', fg: 'text-hs-safe-700', text: 'text-hs-safe-700', bg: 'bg-hs-safe-100', surface: 'bg-hs-safe-100' },
  caution: { dot: 'bg-hs-caution-500', border: 'border-hs-caution-500', fg: 'text-hs-caution-700', text: 'text-hs-caution-700', bg: 'bg-hs-caution-100', surface: 'bg-hs-caution-100' },
  danger: { dot: 'bg-hs-danger-500', border: 'border-hs-danger-500', fg: 'text-hs-danger-700', text: 'text-hs-danger-700', bg: 'bg-hs-danger-100', surface: 'bg-hs-danger-100' },
  unknown: { dot: 'bg-hs-unknown-500', border: 'border-hs-unknown-500', fg: 'text-hs-unknown-700', text: 'text-hs-unknown-700', bg: 'bg-hs-unknown-100', surface: 'bg-hs-unknown-100' },
};

export const RISK_LABEL: Record<HsRisk, AllText> = {
  safe: { ko: '안전', en: 'Safe', ar: 'آمن', 'zh-CN': '安全', ja: '安全', 'zh-TW': '安全', es: 'Seguro' },
  caution: { ko: '주의', en: 'Caution', ar: 'تنبيه', 'zh-CN': '注意', ja: '注意', 'zh-TW': '注意', es: 'Precaución' },
  danger: { ko: '위험', en: 'Danger', ar: 'خطر', 'zh-CN': '危险', ja: '危険', 'zh-TW': '危險', es: 'Peligro' },
  unknown: { ko: '확인 필요', en: 'Needs checking', ar: 'يحتاج إلى تحقق', 'zh-CN': '需确认', ja: '要確認', 'zh-TW': '需確認', es: 'Por confirmar' },
};

export const EVIDENCE_LABEL: Record<'confirmed' | 'estimated', AllText> = {
  confirmed: { ko: '사장님 확인 기준', en: 'Confirmed by the restaurant', ar: 'بتأكيد المطعم', 'zh-CN': '以店家确认为准', ja: 'お店の確認に基づく', 'zh-TW': '以店家確認為準', es: 'Confirmado por el restaurante' },
  estimated: { ko: '추정 확률 기준', en: 'Based on estimated likelihood', ar: 'بناءً على احتمال تقديري', 'zh-CN': '基于估计概率', ja: '推定確率に基づく', 'zh-TW': '依估計機率', es: 'Según probabilidad estimada' },
};
