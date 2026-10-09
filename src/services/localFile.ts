/**
 * Local file storage.
 *
 * - Linked file (Chrome/Edge desktop): uses the File System Access API to keep a
 *   JSON file on disk in sync with the app. If the file lives in an iCloud Drive /
 *   Dropbox / OneDrive folder, the OS sync client carries it across machines.
 * - Import (all browsers): a plain file picker to load a previously exported backup.
 */
import type { PortfolioData } from '../types';
import { normalizePortfolio } from './storage';

// File System Access API pieces that aren't in lib.dom yet
type PermissionMode = { mode: 'read' | 'readwrite' };
interface PermissionedFileHandle extends FileSystemFileHandle {
  queryPermission(desc: PermissionMode): Promise<PermissionState>;
  requestPermission(desc: PermissionMode): Promise<PermissionState>;
}
interface FilePickerOptions {
  suggestedName?: string;
  id?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
}
declare global {
  interface Window {
    showSaveFilePicker?: (opts?: FilePickerOptions) => Promise<FileSystemFileHandle>;
    showOpenFilePicker?: (opts?: FilePickerOptions) => Promise<FileSystemFileHandle[]>;
  }
}

const PICKER_TYPES = [{ description: 'Zakatfolio data', accept: { 'application/json': ['.json'] } }];
const PICKER_ID = 'zakatfolio-data';

export function isFileLinkSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';
}

/** True if the user dismissed the picker (not an error worth reporting) */
export function isPickerAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

// ── Parsing ──────────────────────────────────────────────────

/** Parse and validate backup JSON. Throws a user-readable Error on bad input. */
export function parseBackup(text: string): PortfolioData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed) ||
    !('accounts' in parsed || 'history' in parsed || 'settings' in parsed)
  ) {
    throw new Error("This file doesn't look like a Zakatfolio backup.");
  }
  const obj = parsed as Record<string, unknown>;
  if (
    (obj.accounts !== undefined && !Array.isArray(obj.accounts)) ||
    (obj.history !== undefined && !Array.isArray(obj.history))
  ) {
    throw new Error('This backup file is malformed.');
  }
  return normalizePortfolio(obj);
}

/** Open a JSON file via a plain <input type="file"> (works in every browser). */
export function pickJsonFile(): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        resolve({ name: file.name, text: await file.text() });
      } catch (e) {
        reject(e);
      }
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

// ── Linked file handle (persisted in IndexedDB) ──────────────

const DB_NAME = 'zakatfolio';
const STORE = 'handles';
const HANDLE_KEY = 'linkedFile';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idb<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function getStoredHandle(): Promise<FileSystemFileHandle | null> {
  if (!isFileLinkSupported()) return null;
  try {
    return (await idb<FileSystemFileHandle | undefined>('readonly', (s) => s.get(HANDLE_KEY))) ?? null;
  } catch (e) {
    console.error('Failed to load linked file handle:', e);
    return null;
  }
}

async function storeHandle(handle: FileSystemFileHandle): Promise<void> {
  await idb('readwrite', (s) => s.put(handle, HANDLE_KEY));
}

export async function clearStoredHandle(): Promise<void> {
  try {
    await idb('readwrite', (s) => s.delete(HANDLE_KEY));
  } catch (e) {
    console.error('Failed to clear linked file handle:', e);
  }
}

/**
 * Check (and optionally request) read/write permission on a handle.
 * Requesting must happen inside a user gesture (e.g. a click handler).
 */
export async function hasPermission(handle: FileSystemFileHandle, request: boolean): Promise<boolean> {
  const h = handle as PermissionedFileHandle;
  const desc: PermissionMode = { mode: 'readwrite' };
  if ((await h.queryPermission(desc)) === 'granted') return true;
  if (!request) return false;
  return (await h.requestPermission(desc)) === 'granted';
}

/** Ask the user where to save a new data file, write the current data, and remember it. */
export async function createLinkedFile(data: PortfolioData): Promise<{ handle: FileSystemFileHandle; lastModified: number }> {
  const handle = await window.showSaveFilePicker!({
    suggestedName: 'zakatfolio-data.json',
    id: PICKER_ID,
    types: PICKER_TYPES,
  });
  const lastModified = await writeLinkedFile(handle, data);
  await storeHandle(handle);
  return { handle, lastModified };
}

/** Ask the user to pick an existing data file. Validates it before remembering it. */
export async function openLinkedFile(): Promise<{ handle: FileSystemFileHandle; data: PortfolioData; lastModified: number }> {
  const [handle] = await window.showOpenFilePicker!({ id: PICKER_ID, types: PICKER_TYPES });
  // Ask for write access up front so later auto-saves don't prompt
  if (!(await hasPermission(handle, true))) {
    throw new Error('Permission to edit the file was not granted.');
  }
  const { data, lastModified } = await readLinkedFile(handle);
  await storeHandle(handle);
  return { handle, data, lastModified };
}

export async function readLinkedFile(handle: FileSystemFileHandle): Promise<{ data: PortfolioData; lastModified: number }> {
  const file = await handle.getFile();
  return { data: parseBackup(await file.text()), lastModified: file.lastModified };
}

export async function getLinkedFileModified(handle: FileSystemFileHandle): Promise<number> {
  return (await handle.getFile()).lastModified;
}

/** Write data to the file and return its new lastModified time. */
export async function writeLinkedFile(handle: FileSystemFileHandle, data: PortfolioData): Promise<number> {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
  return getLinkedFileModified(handle);
}
