import { useSyncExternalStore } from 'react';

/**
 * 지도 라벨 언어. 앱 언어와 별개인 기기 표시 설정(localStorage, 프로필 저장 안 함).
 * 네이버 지도 v3는 ko/en/zh/ja만 지원. 한국 지명을 읽는 화면이라 한국어 기본.
 */

export const MAP_LANGUAGES = ['ko', 'en', 'zh', 'ja'] as const;
export type MapLanguage = (typeof MAP_LANGUAGES)[number];

export const MAP_LANGUAGE_DEFAULT: MapLanguage = 'ko';

/** 라벨은 각 언어 원어(앱 언어를 몰라도 고를 수 있게) */
export const MAP_LANGUAGE_OPTIONS: Array<{ value: MapLanguage; label: string }> = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
];

const STORAGE_KEY = 'han-spoon-map-language';

function isMapLanguage(value: unknown): value is MapLanguage {
  return typeof value === 'string' && (MAP_LANGUAGES as readonly string[]).includes(value);
}

const listeners = new Set<() => void>();
let snapshot: MapLanguage | null = null;

function read(): MapLanguage {
  if (snapshot !== null) return snapshot;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    snapshot = isMapLanguage(saved) ? saved : MAP_LANGUAGE_DEFAULT;
  } catch {
    // 시크릿 모드 등 접근 차단 시 기본값.
    snapshot = MAP_LANGUAGE_DEFAULT;
  }
  return snapshot;
}

export function setMapLanguage(value: MapLanguage) {
  if (read() === value) return;
  snapshot = value;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* 저장 실패해도 이번 세션에는 적용 */
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 설정 화면과 지도가 같은 값 구독(외부 스토어) */
export function useMapLanguage(): MapLanguage {
  return useSyncExternalStore(subscribe, read, () => MAP_LANGUAGE_DEFAULT);
}
