import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import { useLocalFile } from '../context/LocalFileContext';
import { usePortfolio } from '../context/PortfolioContext';
import { describePortfolio as describe } from '../services/storage';

export default function FileConflictDialog() {
  const { conflict, resolveConflict, isSaving, fileName } = useLocalFile();
  const { portfolio } = usePortfolio();

  if (!conflict) return null;

  return (
    <Dialog open={true} onClose={() => {}}>
      <DialogTitle>Data File Changed</DialogTitle>
      <DialogContent>
        <DialogContentText>
          <strong>{fileName}</strong> was changed elsewhere (last modified{' '}
          {new Date(conflict.fileModified).toLocaleString()}; {describe(conflict.fileData)}),
          and this browser also has unsaved changes ({describe(portfolio)}).
          Which version would you like to keep? The other will be overwritten.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => resolveConflict('local')} disabled={isSaving} color="secondary">
          Keep This Browser's Data
        </Button>
        <Button
          onClick={() => resolveConflict('file')}
          disabled={isSaving}
          variant="contained"
          startIcon={isSaving ? <CircularProgress size={16} /> : undefined}
        >
          Use File Data
        </Button>
      </DialogActions>
    </Dialog>
  );
}
