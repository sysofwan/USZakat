import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { usePortfolio } from '../context/PortfolioContext';
import { ACCOUNT_TYPE_LABELS, ASSET_LABELS } from '../types';
import type { AssetType, Settings } from '../types';
import { calculateZakat, formatCurrency, formatPercent } from '../utils/zakatCalculator';
import { getCurrentHijriDate } from '../utils/hijriDate';
import { v4 as uuidv4 } from 'uuid';
import PageContainer from '../components/PageContainer';

interface ReviewState {
  snapshots: Record<string, Record<string, number>>;
  settings: Settings;
  rothPercents?: Record<string, number>;
  hijriYear?: number;
  gregorianYear?: number;
}

export default function SummaryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { portfolio, dispatch } = usePortfolio();
  const [saved, setSaved] = useState(false);
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);

  const state = location.state as ReviewState | undefined;

  if (!state) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          No review data found
        </Typography>
        <Button variant="contained" onClick={() => navigate('/review')}>
          Start a Review
        </Button>
      </Box>
    );
  }

  const { snapshots, settings, rothPercents, hijriYear, gregorianYear } = state;
  const result = calculateZakat(portfolio.accounts, snapshots, settings, rothPercents);

  const handleSave = () => {
    if (saved) return;
    const entryId = uuidv4();
    dispatch({
      type: 'ADD_HISTORY_ENTRY',
      payload: {
        id: entryId,
        year: hijriYear ?? getCurrentHijriDate().year,
        gregorianYear: gregorianYear ?? new Date().getFullYear(),
        date: new Date().toISOString(),
        totalZakat: result.zakatDue,
        zakatableWealth: result.netZakatableWealth,
        grossWealth: result.grossWealth,
        notes: '',
        snapshots,
        liabilities: [],
        settings,
        accountBreakdowns: result.accountBreakdowns,
        payments: [],
      },
    });
    setSaved(true);
    setSavedEntryId(entryId);
  };

  return (
    <PageContainer title="Zakat Summary & Purification">
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/review', { state: { snapshots, settings, rothPercents, hijriYear, gregorianYear } })}
        sx={{ mb: 2 }}
      >
        Back to Review
      </Button>

      {/* Headline Card */}
      <Card
        sx={{
          mb: 4,
          background: result.meetsNisab
            ? 'linear-gradient(135deg, #003d33 0%, #00695c 100%)'
            : 'grey.200',
          color: result.meetsNisab ? 'white' : 'text.primary',
        }}
      >
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="overline" sx={{ opacity: 0.8 }}>
            Your Zakat Due
          </Typography>
          <Typography variant="h2" sx={{ fontWeight: 800, my: 1 }}>
            {formatCurrency(result.zakatDue)}
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.8 }}>
            {formatPercent(result.zakatRate * 100)} of {formatCurrency(result.netZakatableWealth)} net zakatable wealth
          </Typography>
          {!result.meetsNisab && (
            <Alert severity="info" sx={{ mt: 2, mx: 'auto', maxWidth: 400 }}>
              Your wealth is below the Nisab threshold ({formatCurrency(result.nisab)}). No Zakat is due this year.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Math Breakdown */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Calculation Breakdown
      </Typography>

      {result.accountBreakdowns.map((breakdown) => (
        <Accordion key={breakdown.accountId} variant="outlined" sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
              <Typography sx={{ fontWeight: 600 }}>{breakdown.accountName}</Typography>
              <Typography color="primary" sx={{ fontWeight: 600 }}>
                {formatCurrency(breakdown.netZakatable)}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {ACCOUNT_TYPE_LABELS[breakdown.accountType]}
              {breakdown.rothPercent !== undefined &&
                ` (${breakdown.rothPercent}% Roth / ${100 - breakdown.rothPercent}% Traditional)`}
            </Typography>

            <Divider sx={{ my: 1 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Asset Values
            </Typography>
            {Object.entries(breakdown.assetValues).map(([asset, value]) => (
              <Box key={asset} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">
                  {ASSET_LABELS[asset as AssetType] || asset}
                  {asset === 'stock_passive' && ` (× ${settings.stockProxyPercent}% proxy)`}
                </Typography>
                <Typography variant="body2">
                  {formatCurrency(value as number)}
                  {asset === 'stock_passive' && (
                    <span style={{ color: '#666' }}>
                      {' → '}{formatCurrency((value as number) * (settings.stockProxyPercent / 100))}
                    </span>
                  )}
                </Typography>
              </Box>
            ))}

            <Divider sx={{ my: 1 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Account Base:</Typography>
              <Typography variant="body2">{formatCurrency(breakdown.accountBase)}</Typography>
            </Box>

            {breakdown.accountType !== 'standard' && breakdown.accountType !== 'debt' && (
              <>
                {breakdown.taxRate > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Tax Deduction:</Typography>
                    <Typography variant="body2">- {formatPercent(breakdown.taxRate * 100)}</Typography>
                  </Box>
                )}
                {breakdown.penaltyRate > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Early Withdrawal Penalty:</Typography>
                    <Typography variant="body2">- {formatPercent(breakdown.penaltyRate * 100)}</Typography>
                  </Box>
                )}
                {breakdown.rothPortion !== undefined && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">Roth Portion:</Typography>
                      <Typography variant="body2">{formatCurrency(breakdown.rothPortion)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">Traditional Portion:</Typography>
                      <Typography variant="body2">{formatCurrency(breakdown.tradPortion ?? 0)}</Typography>
                    </Box>
                  </>
                )}
              </>
            )}

            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Net Zakatable:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {formatCurrency(breakdown.netZakatable)}
              </Typography>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Totals */}
      <Card variant="outlined" sx={{ mt: 3, mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography>Gross Wealth:</Typography>
            <Typography>{formatCurrency(result.grossWealth)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography>Total Net Zakatable:</Typography>
            <Typography>{formatCurrency(result.totalNetZakatable)}</Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontWeight: 600 }}>Net Zakatable Wealth:</Typography>
            <Typography sx={{ fontWeight: 600 }}>{formatCurrency(result.netZakatableWealth)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography>Nisab Threshold:</Typography>
            <Typography>{formatCurrency(result.nisab)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Meets Nisab:</Typography>
            <Typography sx={{ fontWeight: 600, color: result.meetsNisab ? 'success.main' : 'error.main' }}>
              {result.meetsNisab ? 'Yes ✓' : 'No ✗'}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Save */}
      {saved ? (
        <Box>
          <Alert severity="success" sx={{ mb: 2 }}>
            ✓ Saved to history!
          </Alert>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={() => navigate(`/history/${savedEntryId}/payments`)}
              sx={{ fontWeight: 600 }}
            >
              Track Payments
            </Button>
            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={() => navigate('/history')}
            >
              View History
            </Button>
          </Box>
        </Box>
      ) : (
        <Button
          variant="contained"
          size="large"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          fullWidth
          sx={{ fontWeight: 600 }}
        >
          Save to History
        </Button>
      )}
    </PageContainer>
  );
}
