const DB_NAME = 'humanizer-ai-v1';
const STORE = 'sourcePdf';
const KEY = 'current';

type StoredPdf = {
  filename: string;
  buffer: ArrayBuffer;
  updatedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function saveSourcePdf(file: File): Promise<void> {
  const buffer = await file.arrayBuffer();
  const db = await openDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const record: StoredPdf = { filename: file.name, buffer, updatedAt: Date.now() };
    tx.objectStore(STORE).put(record, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  db.close();
}

export async function loadSourcePdfMeta(): Promise<{ filename: string; updatedAt: number } | null> {
  const db = await openDb();
  const record = await new Promise<StoredPdf | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result as StoredPdf | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();

  if (!record) return null;
  return { filename: record.filename, updatedAt: record.updatedAt };
}

export async function loadSourcePdfBase64(): Promise<string | null> {
  const db = await openDb();
  const record = await new Promise<StoredPdf | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result as StoredPdf | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();

  if (!record?.buffer) return null;
  return arrayBufferToBase64(record.buffer);
}

export async function clearSourcePdf(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
