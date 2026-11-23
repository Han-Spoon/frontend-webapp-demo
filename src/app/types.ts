/** 화면 공용 도메인 타입 */
import type { RiskLevel } from '../api/riskLevel';
import type { StoreCandidate, StoreSummary } from '../api/store';
import type { Language } from './locales';

export type { Language } from './locales';

export interface UserAllergy {
  allergy_name_ko: string;
  allergy_name_en?: string;
  allergy_name_ar?: string;
  allergy_name?: string;
}

export interface UserProfile {
  /** ISO 3166-1 alpha-2 (대문자, 예: "SA") */
  nationality: string;
  languageCode: Language;
  isFirstTime: boolean;
  isVegan: boolean;
  /** VegetarianType 코드값 (vegan|lacto|ovo|lacto_ovo|pesco) */
  veganType?: string | null;
  hasReligion: boolean;
  /** ReligionType 코드값 (halal|kosher|hindu) */
  religionType?: string | null;
  hasAllergies: boolean;
  /** AllergyCode 코드값 배열 (egg, milk, ...) */
  allergies: string[];
  noSpicy: boolean;
  noAlcohol: boolean;
}

export interface LocalizedMenuText {
  ko: string;
  en?: string;
  ar?: string;
  'zh-CN'?: string;
  ja?: string;
  'zh-TW'?: string;
  es?: string;
}

export type EvidenceConfidence = 'high' | 'medium' | 'limited';
export type EvidenceSourceType =
  | 'menu-description'
  | 'menu-context'
  | 'trusted-cooking'
  | 'demo-recipe'
  | 'web'
  | 'staff';

export interface MenuIngredientEvidence {
  status?: 'present' | 'absent' | 'unknown';
  evidenceConfidence?: number | null;
  priorSource?: string | null;
  name: LocalizedMenuText;
  /** 0–100. 주의 판정 + 해당 프로필일 때만 표시. */
  inclusionProbability?: number;
  profileIds?: string[];
  /** 서버 제공 시에만 표시(프론트 계산 없음) */
  inclusionLikelihood?: 'high' | 'medium' | 'low';
  confidence?: EvidenceConfidence;
  /** 이 재료에 직접 연결된 출처만(메뉴 전체 출처 배분 금지) */
  sourceTypes?: EvidenceSourceType[];
  staffEvidence?: {
    usedCount?: number;
    checkedCount?: number;
    sampleSufficient?: boolean;
  };
  sourcesConflict?: boolean;
}

export interface MenuEvidenceSource {
  type: EvidenceSourceType;
  title?: LocalizedMenuText;
  confidence?: EvidenceConfidence;
}

/** 결과 화면 판정 근거(선택). 값이 없으면 해당 영역 생략. */
export interface MenuExplainability {
  /** 분석 관점별 사용자용 확인 결과(추론 로그 아님) */
  checks?: {
    kind: 'menu' | 'recipe' | 'profile' | 'cross-contact';
    status: 'observed' | 'inferred' | 'unverified';
    finding: LocalizedMenuText;
  }[];
  decisionReason?: LocalizedMenuText;
  profileRelatedItems?: LocalizedMenuText[];
  ingredients?: MenuIngredientEvidence[];
  hiddenIngredientPaths?: LocalizedMenuText[][];
  sources?: MenuEvidenceSource[];
  uncertainties?: LocalizedMenuText[];
  curationId?: string;
}

export interface MenuAnalysis {
  priceOptions?: Array<{ label: string; priceText: string; inferred: boolean }>;
  evidenceBasis?: 'confirmed' | 'estimated' | 'unknown';
  informationStatus?: 'complete' | 'partial' | 'none';
  notes?: Array<{ code: string; text: string }>;
  id: string;
  image?: string;
  imagePosition?: string;
  imageScale?: number;
  imageCredit?: { author: string; url: string; license: string };
  imageAttribution?: string;
  /** fixture 표시. 실제 API 매퍼는 채우지 않음. */
  demoScenario?: 'bunsik-vegan-shrimp';
  menuName: string;
  menuNameEn: string;
  menuNameAr?: string;
  menuNameLocalized?: LocalizedMenuText;
  description: string;
  descriptionEn?: string;
  descriptionAr?: string;
  descriptionLocalized?: LocalizedMenuText;
  price?: string;
  riskLevel: RiskLevel;
  staffQuestions?: import('../api/scan').MenuResult['staffQuestions'];
  riskReasons: string[];
  riskReasonsEn?: string[];
  riskReasonsAr?: string[];
  isSpicy: boolean;
  is_spicy?: boolean;
  isAlcohol?: boolean;
  is_alcohol?: boolean;
  explainability?: MenuExplainability;
}

export interface PendingMenuImage {
  file: File | null;
  previewUrl: string;
  source: 'camera' | 'upload';
  storage?: {
    provider: 's3';
    key?: string;
  };
  store?: StoreCandidate | null;
}

export interface HistoryItem {
  id: string;
  title: string;
  date: string;
  menuCount: number;
  /** 서버 미제공 시 null. 0으로 채우지 않음(위험 없음 오해 방지). */
  dangerCount?: number | null;
  cautionCount?: number | null;
  menus: MenuAnalysis[];
  store?: StoreSummary | null;
}
