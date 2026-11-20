import { authFetch } from './authFetch';
import { ApiError } from './user';

export type StaffAnswer = 'present' | 'absent' | 'unknown';
export interface StaffAnswerResponse {
  question: { questionId: string; answer: StaffAnswer; status: string; answeredAt: string | null };
  menu: { scanMenuId: string; riskLevel: 'safe' | 'caution' | 'danger'; staffAnswerStatus: 'none' | 'partial' | 'complete' };
  counts: { dangerCount: number; cautionCount: number; safeCount: number };
}

export async function saveStaffAnswer(scanId: string, questionId: string, answer: StaffAnswer): Promise<StaffAnswerResponse> {
  const response = await authFetch(`/api/v1/scans/${encodeURIComponent(scanId)}/staff-questions/${encodeURIComponent(questionId)}/answer`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer }),
  });
  const body = await response.text();
  if (!response.ok) throw new ApiError(response.status, body);
  const json = body ? JSON.parse(body) : {};
  return (json.data ?? json) as StaffAnswerResponse;
}
