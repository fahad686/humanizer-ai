import type { HistoryItem } from '@/types';

const HISTORY_KEY = 'humanizer.history.v1';
const LAST_KEY = 'humanizer.last.v1';

export function loadHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as HistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(items: HistoryItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 50)));
}

export function pushHistory(item: HistoryItem) {
  const existing = loadHistory();
  saveHistory([item, ...existing.filter((x) => x.id !== item.id)]);
}

export function saveLast(item: Omit<HistoryItem, 'id' | 'createdAt'>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LAST_KEY, JSON.stringify(item));
}

export function loadLast(): Omit<HistoryItem, 'id' | 'createdAt'> | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(LAST_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Omit<HistoryItem, 'id' | 'createdAt'>;
  } catch {
    return null;
  }
}
