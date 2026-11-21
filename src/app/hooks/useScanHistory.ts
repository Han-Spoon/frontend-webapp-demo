import { useState } from 'react';
import { deleteScan, getScanHistory, updateScanTitle } from '../../api/scan';
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

/** 스캔 기록 목록: 서버 기록 + 기기 저장 기록(같은 스캔은 기기 기록 우선) */
export function useScanHistory(language: Language) {
  const [serverHistory, setServerHistory] = useState<HistoryItem[]>([]);
  // 서버 기록 목록 불러오기 실패. 빈 목록과 구분해 다시 시도 표시.
  const [loadFailed, setLoadFailed] = useState(false);
  const [localRecords, setLocalRecords] = useDemoValue<VisitRecord[]>('records', []);
  const history = [...localRecords, ...serverHistory.filter(item => !localRecords.some(record => record.sourceScanId === item.id))];

  const loadHistory = async () => {
    try {
      setLoadFailed(false);
      const items = await getScanHistory();
      setServerHistory(
        items.map((item) => ({
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
        })),
      );
    } catch (error) {
      console.warn('Unable to fetch scan history:', error);
      setLoadFailed(true);
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
    loadHistory,
    deleteHistory,
    renameHistory,
    clearServerHistory: () => setServerHistory([]),
  };
}

export type ScanHistory = ReturnType<typeof useScanHistory>;
