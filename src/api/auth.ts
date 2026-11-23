import type { BackendLanguage } from '../app/locales';

export type LanguageCode = BackendLanguage;

export interface AuthUser {
  id: string;
  email: string;
  nickname: string;
  languageCode: LanguageCode;
}

export interface AuthData {
  accessToken: string;
  refreshToken?: string;
  hasProfile?: boolean;
  user?: AuthUser;
}

export function saveAuthData(data: AuthData) {
  localStorage.setItem('accessToken', data.accessToken);

  if (data.refreshToken) {
    localStorage.setItem('refreshToken', data.refreshToken);
  }

  if (data.user) {
    localStorage.setItem('user', JSON.stringify(data.user));
  }
}

export function clearAuthData() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

export function getAccessToken() {
  return localStorage.getItem('accessToken');
}

export function getRefreshToken() {
  return localStorage.getItem('refreshToken');
}

export async function googleLogin(idToken: string): Promise<AuthData> {
  const response = await fetch('/api/v1/auth/google', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ idToken }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error('Google login failed:', response.status, responseText);
    throw new Error(`Google 로그인 실패: ${response.status}`);
  }

  const json = responseText ? JSON.parse(responseText) : {};
  const data = json.data ?? json;

  saveAuthData(data);

  return data;
}

/** 토큰 재발급 실패. */
export class TokenRefreshError extends Error {
  readonly status: number;
  readonly body: string;
  readonly sessionExpired: boolean;

  constructor(status: number, body = '') {
    super(`토큰 재발급 실패: ${status}`);
    this.name = 'TokenRefreshError';
    this.status = status;
    this.body = body;
    this.sessionExpired = status === 401;
  }
}

// refresh 토큰 회전 방식이라 동시 401마다 refresh하면 두 번째부터 실패(세션 깨짐).
// 진행 중 refresh Promise 공유(single-flight).
let inFlightRefresh: Promise<AuthData> | null = null;

async function doRefresh(): Promise<AuthData> {
  const refreshToken = getRefreshToken();

  const response = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',

    // 쿠키 방식이면 body 불필요, localStorage 방식만 body로 전달.
    body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error('Token refresh failed:', response.status, responseText);
    // 401: refresh 토큰 무효 → 세션 폐기. 5xx·프록시 오류: 일시 오류라 세션 유지.
    if (response.status === 401) {
      clearAuthData();
    }
    throw new TokenRefreshError(response.status, responseText);
  }

  const json = responseText ? JSON.parse(responseText) : {};
  const data = json.data ?? json;

  saveAuthData(data);

  return data;
}

export function refreshAccessToken(): Promise<AuthData> {
  if (!inFlightRefresh) {
    inFlightRefresh = doRefresh().finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

export async function logout() {
  const accessToken = getAccessToken();

  const response = await fetch('/api/v1/auth/logout', {
    method: 'POST',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    credentials: 'include',
  });

  const responseText = await response.text();

  // 서버 요청 실패와 무관하게 프론트 토큰 제거.
  clearAuthData();

  if (!response.ok) {
    console.error('Logout failed:', response.status, responseText);
    throw new Error(`로그아웃 요청 실패: ${response.status}`);
  }
}
