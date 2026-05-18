import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import { usePortfolio } from '../context/PortfolioContext';
import { ASSET_LABELS } from '../types';
import type { AssetType } from '../types';
import { formatCurrency } from '../utils/zakatCalculator';
import { getPaymentStatus } from '../utils/payments';
import { exportPortfolio } from '../services/storage';
import PageContainer from '../components/PageContainer';

export default function HistoryPage() {
  const { portfolio, dispatch } = usePortfolio();
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = () => {
    if (deleteId) {
      dispatch({ type: 'DELETE_HISTORY_ENTRY', payload: deleteId });
      setDeleteId(null);
    }
  };

  const exportButton = portfolio.history.length > 0 ? (
    <Button
      startIcon={<DownloadIcon />}
      onClick={() => exportPortfolio(portfolio)}
      variant="outlined"
    >
      Export Data
    </Button>
  ) : undefined;

  return (
    <PageContainer title="Zakat History" action={exportButton}>

      {portfolio.history.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            No records yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Complete your first Annual Review to see your history here.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
        </Box>
      ) : (
        portfolio.history.map((entry) => {
          const payments = entry.payments;
          const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
          const status = entry.totalZakat > 0 ? getPaymentStatus(entry.totalZakat, totalPaid) : null;

          return (
          <Accordion key={entry.id} variant="outlined" sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2, flexWrap: 'wrap' }}>
                <Chip label={`${entry.year} AH / ${entry.gregorianYear || new Date(entry.date).getFullYear()} CE`} color="primary" size="small" />
                {status && <Chip label={status.label} color={status.color} size="small" variant="outlined" />}
                <Typography sx={{ flexGrow: 1, fontWeight: 600 }}>
                  Zakat Due: {formatCurrency(entry.totalZakat)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {new Date(entry.date).toLocaleDateString()}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Gross Wealth:</Typography>
                <Typography variant="body2">{formatCurrency(entry.grossWealth)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Net Zakatable Wealth:</Typography>
                <Typography variant="body2">{formatCurrency(entry.zakatableWealth)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Zakat Due:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }} color="primary">
                  {formatCurrency(entry.totalZakat)}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Account Snapshots
              </Typography>
              {Object.entries(entry.snapshots).map(([accountId, assets]) => {
                const breakdown = entry.accountBreakdowns?.find((b) => b.accountId === accountId);
                return (
                  <Box key={accountId} sx={{ mb: 2, pl: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {breakdown?.accountName || accountId}
                    </Typography>
                    {Object.entries(assets).map(([asset, value]) => (
                      <Box
                        key={asset}
                        sx={{ display: 'flex', justifyContent: 'space-between', pl: 2 }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {ASSET_LABELS[asset as AssetType] || asset}
                        </Typography>
                        <Typography variant="body2">{formatCurrency(value as number)}</Typography>
                      </Box>
                    ))}
                  </Box>
                );
              })}

              {entry.liabilities && entry.liabilities.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Liabilities
                  </Typography>
                  {entry.liabilities.map((l) => (
                    <Box key={l.id} sx={{ display: 'flex', justifyContent: 'space-between', pl: 2 }}>
                      <Typography variant="body2">{l.description}</Typography>
                      <Typography variant="body2">{formatCurrency(l.amount)}</Typography>
                    </Box>
                  ))}
                </>
              )}

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Settings Used
              </Typography>
              <Box sx={{ pl: 2 }}>
                <Typography variant="body2">Nisab: {formatCurrency(entry.settings.nisab)}</Typography>
                <Typography variant="body2">Tax Rate: {entry.settings.taxRate}%</Typography>
                <Typography variant="body2">
                  Retirement Eligible: {entry.settings.retirementEligible ? 'Yes' : 'No'}
                </Typography>
              </Box>

              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate(`/history/${entry.id}/payments`)}
                >
                  Track Payments
                </Button>
                <IconButton color="error" onClick={() => setDeleteId(entry.id)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            </AccordionDetails>
          </Accordion>
          );
        })
      )}

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete History Entry?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently remove this Zakat record.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
