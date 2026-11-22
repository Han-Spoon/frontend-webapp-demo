import { authFetch } from './authFetch';
import { ApiError } from './user';
import type { StoreSummary } from './store';
import type { MenuAnalysis } from '../app/types';
import { normalizeRiskLevel } from './riskLevel';

/** 화면용 찜 메뉴. 서버 기록의 id는 명세 V2 scanMenuId. */
export interface SavedMenu {
  id: string;
  scanId?: string;
  /** 데모 찜 전용 */
  displayOrder?: number;
  menuName: string;
  translatedName?: string | null;
  riskLevel: MenuAnalysis['riskLevel'];
  store: StoreSummary | null;
  savedAt: string;
}

interface WireSavedMenu {
  scanMenuId: string;
  scanId: string;
  displayName: string;
  translatedName: string | null;
  riskLevel: string | null;
  store: StoreSummary | null;
  savedAt: string;
}

async function parse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) throw new ApiError(response.status, text);
  const json = text ? JSON.parse(text) : null;
  return (json?.data ?? json) as T;
}

// 판정 값은 normalizeRiskLevel로만 변환(null·모르는 값은 '확인 필요').
const fromWire = (item: WireSavedMenu): SavedMenu => ({
  id: item.scanMenuId,
  scanId: item.scanId,
  menuName: item.displayName,
  translatedName: item.translatedName,
  riskLevel: normalizeRiskLevel(item.riskLevel),
  store: item.store,
  savedAt: item.savedAt,
});

export async function getSavedMenus(): Promise<SavedMenu[]> {
  const items = await parse<WireSavedMenu[] | null>(await authFetch('/api/v1/saved-menus'));
  return (Array.isArray(items) ? items : []).map(fromWire);
}

export async function saveMenu(scanMenuId: string): Promise<SavedMenu> {
  return fromWire(await parse<WireSavedMenu>(await authFetch('/api/v1/saved-menus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scanMenuId }),
  })));
}

export async function deleteSavedMenu(scanMenuId: string): Promise<void> {
  await parse<unknown>(await authFetch(`/api/v1/saved-menus/${encodeURIComponent(scanMenuId)}`, { method: 'DELETE' }));
}
