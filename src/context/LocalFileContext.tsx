/**
 * React context for the linked local data file.
 * Keeps a JSON file on disk in sync with the portfolio (Chrome/Edge desktop only).
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { usePortfolio } from './PortfolioContext';
import {
  clearStoredHandle,
  createLinkedFile,
  getLinkedFileModified,
  getStoredHandle,
  hasPermission,
  isFileLinkSupported,
  isPickerAbort,
  openLinkedFile,
  readLinkedFile,
  writeLinkedFile,
} from '../services/localFile';
import {
  clearFileMeta,
  getFileMeta,
  hashText,
  isPortfolioEmpty,
  serializePortfolio,
  setFileMeta,
} from '../services/storage';
import type { PortfolioData } from '../types';

export type FileStatus = 'unsupported' | 'loading' | 'none' | 'needs-permission' | 'linked';

export type FileConflictInfo = {
  fileModified: number;
  fileData: PortfolioData;
};

interface LocalFileContextValue {
  status: FileStatus;
  fileName: string | null;
  isSaving: boolean;
  lastSaved: string | null;
  error: string | null;
  conflict: FileConflictInfo | null;
  linkNewFile: () => Promise<void>;
  linkExistingFile: () => Promise<void>;
  reconnect: () => Promise<void>;
  unlink: () => Promise<void>;
  resolveConflict: (choice: 'local' | 'file') => Promise<void>;
}

const LocalFileContext = createContext<LocalFileContextValue | null>(null);

export function LocalFileProvider({ children }: { children: ReactNode }) {
  const { portfolio, dispatch } = usePortfolio();
  const [status, setStatus] = useState<FileStatus>(isFileLinkSupported() ? 'loading' : 'unsupported');
  const [handle, setHandle] = useState<FileSystemFileHandle | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<FileConflictInfo | null>(null);
  const portfolioRef = useRef(portfolio);
  // Declared first so later effects in the same commit see the latest data
  useEffect(() => {
    portfolioRef.current = portfolio;
  }, [portfolio]);
  // Auto-save is gated until the file and local data have been reconciled
  const reconciled = useRef(false);
  const busy = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markSynced = useCallback((lastModified: number, text: string) => {
    setFileMeta({ lastModified, hash: hashText(text) });
    setLastSaved(new Date().toLocaleTimeString());
    setError(null);
  }, []);

  const handleFileError = useCallback((err: unknown, fallback: string) => {
    console.error(fallback, err);
    if (err instanceof DOMException && err.name === 'NotAllowedError') {
      reconciled.current = false;
      setStatus('needs-permission');
      return;
    }
    if (err instanceof DOMException && err.name === 'NotFoundError') {
      setError('Data file was moved or deleted');
      return;
    }
    setError(err instanceof Error && !(err instanceof DOMException) ? err.message : fallback);
  }, []);

  /**
   * Compare the file with local data and decide which way to sync:
   * - identical → nothing to do
   * - local empty → load file
   * - only local changed since last sync → write file
   * - only file changed (e.g. synced from another computer) → load file
   * - both changed → ask the user
   */
  const reconcile = useCallback(async (h: FileSystemFileHandle) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const { data: fileData, lastModified } = await readLinkedFile(h);
      const fileText = serializePortfolio(fileData);
      const localText = serializePortfolio(portfolioRef.current);
      const meta = getFileMeta();

      if (fileText === localText) {
        markSynced(lastModified, localText);
      } else if (isPortfolioEmpty(portfolioRef.current)) {
        dispatch({ type: 'RESTORE_FROM_BACKUP', payload: fileData });
        markSynced(lastModified, fileText);
      } else {
        const fileChanged = meta.lastModified !== lastModified;
        const localChanged = meta.hash !== hashText(localText);
        if (!fileChanged) {
          setIsSaving(true);
          markSynced(await writeLinkedFile(h, portfolioRef.current), localText);
        } else if (!localChanged) {
          dispatch({ type: 'RESTORE_FROM_BACKUP', payload: fileData });
          markSynced(lastModified, fileText);
        } else {
          setConflict({ fileModified: lastModified, fileData });
          return; // stay un-reconciled until the user chooses
        }
      }
      reconciled.current = true;
    } catch (err) {
      handleFileError(err, 'Could not read data file');
    } finally {
      busy.current = false;
      setIsSaving(false);
    }
  }, [dispatch, handleFileError, markSynced]);

  const activate = useCallback(async (h: FileSystemFileHandle) => {
    setHandle(h);
    setStatus('linked');
    await reconcile(h);
  }, [reconcile]);

  // On load, restore the remembered file. Permission usually needs a click to re-grant.
  useEffect(() => {
    if (!isFileLinkSupported()) return;
    (async () => {
      const stored = await getStoredHandle();
      if (!stored) {
        setStatus('none');
        return;
      }
      setHandle(stored);
      if (await hasPermission(stored, false)) {
        await activate(stored);
      } else {
        setStatus('needs-permission');
      }
    })().catch((err) => {
      console.error('Failed to restore linked file:', err);
      setStatus('none');
    });
  }, [activate]);

  // Debounced auto-save to the file on every change
  useEffect(() => {
    if (status !== 'linked' || !handle || !reconciled.current) return;
    const text = serializePortfolio(portfolio);
    if (getFileMeta().hash === hashText(text)) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (busy.current) return;
      try {
        // If something else changed the file, reconcile instead of overwriting it
        if ((await getLinkedFileModified(handle)) !== getFileMeta().lastModified) {
          await reconcile(handle);
          return;
        }
        busy.current = true;
        setIsSaving(true);
        const current = portfolioRef.current;
        markSynced(await writeLinkedFile(handle, current), serializePortfolio(current));
      } catch (err) {
        handleFileError(err, 'Could not save data file');
      } finally {
        busy.current = false;
        setIsSaving(false);
      }
    }, 1000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [portfolio, status, handle, reconcile, handleFileError, markSynced]);

  // When the tab regains focus, pick up changes synced in from another computer
  useEffect(() => {
    if (status !== 'linked' || !handle) return;
    const check = async () => {
      if (document.visibilityState !== 'visible' || busy.current || conflict) return;
      try {
        if ((await getLinkedFileModified(handle)) !== getFileMeta().lastModified) {
          await reconcile(handle);
        }
      } catch (err) {
        handleFileError(err, 'Could not read data file');
      }
    };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [status, handle, conflict, reconcile, handleFileError]);

  const linkNewFile = useCallback(async () => {
    try {
      const { handle: h, lastModified } = await createLinkedFile(portfolioRef.current);
      setConflict(null);
      markSynced(lastModified, serializePortfolio(portfolioRef.current));
      setHandle(h);
      setStatus('linked');
      reconciled.current = true;
    } catch (err) {
      if (!isPickerAbort(err)) handleFileError(err, 'Could not create data file');
    }
  }, [handleFileError, markSynced]);

  const linkExistingFile = useCallback(async () => {
    try {
      const { handle: h } = await openLinkedFile();
      // A different file: forget sync state from any previous file
      clearFileMeta();
      setConflict(null);
      reconciled.current = false;
      await activate(h);
    } catch (err) {
      if (!isPickerAbort(err)) handleFileError(err, 'Could not open data file');
    }
  }, [activate, handleFileError]);

  const reconnect = useCallback(async () => {
    if (!handle) return;
    try {
      if (await hasPermission(handle, true)) {
        await activate(handle);
      }
    } catch (err) {
      handleFileError(err, 'Could not reconnect data file');
    }
  }, [handle, activate, handleFileError]);

  const unlink = useCallback(async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    await clearStoredHandle();
    clearFileMeta();
    reconciled.current = false;
    setHandle(null);
    setConflict(null);
    setError(null);
    setLastSaved(null);
    setStatus('none');
  }, []);

  const resolveConflict = useCallback(async (choice: 'local' | 'file') => {
    if (!handle || !conflict) return;
    busy.current = true;
    setIsSaving(true);
    try {
      if (choice === 'file') {
        dispatch({ type: 'RESTORE_FROM_BACKUP', payload: conflict.fileData });
        markSynced(conflict.fileModified, serializePortfolio(conflict.fileData));
      } else {
        const current = portfolioRef.current;
        markSynced(await writeLinkedFile(handle, current), serializePortfolio(current));
      }
      reconciled.current = true;
    } catch (err) {
      handleFileError(err, 'Could not save data file');
    } finally {
      busy.current = false;
      setIsSaving(false);
      setConflict(null);
    }
  }, [handle, conflict, dispatch, handleFileError, markSynced]);

  return (
    <LocalFileContext.Provider value={{
      status,
      fileName: handle?.name ?? null,
      isSaving,
      lastSaved,
      error,
      conflict,
      linkNewFile,
      linkExistingFile,
      reconnect,
      unlink,
      resolveConflict,
    }}>
      {children}
    </LocalFileContext.Provider>
  );
}

export function useLocalFile(): LocalFileContextValue {
  const ctx = useContext(LocalFileContext);
  if (!ctx) throw new Error('useLocalFile must be used within LocalFileProvider');
  return ctx;
}
