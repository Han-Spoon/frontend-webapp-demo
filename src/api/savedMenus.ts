import { authFetch } from './authFetch';
import { ApiError } from './user';
import type { StoreSummary } from './store';
import type { MenuAnalysis } from '../app/App';
import { normalizeRiskLevel } from './riskLevel';

export interface SavedMenu {
  id: string;
  scanId?: string;
  displayOrder?: number;
  menuName: string;
  riskLevel: MenuAnalysis['riskLevel'];
  store: StoreSummary | null;
  savedAt: string;
}

async function parse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) throw new ApiError(response.status, text);
  const json = text ? JSON.parse(text) : {};
  return (json.data ?? json) as T;
}

const toSavedMenu = (item: SavedMenu): SavedMenu => ({ ...item, riskLevel: normalizeRiskLevel(item.riskLevel) });

export async function getSavedMenus(): Promise<SavedMenu[]> {
  const items = await parse<SavedMenu[]>(await authFetch('/api/v1/saved-menus'));
  return (Array.isArray(items) ? items : []).map(toSavedMenu);
}

export async function saveMenu(scanId: string, displayOrder: number): Promise<SavedMenu> {
  return toSavedMenu(await parse<SavedMenu>(await authFetch('/api/v1/saved-menus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scanId, displayOrder }),
  })));
}

export async function deleteSavedMenu(id: string): Promise<void> {
  await parse<unknown>(await authFetch(`/api/v1/saved-menus/${id}`, { method: 'DELETE' }));
}
