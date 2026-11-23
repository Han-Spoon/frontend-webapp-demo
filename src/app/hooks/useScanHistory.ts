import { useRef, useState } from 'react';
import { deleteScan, getScanHistoryPage, updateScanTitle } from '../../api/scan';
import type { VisitRecord } from '../demo/records';
import { useDemoValue } from '../demo/storage';
import { LANGUAGE_LOCALES, type Language } from '../locales';
import type { HistoryItem } from '../types';

const formatHistoryTitle = (language: Language, date: Date) => {
  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

/** 스캔 기록 목록: 서버 기록 + 기기 저장 기록(같은 스캔은 기기 기록 우선). 시연은 기기 기록만. */
export function useScanHistory(language: Language, demoMode: boolean) {
  const [serverHistory, setServerHistory] = useState<HistoryItem[]>([]);
  // 서버 기록 목록 불러오기 실패. 빈 목록과 구분해 다시 시도 표시.
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const nextPage = useRef(0);
  const loadingRef = useRef(false);
  const [localRecords, setLocalRecords] = useDemoValue<VisitRecord[]>('records', []);
  const history = [...localRecords, ...serverHistory.filter(item => !localRecords.some(record => record.sourceScanId === item.id))];

  const loadHistory = async (append = false) => {
    // 시연은 로그인 토큰 없음 → 서버 조회 생략
    if (demoMode || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      setLoadFailed(false);
      const page = append ? nextPage.current : 0;
      const response = await getScanHistoryPage(page);
      const mapped = (response.items ?? []).map((item) => ({
          id: item.scanId,
          title:
            item.title ??
            formatHistoryTitle(language, item.scannedAt ? new Date(item.scannedAt) : new Date()),
          date: item.scannedAt ?? new Date().toISOString(),
          menuCount: item.menuCount ?? 0,
          dangerCount: item.dangerCount ?? null,
          cautionCount: item.cautionCount ?? null,
          menus: [],
          store: item.store ?? null,
        }));
      setServerHistory(previous => append ? [...previous, ...mapped.filter(item => !previous.some(old => old.id === item.id))] : mapped);
      nextPage.current = page + 1;
      setHasMore(typeof response.totalPages === 'number' ? page + 1 < response.totalPages : mapped.length === 20);
    } catch (error) {
      console.warn('Unable to fetch scan history:', error);
      setLoadFailed(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  const deleteHistory = async (id: string) => {
    if (localRecords.some(record => record.id === id)) { setLocalRecords(localRecords.filter(record => record.id !== id)); return; }
    try {
      await deleteScan(id);
      setServerHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Delete scan failed:', error);
      throw error;
    }
  };

  const renameHistory = async (id: string, title: string) => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle || normalizedTitle.length > 30) return;
    if (localRecords.some(record => record.id === id)) { setLocalRecords(localRecords.map(record => record.id === id ? { ...record, title: normalizedTitle } : record)); return; }
    try {
      await updateScanTitle(id, normalizedTitle);
      setServerHistory((prev) => prev.map((item) => (item.id === id ? { ...item, title: normalizedTitle } : item)));
    } catch (error) {
      console.error('Rename scan failed:', error);
      throw error;
    }
  };

  return {
    history,
    localRecords,
    loadFailed,
    loading,
    hasMore,
    loadMore: () => loadHistory(true),
    loadHistory,
    deleteHistory,
    renameHistory,
    clearServerHistory: () => {
      setServerHistory([]);
      nextPage.current = 0;
      setHasMore(false);
      setLoadFailed(false);
    },
  };
}

export type ScanHistory = ReturnType<typeof useScanHistory>;
