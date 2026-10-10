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
  Grid,
  LinearProgress,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SavingsIcon from '@mui/icons-material/Savings';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import { usePortfolio } from '../context/PortfolioContext';
import { ACCOUNT_TYPE_LABELS, ASSET_LABELS } from '../types';
import type { AssetType } from '../types';
import { formatCurrency } from '../utils/zakatCalculator';
import { formatHijriDate, getNextHawlGregorian, getDaysUntilHawl, getOverdueHawlYears, getGregorianForHijri } from '../utils/hijriDate';
import PageContainer from '../components/PageContainer';
import { brand, heroBackground } from '../theme';

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

  const typeIcon = (type: string) => {
    if (type === 'debt') return <CreditCardIcon />;
    if (type === 'hsa') return <LocalHospitalIcon />;
    if (type.startsWith('retirement')) return <SavingsIcon />;
    return <AccountBalanceIcon />;
  };

  const unpaidPaid = unpaidEntry ? unpaidEntry.totalZakat - unpaidRemaining : 0;

  return (
    <PageContainer overline="Portfolio" title="Dashboard" subtitle="Your accounts and your next zakat date." maxWidth={960}>

      {/* Overview: next hawl date + outstanding zakat */}
      {(hawlSet && nextHawlDate && daysUntilHawl != null) || (unpaidEntry && unpaidRemaining > 0) ? (
        <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
          {hawlSet && nextHawlDate && daysUntilHawl != null && (
            <Grid size={{ xs: 12, md: unpaidEntry && unpaidRemaining > 0 ? 7 : 12 }}>
              <Card sx={{ height: '100%', background: heroBackground, color: 'white', border: 'none' }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: brand.mintText }}>
                    <EventRepeatIcon fontSize="small" />
                    <Typography variant="overline" sx={{ lineHeight: 1.5 }}>
                      Next zakat date · {formatHijriDate(hawlMonth, hawlDay)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: { xs: '2rem', md: '2.5rem' }, lineHeight: 1.1 }}>
                      {daysUntilHawl === 0
                        ? 'Today'
                        : `${daysUntilHawl} day${daysUntilHawl === 1 ? '' : 's'}`}
                    </Typography>
                    <Typography variant="body2" sx={{ color: brand.mintText, mt: 0.5 }}>
                      {nextHawlDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {unpaidEntry && unpaidRemaining > 0 && (
            <Grid size={{ xs: 12, md: hawlSet ? 5 : 12 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                      Zakat due · {unpaidEntry.year} AH
                    </Typography>
                    <Chip
                      size="small"
                      label={unpaidPaid > 0 ? 'Partially paid' : 'Unpaid'}
                      sx={{ bgcolor: '#fff4e5', color: '#9a5b00', fontWeight: 600 }}
                    />
                  </Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '2rem', lineHeight: 1.1 }}>
                    {formatCurrency(unpaidRemaining)}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (unpaidPaid / unpaidEntry.totalZakat) * 100)}
                    sx={{ my: 1.5, height: 6, bgcolor: brand.mint }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {formatCurrency(unpaidPaid)} paid of {formatCurrency(unpaidEntry.totalZakat)}
                  </Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate(`/history/${unpaidEntry.id}/payments`)}
                  >
                    Track Payments
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      ) : null}

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
          sx={{ mb: 2.5 }}
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
          <strong>Zakat may be overdue</strong> — Your zakat calculation date ({formatHijriDate(hawlMonth!, hawlDay!)}, {hijriYear} AH)
          fell on {dueDateStr}, but no review was found for that period.
        </Alert>
        );
      })}

      {/* Quick stats */}
      {portfolio.accounts.length > 0 && (
        <Grid container spacing={2.5} sx={{ mb: 5 }}>
          {[
            { label: 'Total assets (last review)', value: totalAssets !== null ? formatCurrency(totalAssets) : '—' },
            { label: 'Accounts', value: String(portfolio.accounts.length) },
            {
              label: 'Last review',
              value: lastEntry ? `${lastEntry.year} AH` : 'None yet',
              sub: lastEntry ? new Date(lastEntry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : undefined,
            },
          ].map((stat) => (
            <Grid size={{ xs: 12, sm: 4 }} key={stat.label}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ py: 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.5rem', mt: 0.5 }}>{stat.value}</Typography>
                  {stat.sub && <Typography variant="caption" color="text.secondary">{stat.sub}</Typography>}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {portfolio.accounts.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6, px: 3 }}>
          <Box
            sx={{
              width: 56, height: 56, borderRadius: 3, display: 'grid', placeItems: 'center',
              bgcolor: brand.mint, color: brand.primary, mx: 'auto', mb: 2,
            }}
          >
            <AccountBalanceIcon />
          </Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            No accounts yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Add your bank, brokerage, retirement, and debt accounts to get started.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => navigate('/account/new')}
          >
            Add Account
          </Button>
        </Card>
      ) : (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h2">Accounts</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => navigate('/account/new')}>
              Add Account
            </Button>
          </Box>
          <Grid container spacing={2.5}>
            {portfolio.accounts.map((account) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={account.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                      <Box
                        sx={{
                          width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center', flexShrink: 0,
                          bgcolor: brand.mint, color: brand.primary,
                        }}
                      >
                        {typeIcon(account.type)}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                          {account.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ACCOUNT_TYPE_LABELS[account.type]}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {account.assets.map((asset) => (
                        <Chip
                          key={asset}
                          label={ASSET_LABELS[asset as AssetType]}
                          size="small"
                          sx={{ bgcolor: brand.surface, border: `1px solid ${brand.border}` }}
                        />
                      ))}
                    </Box>
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2 }}>
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

          {/* Annual review call to action */}
          <Card sx={{ mt: 5, bgcolor: brand.mint, borderColor: brand.border }}>
            <CardContent
              sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Box>
                <Typography variant="h6" component="h2">Ready for your annual review?</Typography>
                <Typography variant="body2" color="text.secondary">
                  Enter this year’s balances and calculate the zakat you owe.
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="large"
                startIcon={<PlayArrowIcon />}
                onClick={() => navigate('/review')}
              >
                Start Annual Review
              </Button>
            </CardContent>
          </Card>
        </>
      )}

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
