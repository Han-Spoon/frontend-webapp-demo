import { authFetch } from './authFetch';

export type DocumentId = 'service' | 'privacy' | 'sensitive' | 'marketing';
export interface LegalDocument {
  id: DocumentId;
  title: string;
  required: boolean;
  sections: { heading: string; body: string }[];
}
export interface LegalDocumentBundle {
  version: string;
  effectiveDate: string;
  documents: LegalDocument[];
}
export interface ConsentStatus {
  version: string;
  decisions: Partial<Record<DocumentId, boolean>>;
  hasRequiredConsents: boolean;
  guardianManaged: boolean;
  guardianApprovalRequired: boolean;
}

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`약관 API 요청 실패 (${response.status})`);
  const json = await response.json();
  return (json.data ?? json) as T;
}

export async function getLegalDocuments(): Promise<LegalDocumentBundle> {
  return parse<LegalDocumentBundle>(await fetch('/api/v1/consents/documents'));
}

export async function getConsentStatus(): Promise<ConsentStatus> {
  return parse<ConsentStatus>(await authFetch('/api/v1/consents/me'));
}

export async function saveConsent(version: string, decisions: Record<DocumentId, boolean>): Promise<ConsentStatus> {
  return parse<ConsentStatus>(await authFetch('/api/v1/consents/me', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version, decisions }),
  }));
}
