import { authFetch } from './authFetch';
import { ApiError } from './user';
import type { StoreMatchMethod, StoreSummary } from './store';
import type { MenuAnalysis } from '../app/App';
import type { Language, UserProfile } from '../app/App';

export type ScanStatus =
  | 'pending'
  | 'processing'
  | 'analyzing'
  | 'completed'
  | 'complete'
  | 'done'
  | 'succeeded'
  | 'failed'
  | 'needs_retake';
export type NormalizedScanStatus = 'processing' | 'completed' | 'failed' | 'needs_retake' | 'unknown';

export interface FinalMessage {
  ko: string;
  en?: string | null;
  ar?: string | null;
}

export interface OwnerCard {
  menuName?: string | null;
  /** 애매함 플래그 (예: has_unclear_jeotgal) */
  flag?: string | null;
  question?: unknown;
}

/** 백엔드 스캔 결과의 메뉴 1건 (MenuResult). */
export interface MenuResult {
  scanMenuId?: string;
  displayOrder?: number | null;
  status?: 'completed' | 'partial_failed' | 'failed';
  displayName?: string;
  translatedName?: string | null;
  description?: string | null;
  translatedDescription?: string | null;
  menuNameKo?: string;
  menuNameEn?: string | null;
  priceText?: string | null;
  isSpicy?: boolean | null;
  riskLevel: 'safe' | 'caution' | 'danger' | null;
  evidenceBasis?: 'confirmed' | 'estimated' | 'unknown';
  informationStatus?: 'complete' | 'partial' | 'none';
  staffAnswerStatus?: 'none' | 'partial' | 'complete';
  matchedTags?: string[];
  riskIngredients?: Array<{ name: Record<string, string>; status: 'present' | 'absent' | 'unknown'; posteriorMean: number | null; matchedTags: string[]; confidence?: number | null; role?: string | null; priorSource?: string | null }>;
  staffQuestions?: Array<{ questionId: string; cardId: string; questionText: Record<string, string>; status: 'pending' | 'answered' | 'expired'; answer: 'present' | 'absent' | 'unknown' | null; answeredAt?: string | null }>;
  hits?: string[] | null;
  message?: FinalMessage | { verdict: string; reason?: string | null; notes?: Array<{ code: string; text: string }> } | null;
  ownerCard?: OwnerCard | null;
}

export interface ScanCreatedResponse {
  scanId: string;
  status: ScanStatus;
}

export interface ScanResultResponse {
  scanId: string;
  status: ScanStatus;
  title?: string | null;
  store?: StoreSummary | null;
  locale?: Language;
  record?: ScanRecordResponse | null;
  dietSnapshot?: Partial<UserProfile> | null;
  menuCount?: number | null;
  dangerCount?: number | null;
  cautionCount?: number | null;
  safeCount?: number | null;
  riskyMenuCount?: number | null;
  scannedAt?: string | null;
  menus?: MenuResult[] | null;
  retakeReasons?: string[] | null;
  retakeSuggestions?: string[] | null;
  failureCode?: string | null;
}

export interface ScanHistoryItem {
  scanId: string;
  title?: string | null;
  status: ScanStatus;
  store?: StoreSummary | null;
  menuCount?: number | null;
  dangerCount?: number | null;
  cautionCount?: number | null;
  riskyMenuCount?: number | null;
  scannedAt?: string | null;
}

export interface ScanRecordResponse {
  scanId: string;
  store: StoreSummary | null;
  storeLocked: boolean;
  storeMatchMethod: StoreMatchMethod | null;
  savedAt: string;
}

export interface StartScanPayload {
  storageKey: string;
  source?: 'camera' | 'upload';
  storeId?: number;
  storeMatchMethod?: StoreMatchMethod;
}

interface PageResponse<T> {
  items: T[];
}

async function parse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};

  if (!response.ok) {
    console.error('Scan API request failed:', response.status, text);
    throw new ApiError(response.status, text);
  }

  return (json.data ?? json) as T;
}

export async function startScan(payload: StartScanPayload): Promise<ScanCreatedResponse> {
  const response = await authFetch('/api/v1/scans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parse<ScanCreatedResponse>(response);
}

export async function getScanResult(scanId: string): Promise<ScanResultResponse> {
  const response = await authFetch(`/api/v1/scans/${scanId}`, { method: 'GET' });
  return parse<ScanResultResponse>(response);
}

export function normalizeScanStatus(status?: string | null): NormalizedScanStatus {
  const normalized = status?.trim().toLowerCase();

  if (normalized === 'completed' || normalized === 'complete' || normalized === 'done' || normalized === 'succeeded') {
    return 'completed';
  }

  if (normalized === 'needs_retake') {
    return 'needs_retake';
  }

  if (normalized === 'failed') {
    return 'failed';
  }

  if (normalized === 'pending' || normalized === 'processing' || normalized === 'analyzing') {
    return 'processing';
  }

  return 'unknown';
}

export async function getScanHistory(page = 0, size = 20): Promise<ScanHistoryItem[]> {
  const response = await authFetch(`/api/v1/scans?page=${page}&size=${size}`, { method: 'GET' });
  const data = await parse<PageResponse<ScanHistoryItem>>(response);
  return data.items ?? [];
}

export async function updateScanTitle(scanId: string, title: string): Promise<ScanHistoryItem> {
  const normalizedTitle = title.trim();
  if (!normalizedTitle || normalizedTitle.length > 30) throw new Error('Title must be 1–30 characters.');
  const response = await authFetch(`/api/v1/scans/${scanId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: normalizedTitle }),
  });
  return parse<ScanHistoryItem>(response);
}

export async function saveScanRecord(scanId: string, store?: { storeId: number; storeMatchMethod: Exclude<StoreMatchMethod, 'store_detail'> }): Promise<ScanRecordResponse> {
  const response = await authFetch(`/api/v1/scans/${scanId}/record`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(store ?? {}),
  });
  return parse<ScanRecordResponse>(response);
}

export interface ScanImageResponse { imageUrl: string; contentType: string; expiresAt: string; availableUntil: string }
export async function getScanImage(scanId: string): Promise<ScanImageResponse> {
  const response = await authFetch(`/api/v1/scans/${scanId}/image`);
  return parse<ScanImageResponse>(response);
}

export async function deleteScan(scanId: string): Promise<void> {
  const response = await authFetch(`/api/v1/scans/${scanId}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }
}

/** 백엔드 MenuResult → 프론트 MenuAnalysis 매핑. */
export function mapMenuResult(menu: MenuResult, index: number, locale: Language = 'ko', profile: UserProfile | null = null): MenuAnalysis {
  // danger 재료(hits: is_*)와 caution 의심재료(ownerCard.flag: has_unclear_*)를 합쳐
  // 위험/의심 재료 태그의 원천으로 보관(코드 그대로, 렌더 시 언어 변환).
  const flagFromOwnerCard = menu.ownerCard?.flag ? [menu.ownerCard.flag] : [];
  const tags = Array.from(new Set([...(menu.matchedTags ?? menu.hits ?? []), ...flagFromOwnerCard]));
  const isAlcohol = tags.some((tag) => tag.toLowerCase().includes('alcohol'));
  const v2Message = menu.message && 'verdict' in menu.message ? menu.message : null;
  const legacyMessage = menu.message && 'ko' in menu.message ? menu.message : null;
  const localized = (value: string) => ({ ko: value, [locale]: value });
  const profileIds = profile ? [
    ...(profile.hasAllergies ? profile.allergies.map(code => `allergy:${code}`) : []),
    ...(profile.noSpicy ? ['preference:no-spicy'] : []),
    ...(profile.noAlcohol ? ['preference:no-alcohol'] : []),
  ] : [];
  const riskIngredients = (menu.riskIngredients ?? []).map(ingredient => {
    const matchedProfileIds = profileIds.filter(id => ingredient.matchedTags.includes(`is_${id.split(':').pop()?.replace(/-/g, '_')}`));
    const probability = ingredient.posteriorMean;
    return {
      name: { ko: ingredient.name.ko ?? '', ...(ingredient.name as Record<string, string>) },
      profileIds: matchedProfileIds,
      inclusionProbability: typeof probability === 'number' && Number.isFinite(probability) && probability >= 0 && probability <= 1 ? probability * 100 : undefined,
    };
  });
  const name = menu.displayName ?? menu.menuNameKo ?? '';

  return {
    id: menu.scanMenuId ?? String(menu.displayOrder ?? index),
    menuName: name,
    menuNameEn: menu.translatedName ?? menu.menuNameEn ?? name,
    menuNameLocalized: menu.translatedName ? { ko: name, [locale]: menu.translatedName } : undefined,
    menuNameAr: undefined,
    // message is dietary guidance, not a culinary description under the price.
    description: menu.description ?? '',
    descriptionLocalized: menu.translatedDescription ? { ko: menu.description ?? '', [locale]: menu.translatedDescription } : undefined,
    explainability: v2Message || legacyMessage || riskIngredients.length ? {
      decisionReason: v2Message ? localized(v2Message.reason || v2Message.verdict) : legacyMessage ? {
        ko: legacyMessage.ko || legacyMessage.en || legacyMessage.ar || '',
        en: legacyMessage.en ?? undefined, ar: legacyMessage.ar ?? undefined,
      } : undefined,
      ingredients: riskIngredients,
    } : undefined,
    price: menu.priceText ?? undefined,
    riskLevel: menu.riskLevel ?? 'unknown',
    staffQuestions: menu.staffQuestions ?? [],
    riskReasons: tags,
    riskReasonsEn: tags,
    riskReasonsAr: tags,
    isSpicy: Boolean(menu.isSpicy),
    is_spicy: Boolean(menu.isSpicy),
    isAlcohol,
    is_alcohol: isAlcohol,
  };
}
