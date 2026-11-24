import { useState } from 'react';

/** 홈 가게 탐색 · 칼럼 속 식당(하드코딩 가게)의 저장. 이 기기에만, 같은 키를 같이 쓴다. */
const SAVED_KEY = 'han-spoon-home-saved';

function readSaved(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch { return []; }
}

export function useFixtureStoreSaves() {
  const [saved, setSaved] = useState<string[]>(readSaved);
  const toggleSave = (id: string) => {
    const next = saved.includes(id) ? saved.filter((item) => item !== id) : [...saved, id];
    setSaved(next);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch { /* 저장이 막혀 있으면 이번 화면에서만 */ }
    return !saved.includes(id);
  };
  return { isSaved: (id: string) => saved.includes(id), toggleSave };
}
