import { authFetch } from './authFetch';
import { ApiError } from './user';
import type { StoreSummary } from './store';

export interface SavedMenu {
  scanMenuId: string;
  scanId: string;
  displayName: string;
  translatedName: string | null;
  riskLevel: 'safe' | 'caution' | 'danger' | null;
  store: StoreSummary | null;
  savedAt: string;
}

async function parse<T>(response: Response): Promise<T> {
  const body = await response.text();
  if (!response.ok) throw new ApiError(response.status, body);
  const json = body ? JSON.parse(body) : null;
  return (json?.data ?? json) as T;
}

export async function getSavedMenus(): Promise<SavedMenu[]> {
  const response = await authFetch('/api/v1/saved-menus');
  const result = await parse<SavedMenu[]>(response);
  return Array.isArray(result) ? result : [];
}

export async function saveMenu(scanMenuId: string): Promise<SavedMenu> {
  const response = await authFetch('/api/v1/saved-menus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scanMenuId }),
  });
  return parse<SavedMenu>(response);
}

export async function deleteSavedMenu(scanMenuId: string): Promise<void> {
  const response = await authFetch(`/api/v1/saved-menus/${encodeURIComponent(scanMenuId)}`, { method: 'DELETE' });
  if (!response.ok) throw new ApiError(response.status, await response.text());
}
