import { useState, useMemo } from 'react';
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
import { formatHijriDate, getNextHawlGregorian, getDaysUntilHawl, getOverdueHawlYears, getGregorianForHijri } from '../utils/hijriDate';
import PageContainer from '../components/PageContainer';

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

  // Check for unpaid zakat from most recent entry
  const unpaidEntry = portfolio.history.find((entry) => {
    if (entry.totalZakat <= 0) return false;
    const totalPaid = entry.payments.reduce((sum, p) => sum + p.amount, 0);
    return totalPaid < entry.totalZakat;
  });
  const unpaidRemaining = unpaidEntry
    ? unpaidEntry.totalZakat - unpaidEntry.payments.reduce((s, p) => s + p.amount, 0)
    : 0;

  // Hawl calculation (memoized — expensive Hijri date conversions)
  const { hawlMonth, hawlDay } = portfolio.settings;
  const hawlSet = hawlMonth != null && hawlDay != null;
  const { daysUntilHawl, nextHawlDate } = useMemo(() => {
    if (!hawlSet) return { daysUntilHawl: null, nextHawlDate: null };
    return {
      daysUntilHawl: getDaysUntilHawl(hawlMonth, hawlDay),
      nextHawlDate: getNextHawlGregorian(hawlMonth, hawlDay),
    };
  }, [hawlSet, hawlMonth, hawlDay]);

  // Overdue Hawl warning (memoized)
  const dismissedYears = portfolio.settings.dismissedHawlYears || [];
  const historyDates = useMemo(() => portfolio.history.map((h) => h.date), [portfolio.history]);
  const overdueYears = useMemo(() => {
    if (!hawlSet) return [];
    return getOverdueHawlYears(hawlMonth, hawlDay, historyDates)
      .filter((y) => !dismissedYears.includes(y));
  }, [hawlSet, hawlMonth, hawlDay, historyDates, dismissedYears]);

  const handleDismissYear = (year: number) => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: { dismissedHawlYears: [...dismissedYears, year] },
    });
  };

  return (
    <PageContainer title="Portfolio Dashboard">

      {/* Hawl ETA Card */}
      {hawlSet && nextHawlDate && daysUntilHawl != null && (
        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #003d33 0%, #00695c 100%)', color: 'white' }}>
          <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="overline" sx={{ opacity: 0.8 }}>
                Next Hawl — {formatHijriDate(hawlMonth, hawlDay)}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {daysUntilHawl === 0
                  ? 'Today!'
                  : `${daysUntilHawl} day${daysUntilHawl === 1 ? '' : 's'} remaining`}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {nextHawlDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Zakat Due Card */}
      {unpaidEntry && unpaidRemaining > 0 && (
        <Card sx={{ mb: 3, border: '2px solid', borderColor: 'warning.main' }}>
          <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="overline" color="warning.main">
                Zakat Due — {unpaidEntry.year} AH / {unpaidEntry.gregorianYear || new Date(unpaidEntry.date).getFullYear()} CE
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {formatCurrency(unpaidRemaining)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                of {formatCurrency(unpaidEntry.totalZakat)} total
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="warning"
              onClick={() => navigate(`/history/${unpaidEntry.id}/payments`)}
            >
              Track Payments
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Overdue Hawl Warning */}
      {overdueYears.map((hijriYear) => {
        const dueDate = getGregorianForHijri(hijriYear, hawlMonth!, hawlDay!);
        const dueDateStr = dueDate
          ? dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          : 'unknown date';
        return (
        <Alert
          key={hijriYear}
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                color="inherit"
                size="small"
                onClick={() => navigate('/review')}
              >
                Start Review
              </Button>
              <Button
                color="inherit"
                size="small"
                onClick={() => handleDismissYear(hijriYear)}
              >
                Dismiss
              </Button>
            </Box>
          }
        >
          <strong>Zakat may be overdue</strong> — Your Hawl date ({formatHijriDate(hawlMonth!, hawlDay!)}, {hijriYear} AH)
          fell on {dueDateStr}, but no review was found for that period.
        </Alert>
        );
      })}

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
    </PageContainer>
  );
}
