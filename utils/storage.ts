import type { HistoryItem, UploadResponse } from '@/types';
import type { ParsedDocument } from '@/types/document';

const HISTORY_KEY = 'humanizer.history.v1';
const LAST_KEY = 'humanizer.last.v1';
const DOCUMENT_KEY = 'humanizer.document.v1';

function stripImageData(doc: ParsedDocument): ParsedDocument {
  return {
    ...doc,
    blocks: doc.blocks.map((b) =>
      b.type === 'image' && b.image?.src?.startsWith('data:')
        ? { ...b, image: { ...b.image, src: undefined } }
        : b
    )
  };
}

export function saveParsedDocument(doc: ParsedDocument) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(DOCUMENT_KEY, JSON.stringify(doc));
  } catch {
    window.sessionStorage.setItem(DOCUMENT_KEY, JSON.stringify(stripImageData(doc)));
  }
}

export function loadParsedDocument(): ParsedDocument | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(DOCUMENT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ParsedDocument;
  } catch {
    return null;
  }
}

export function clearParsedDocument() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(DOCUMENT_KEY);
}

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

export function clearHistory() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(HISTORY_KEY);
}

export function clearLast() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LAST_KEY);
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
