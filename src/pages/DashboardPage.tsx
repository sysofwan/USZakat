import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Fab,
  Grid,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { usePortfolio } from '../context/PortfolioContext';
import { ACCOUNT_TYPE_LABELS, ASSET_LABELS } from '../types';
import type { AssetType } from '../types';
import { formatCurrency } from '../utils/zakatCalculator';

export default function DashboardPage() {
  const { portfolio, dispatch } = usePortfolio();
  const navigate = useNavigate();
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);

  const handleDelete = () => {
    if (deleteDialogId) {
      dispatch({ type: 'DELETE_ACCOUNT', payload: deleteDialogId });
      setDeleteDialogId(null);
    }
  };

  // Calculate total from last history entry if exists
  const lastEntry = portfolio.history[0];
  const totalAssets = lastEntry
    ? Object.values(lastEntry.snapshots).reduce(
        (sum, snap) => sum + Object.values(snap).reduce((s, v) => s + v, 0),
        0
      )
    : null;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Portfolio Dashboard
        </Typography>
      </Box>

      {totalAssets !== null && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Total Assets (last review): <strong>{formatCurrency(totalAssets)}</strong>
        </Alert>
      )}

      {portfolio.accounts.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            No accounts yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Add your first investment account to get started.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/account/new')}
          >
            Add Account
          </Button>
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {portfolio.accounts.map((account) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={account.id}>
                <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {account.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {ACCOUNT_TYPE_LABELS[account.type]}
                      {account.type === 'retirement_mixed' &&
                        ` (${account.rothPercent}% Roth / ${100 - (account.rothPercent ?? 50)}% Traditional)`}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {account.assets.map((asset) => (
                        <Chip
                          key={asset}
                          label={ASSET_LABELS[asset as AssetType]}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => navigate(`/account/${account.id}`)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => setDeleteDialogId(account.id)}
                    >
                      Delete
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<PlayArrowIcon />}
              onClick={() => navigate('/review')}
              sx={{ fontWeight: 600 }}
            >
              Start Annual Review
            </Button>
          </Box>
        </>
      )}

      {/* FAB for adding accounts */}
      <Fab
        color="primary"
        aria-label="add account"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={() => navigate('/account/new')}
      >
        <AddIcon />
      </Fab>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteDialogId} onClose={() => setDeleteDialogId(null)}>
        <DialogTitle>Delete Account?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently remove this account from your portfolio.
            Historical records will not be affected.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogId(null)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
