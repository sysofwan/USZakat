import type { PortfolioData } from '../types';
import { DEFAULT_PORTFOLIO } from '../types';

const STORAGE_KEY = 'zakatfolio_data';

export function loadPortfolio(): PortfolioData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizePortfolio(parsed);
    }
  } catch (e) {
    console.error('Failed to load portfolio data:', e);
  }
  return { ...DEFAULT_PORTFOLIO, accounts: [], history: [] };
}

/** Merge parsed data with defaults to handle schema migrations gracefully */
export function normalizePortfolio(parsed: Record<string, unknown>): PortfolioData {
  return {
    settings: { ...DEFAULT_PORTFOLIO.settings, ...(parsed.settings as object ?? {}) },
    accounts: (parsed.accounts as PortfolioData['accounts']) ?? [],
    history: (parsed.history as PortfolioData['history']) ?? [],
    stockSymbols: (parsed.stockSymbols as PortfolioData['stockSymbols']) ?? [],
    draftReview: (parsed.draftReview as PortfolioData['draftReview']) ?? undefined,
  };
}

export function savePortfolio(data: PortfolioData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save portfolio data:', e);
  }
}

export function exportPortfolio(data: PortfolioData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `us-zakat-calculator-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  setBackupMeta({ ...getBackupMeta(), lastExportHash: hashPortfolio(data) });
}

export function hasExistingData(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

// ── Sync metadata ────────────────────────────────────────────

const SYNC_META_KEY = 'zakatfolio_syncMeta';

interface SyncMeta {
  lastSyncedDriveModifiedTime: string | null;
}

export function getSyncMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load sync meta:', e);
  }
  return { lastSyncedDriveModifiedTime: null };
}

export function setSyncMeta(meta: SyncMeta): void {
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
  } catch (e) {
    console.error('Failed to save sync meta:', e);
  }
}

export function clearSyncMeta(): void {
  localStorage.removeItem(SYNC_META_KEY);
}

// ── Serialization helpers ────────────────────────────────────

export function serializePortfolio(data: PortfolioData): string {
  return JSON.stringify(data, null, 2);
}

/** Cheap 32-bit FNV-1a hash, used only to tell whether data changed. */
export function hashText(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

/** Hash of the saved data, ignoring an in-progress draft review */
export function hashPortfolio(data: PortfolioData): string {
  return hashText(serializePortfolio({ ...data, draftReview: undefined }));
}

/** e.g. "3 accounts, 1 review" */
export function describePortfolio(data: PortfolioData): string {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  return `${plural(data.accounts.length, 'account')}, ${plural(data.history.length, 'review')}`;
}

export function isPortfolioEmpty(data: PortfolioData): boolean {
  return data.accounts.length === 0 && data.history.length === 0 && !data.draftReview;
}

// ── Backup reminder metadata ─────────────────────────────────

const BACKUP_META_KEY = 'zakatfolio_backupMeta';

interface BackupMeta {
  /** hashPortfolio() of the data at the last JSON export */
  lastExportHash: string | null;
  /** ISO timestamp; reminder hidden until then */
  reminderSnoozedUntil: string | null;
}

export function getBackupMeta(): BackupMeta {
  try {
    const raw = localStorage.getItem(BACKUP_META_KEY);
    if (raw) return { lastExportHash: null, reminderSnoozedUntil: null, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed to load backup meta:', e);
  }
  return { lastExportHash: null, reminderSnoozedUntil: null };
}

export function setBackupMeta(meta: BackupMeta): void {
  try {
    localStorage.setItem(BACKUP_META_KEY, JSON.stringify(meta));
  } catch (e) {
    console.error('Failed to save backup meta:', e);
  }
}

// ── Linked file sync metadata ────────────────────────────────

const FILE_META_KEY = 'zakatfolio_fileMeta';

export interface FileMeta {
  /** File lastModified (ms) right after our last read/write */
  lastModified: number | null;
  /** hashText() of the serialized data at our last read/write */
  hash: string | null;
}

export function getFileMeta(): FileMeta {
  try {
    const raw = localStorage.getItem(FILE_META_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load file meta:', e);
  }
  return { lastModified: null, hash: null };
}

export function setFileMeta(meta: FileMeta): void {
  try {
    localStorage.setItem(FILE_META_KEY, JSON.stringify(meta));
  } catch (e) {
    console.error('Failed to save file meta:', e);
  }
}

export function clearFileMeta(): void {
  localStorage.removeItem(FILE_META_KEY);
}

/** Ask the browser not to evict our storage under pressure. Best effort. */
export function requestPersistentStorage(): void {
  navigator.storage?.persist?.().catch(() => {});
}
