import { authFetch } from './authFetch';
import { ApiError } from './user';

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
  /** 명세 V2 응답에는 없다. 오지 않으면 보호자 동선은 열리지 않는다. */
  guardianManaged?: boolean;
  guardianApprovalRequired?: boolean;
}

async function parse<T>(response: Response): Promise<T> {
  const body = await response.text();
  if (!response.ok) throw new ApiError(response.status, body);
  const json = body ? JSON.parse(body) : {};
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
