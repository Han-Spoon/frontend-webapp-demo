export type RiskLevel = 'safe' | 'caution' | 'danger' | 'unknown';

const KNOWN_LEVELS = new Set<string>(['safe', 'caution', 'danger']);

/** 서버·저장소 값 → 화면 판정. null·누락·모르는 값은 unknown. */
export function normalizeRiskLevel(value: unknown): RiskLevel {
  if (typeof value !== 'string') return 'unknown';
  const normalized = value.trim().toLowerCase();
  return KNOWN_LEVELS.has(normalized) ? (normalized as RiskLevel) : 'unknown';
}
