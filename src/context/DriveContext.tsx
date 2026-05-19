/**
 * React context for Google Drive integration.
 * Provides auth state, sync status, and Drive operations.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { isSignedIn, signIn, signOut, onAuthChange } from '../services/googleAuth';
import { saveBackup, loadBackup } from '../services/googleDrive';
import { usePortfolio } from './PortfolioContext';

interface DriveContextValue {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  syncError: string | null;
  handleSignIn: () => Promise<void>;
  handleSignOut: () => void;
  handleRestore: () => Promise<boolean>;
  triggerSync: () => void;
}

const DriveContext = createContext<DriveContextValue | null>(null);

export function DriveProvider({ children }: { children: ReactNode }) {
  const { portfolio, dispatch } = usePortfolio();
  const [isConnected, setIsConnected] = useState(isSignedIn());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const portfolioRef = useRef(portfolio);
  portfolioRef.current = portfolio;

  // Listen to auth state changes
  useEffect(() => {
    return onAuthChange((signedIn) => setIsConnected(signedIn));
  }, []);

  // Debounced auto-sync when portfolio changes and user is signed in
  const debouncedSync = useCallback(() => {
    if (!isConnected) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(async () => {
      setIsSyncing(true);
      setSyncError(null);
      try {
        const data = JSON.stringify(portfolioRef.current);
        await saveBackup(data);
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
      handleSignIn,
      handleSignOut,
      handleRestore,
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
