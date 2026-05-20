/**
 * React context for Google Drive integration.
 * Provides auth state, sync status, and Drive operations.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { isSignedIn, signIn, signOut, onAuthChange } from '../services/googleAuth';
import { saveBackup, loadBackup, getBackupMetadata } from '../services/googleDrive';
import { usePortfolio } from './PortfolioContext';
import { getSyncMeta, setSyncMeta, clearSyncMeta } from '../services/storage';

export type ConflictInfo = {
  driveModifiedTime: string;
};

interface DriveContextValue {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  syncError: string | null;
  conflict: ConflictInfo | null;
  handleSignIn: () => Promise<void>;
  handleSignOut: () => void;
  handleRestore: () => Promise<boolean>;
  resolveConflict: (choice: 'local' | 'remote') => Promise<void>;
  triggerSync: () => void;
}

const DriveContext = createContext<DriveContextValue | null>(null);

export function DriveProvider({ children }: { children: ReactNode }) {
  const { portfolio, dispatch } = usePortfolio();
  const [isConnected, setIsConnected] = useState(isSignedIn());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const portfolioRef = useRef(portfolio);
  portfolioRef.current = portfolio;
  // Track whether initial reconciliation is complete (sync is gated until true)
  const reconciliationDone = useRef(false);

  // Listen to auth state changes
  useEffect(() => {
    return onAuthChange((signedIn) => setIsConnected(signedIn));
  }, []);

  // On initial load when connected, reconcile local vs Drive data
  useEffect(() => {
    if (!isConnected || reconciliationDone.current) return;

    const localIsEmpty =
      portfolio.accounts.length === 0 && portfolio.history.length === 0;

    (async () => {
      try {
        if (localIsEmpty) {
          // No local data — auto-restore from Drive
          reconciliationDone.current = true;
          setIsSyncing(true);
          const backup = await loadBackup();
          if (backup) {
            const data = JSON.parse(backup.content);
            dispatch({ type: 'RESTORE_FROM_BACKUP', payload: data });
            setSyncMeta({ lastSyncedDriveModifiedTime: backup.modifiedTime });
            setLastSyncTime(new Date().toLocaleTimeString());
          }
          setIsSyncing(false);
          return;
        }

        // Local data exists — check if Drive has newer data
        const driveMeta = await getBackupMetadata();
        if (!driveMeta) {
          // No Drive backup exists — safe to push
          reconciliationDone.current = true;
          return;
        }

        const syncMeta = getSyncMeta();
        if (
          syncMeta.lastSyncedDriveModifiedTime &&
          syncMeta.lastSyncedDriveModifiedTime === driveMeta.modifiedTime
        ) {
          // Drive hasn't changed since our last sync — safe to push
          reconciliationDone.current = true;
          return;
        }

        // Drive was modified externally (or first time connecting with existing data)
        setConflict({ driveModifiedTime: driveMeta.modifiedTime });
      } catch (err) {
        console.error('Drive reconciliation check failed:', err);
        // On error, allow sync to proceed (don't block indefinitely)
        reconciliationDone.current = true;
      }
    })();
  }, [isConnected, portfolio, dispatch]);

  // Resolve conflict: user picks local or remote
  const resolveConflict = useCallback(async (choice: 'local' | 'remote') => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      if (choice === 'remote') {
        const backup = await loadBackup();
        if (backup) {
          const data = JSON.parse(backup.content);
          dispatch({ type: 'RESTORE_FROM_BACKUP', payload: data });
          setSyncMeta({ lastSyncedDriveModifiedTime: backup.modifiedTime });
        }
      } else {
        // Push local data to Drive
        const data = JSON.stringify(portfolioRef.current);
        await saveBackup(data);
        // Re-fetch metadata to get server-set modifiedTime
        const meta = await getBackupMetadata();
        if (meta) setSyncMeta({ lastSyncedDriveModifiedTime: meta.modifiedTime });
      }
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Conflict resolution failed:', err);
      setSyncError('Sync failed');
    } finally {
      setIsSyncing(false);
      setConflict(null);
      reconciliationDone.current = true;
    }
  }, [dispatch]);

  // Debounced auto-sync when portfolio changes and user is signed in
  const debouncedSync = useCallback(() => {
    if (!isConnected) return;
    // Don't sync until reconciliation is complete
    if (!reconciliationDone.current) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(async () => {
      // Skip syncing empty portfolios to avoid overwriting backups
      const current = portfolioRef.current;
      if (current.accounts.length === 0 && current.history.length === 0) return;
      setIsSyncing(true);
      setSyncError(null);
      try {
        const data = JSON.stringify(current);
        await saveBackup(data);
        // Update sync metadata
        const meta = await getBackupMetadata();
        if (meta) setSyncMeta({ lastSyncedDriveModifiedTime: meta.modifiedTime });
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (err) {
        console.error('Drive sync failed:', err);
        setSyncError('Sync failed');
      } finally {
        setIsSyncing(false);
      }
    }, 3000); // 3 second debounce
  }, [isConnected]);

  useEffect(() => {
    if (isConnected) {
      debouncedSync();
    }
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [portfolio, isConnected, debouncedSync]);

  const handleSignIn = useCallback(async () => {
    try {
      await signIn();
    } catch (err) {
      console.error('Sign in failed:', err);
    }
  }, []);

  const handleSignOut = useCallback(() => {
    signOut();
    setLastSyncTime(null);
    setSyncError(null);
    setConflict(null);
    reconciliationDone.current = false;
    clearSyncMeta();
  }, []);

  const handleRestore = useCallback(async (): Promise<boolean> => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const backup = await loadBackup();
      if (!backup) {
        setSyncError('No backup found on Drive');
        return false;
      }
      const data = JSON.parse(backup.content);
      dispatch({ type: 'RESTORE_FROM_BACKUP', payload: data });
      setSyncMeta({ lastSyncedDriveModifiedTime: backup.modifiedTime });
      setLastSyncTime(new Date().toLocaleTimeString());
      return true;
    } catch (err) {
      console.error('Restore failed:', err);
      setSyncError('Restore failed');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [dispatch]);

  const triggerSync = useCallback(() => {
    debouncedSync();
  }, [debouncedSync]);

  return (
    <DriveContext.Provider value={{
      isConnected,
      isSyncing,
      lastSyncTime,
      syncError,
      conflict,
      handleSignIn,
      handleSignOut,
      handleRestore,
      resolveConflict,
      triggerSync,
    }}>
      {children}
    </DriveContext.Provider>
  );
}

export function useDrive(): DriveContextValue {
  const ctx = useContext(DriveContext);
  if (!ctx) throw new Error('useDrive must be used within DriveProvider');
  return ctx;
}
