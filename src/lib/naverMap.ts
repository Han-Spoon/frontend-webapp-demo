import type { MapLanguage } from './mapLanguage';

/**
 * 네이버 지도 v3 SDK 로더. 언어는 사용자 설정(`mapLanguage`).
 * 런타임 언어 변경 API가 없어 언어(스크립트 URL `language`)가 바뀌면 스크립트·`window.naver` 제거 뒤 재로드.
 */

const SCRIPT_ID = 'naver-maps-sdk';

let current: { language: MapLanguage; promise: Promise<void> } | null = null;

/**
 * 인증 실패 감지. 키 오류·Web 서비스 URL 미등록이어도 스크립트는 정상 로드되고 네이버가 컨테이너에 에러 화면을 그림.
 * script.onerror로 못 잡아 v3 전역 훅으로 받아 호출부 폴백.
 */
const authFailureHandlers = new Set<() => void>();

export function onNaverMapsAuthFailure(handler: () => void): () => void {
  authFailureHandlers.add(handler);
  return () => {
    authFailureHandlers.delete(handler);
  };
}

(window as { navermap_authFailure?: () => void }).navermap_authFailure = () => {
  authFailureHandlers.forEach((handler) => handler());
};

function unload() {
  document.getElementById(SCRIPT_ID)?.remove();
  delete (window as { naver?: unknown }).naver;
  current = null;
}

export function loadNaverMaps(language: MapLanguage): Promise<void> {
  // 같은 언어로 로드됨·로드 중이면 그 Promise 재사용(StrictMode 이중 마운트 중복 방지).
  if (current?.language === language) return current.promise;
  if (current) unload();

  const keyId = import.meta.env.VITE_NAVER_MAP_KEY_ID;
  if (!keyId) {
    return Promise.reject(new Error('VITE_NAVER_MAP_KEY_ID 가 설정되지 않았습니다.'));
  }

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    // 2024년 이후 형식(구 ncpClientId는 동작 안 함).
    script.src =
      'https://oapi.map.naver.com/openapi/v3/maps.js' +
      `?ncpKeyId=${encodeURIComponent(keyId)}&language=${language}`;
    script.onload = () => resolve();
    script.onerror = () => {
      unload();
      reject(new Error('네이버 지도 SDK 를 불러오지 못했습니다.'));
    };
    document.head.appendChild(script);
  });

  current = { language, promise };
  return promise;
}
