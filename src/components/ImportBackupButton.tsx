import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
} from '@mui/material';
import type { ButtonProps } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { usePortfolio } from '../context/PortfolioContext';
import { parseBackup, pickJsonFile } from '../services/localFile';
import { describePortfolio as describe, isPortfolioEmpty } from '../services/storage';
import type { PortfolioData } from '../types';

interface Props extends Omit<ButtonProps, 'onClick'> {
  label?: string;
  onImported?: () => void;
}

/** Button that loads a JSON backup file, confirming before it replaces existing data. */
export default function ImportBackupButton({ label = 'Import Backup', onImported, ...buttonProps }: Props) {
  const { portfolio, dispatch } = usePortfolio();
  const [pending, setPending] = useState<{ name: string; data: PortfolioData } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const apply = (data: PortfolioData) => {
    dispatch({ type: 'RESTORE_FROM_BACKUP', payload: data });
    setPending(null);
    setDone(true);
    onImported?.();
  };

  const handleClick = async () => {
    setError(null);
    try {
      const file = await pickJsonFile();
      if (!file) return;
      const data = parseBackup(file.text);
      if (isPortfolioEmpty(portfolio)) apply(data);
      else setPending({ name: file.name, data });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read the file.');
    }
  };

  return (
    <>
      <Button startIcon={<UploadFileIcon />} {...buttonProps} onClick={handleClick}>
        {label}
      </Button>

      <Dialog open={pending !== null} onClose={() => setPending(null)}>
        <DialogTitle>Replace current data?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Importing <strong>{pending?.name}</strong> ({pending && describe(pending.data)}) will replace
            the data in this browser ({describe(portfolio)}). Consider exporting a backup first.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPending(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => pending && apply(pending.data)}>
            Replace Data
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={error !== null} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      </Snackbar>
      <Snackbar open={done} autoHideDuration={4000} onClose={() => setDone(false)}>
        <Alert severity="success" onClose={() => setDone(false)}>Backup imported.</Alert>
      </Snackbar>
    </>
  );
}
