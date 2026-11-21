import { useEffect, useState } from 'react';
import type { ScanRecordResponse } from '../../api/scan';
import type { StoreSummary } from '../../api/store';
import type { MenuAnalysis, UserProfile } from '../types';

/** 결과 화면이 보는 한 건의 결과. 항상 통째로 바꿔 이전 결과의 값이 섞이지 않게 함. */
export interface ResultSession {
  menus: MenuAnalysis[];
  scanId?: string;
  /** 기기 저장 기록 id */
  recordId?: string;
  store: StoreSummary | null;
  record: ScanRecordResponse | null;
  /** 판정 기준 식단. undefined면 지금 식단. */
  profile?: UserProfile | null;
  /** 판정 당시 식단 모름(서버 기록의 dietSnapshot null) */
  profileUnknown: boolean;
  /** 방금 찍은 메뉴판 사진의 임시 주소(blob). 결과 화면을 떠나면 해제. */
  photoUrl: string | null;
}

export const EMPTY_RESULT: ResultSession = {
  menus: [],
  store: null,
  record: null,
  profileUnknown: false,
  photoUrl: null,
};

export function useResultSession() {
  const [result, setResult] = useState<ResultSession>(EMPTY_RESULT);
  const { photoUrl } = result;

  useEffect(() => () => {
    if (photoUrl?.startsWith('blob:')) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  return {
    result,
    showResult: setResult,
    clearPhoto: () => setResult((current) => (current.photoUrl ? { ...current, photoUrl: null } : current)),
  };
}
