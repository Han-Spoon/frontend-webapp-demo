import { authFetch } from './authFetch';
import { ApiError } from './user';

export interface UploadTicket {
  storageKey: string;
  uploadUrl: string;
  expiresAt: string;
  uploadHeaders?: Record<string, string>;
}

/** uploadHeaders 없는 구버전 백엔드용 */
function fallbackHeaders(contentType: string): Record<string, string> {
  return { 'Content-Type': contentType, 'If-None-Match': '*' };
}

async function parse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    console.error('Upload ticket request failed:', response.status, text);
    throw new ApiError(response.status, text);
  }

  const json = text ? JSON.parse(text) : {};
  return (json.data ?? json) as T;
}

/** S3 presigned PUT 티켓 발급 */
export async function getUploadTicket(contentType: string): Promise<UploadTicket> {
  const response = await authFetch('/api/v1/uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType }),
  });
  return parse<UploadTicket>(response);
}

/** 티켓 발급 → S3 업로드 → storageKey */
export async function uploadImage(file: File): Promise<{ key: string }> {
  const ticket = await getUploadTicket(file.type);

  const headers = ticket.uploadHeaders;
  if (!headers || Object.keys(headers).length === 0) {
    console.warn('uploadHeaders 누락 — 구버전으로 판단하고 폴백 헤더를 사용합니다.');
  }

  const putResponse = await fetch(ticket.uploadUrl, {
    method: 'PUT',
    headers: headers && Object.keys(headers).length > 0 ? headers : fallbackHeaders(file.type),
    body: file,
  });

  if (!putResponse.ok) {
    throw new Error(`S3 upload failed: ${putResponse.status}`);
  }

  return { key: ticket.storageKey };
}
