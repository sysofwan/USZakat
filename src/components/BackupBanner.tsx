import { useMemo, useState } from 'react';
import { Alert, Button } from '@mui/material';
import { usePortfolio } from '../context/PortfolioContext';
import { useDrive } from '../context/DriveContext';
import { useLocalFile } from '../context/LocalFileContext';
import { exportPortfolio, getBackupMeta, hashPortfolio, setBackupMeta } from '../services/storage';

const SNOOZE_DAYS = 14;

/**
 * Prompts the user to reconnect their data file, or — when data lives only in
 * this browser — to download a backup after it changes.
 */
export default function BackupBanner() {
  const { portfolio } = usePortfolio();
  const { isConnected: driveConnected } = useDrive();
  const { status, fileName, reconnect } = useLocalFile();
  const [, rerender] = useState(0);
  const dataHash = useMemo(() => hashPortfolio(portfolio), [portfolio]);
  // Read fresh each render: exports from other pages update it too
  const meta = getBackupMeta();

  if (status === 'needs-permission') {
    return (
      <Alert
        severity="warning"
        sx={{ mb: 3 }}
        action={<Button color="inherit" size="small" onClick={reconnect}>Reconnect</Button>}
      >
        Changes aren't being saved to <strong>{fileName}</strong>. Reconnect to resume saving.
      </Alert>
    );
  }

  const protectedElsewhere = status === 'linked' || driveConnected;
  // Only nag once there's a completed review worth losing
  const hasReviews = portfolio.history.length > 0;
  const snoozed = meta.reminderSnoozedUntil !== null && new Date(meta.reminderSnoozedUntil) > new Date();
  if (
    protectedElsewhere ||
    !hasReviews ||
    snoozed ||
    meta.lastExportHash === dataHash
  ) {
    return null;
  }

  const handleExport = () => {
    exportPortfolio(portfolio);
    rerender((n) => n + 1);
  };

  const handleSnooze = () => {
    const until = new Date(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    setBackupMeta({ ...meta, reminderSnoozedUntil: until });
    rerender((n) => n + 1);
  };

  return (
    <Alert
      severity="info"
      sx={{ mb: 3 }}
      action={
        <>
          <Button color="inherit" size="small" onClick={handleSnooze}>Later</Button>
          <Button color="inherit" size="small" variant="outlined" onClick={handleExport} sx={{ whiteSpace: 'nowrap' }}>
            Download Backup
          </Button>
        </>
      }
    >
      Your data is saved only in this browser, which may clear it. Download a backup file to keep it safe.
    </Alert>
  );
}
