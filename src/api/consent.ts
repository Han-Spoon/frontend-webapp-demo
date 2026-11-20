import { authFetch } from './authFetch';
import { ApiError } from './user';

export type ConsentId = 'service' | 'privacy' | 'sensitive' | 'marketing';
export type ConsentDecisions = Record<ConsentId, boolean>;
export interface LegalDocument { id: ConsentId; title: string; required: boolean; sections: Array<{ heading: string; body: string }> }
export interface LegalDocuments { version: string; effectiveDate: string; documents: LegalDocument[] }
export interface ConsentStatus { version: string; decisions: Partial<ConsentDecisions>; hasRequiredConsents: boolean }

async function parse<T>(response: Response): Promise<T> {
  const body = await response.text();
  if (!response.ok) throw new ApiError(response.status, body);
  const json = body ? JSON.parse(body) : {};
  return (json.data ?? json) as T;
}

export async function getLegalDocuments(): Promise<LegalDocuments> {
  return parse<LegalDocuments>(await fetch('/api/v1/consents/documents'));
}

export async function getConsentStatus(): Promise<ConsentStatus> {
  return parse<ConsentStatus>(await authFetch('/api/v1/consents/me'));
}

export async function saveConsent(version: string, decisions: ConsentDecisions): Promise<ConsentStatus> {
  return parse<ConsentStatus>(await authFetch('/api/v1/consents/me', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version, decisions }),
  }));
}
