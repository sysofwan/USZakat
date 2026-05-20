import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import { useDrive } from '../context/DriveContext';
import { useState } from 'react';

export default function SyncConflictDialog() {
  const { conflict, resolveConflict, isSyncing } = useDrive();
  const [resolving, setResolving] = useState(false);

  if (!conflict) return null;

  const driveDate = new Date(conflict.driveModifiedTime);
  const formattedDate = driveDate.toLocaleString();

  const handleChoice = async (choice: 'local' | 'remote') => {
    setResolving(true);
    await resolveConflict(choice);
    setResolving(false);
  };

  const loading = resolving || isSyncing;

  return (
    <Dialog open={true} onClose={() => {}}>
      <DialogTitle>Sync Conflict Detected</DialogTitle>
      <DialogContent>
        <DialogContentText>
          A newer backup was found on Google Drive (last modified: {formattedDate}).
          Would you like to use the data from Google Drive or keep your current local data?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => handleChoice('local')}
          disabled={loading}
          color="secondary"
        >
          Keep Local Data
        </Button>
        <Button
          onClick={() => handleChoice('remote')}
          disabled={loading}
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          Use Google Drive Data
        </Button>
      </DialogActions>
    </Dialog>
  );
}
