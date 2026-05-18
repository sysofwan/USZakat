import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { usePortfolio } from '../context/PortfolioContext';
import { ASSET_LABELS, NON_DEDUCTIBLE_ASSETS } from '../types';
import type { AssetType } from '../types';
import { calculateZakat, formatCurrency } from '../utils/zakatCalculator';
import { fetchGoldPrice, calculateNisab } from '../services/goldPrice';
import { HIJRI_MONTHS, getYearOptions } from '../utils/hijriDate';
import type { YearOption } from '../utils/hijriDate';
import PageContainer from '../components/PageContainer';

const SESSION_KEY = 'zakatfolio_review_state';

interface WizardState {
  activeStep: number;
  snapshots: Record<string, Record<string, number>>;
  rothPercents: Record<string, number>;
  nisab: number;
  taxRate: number;
  retirementEligible: boolean;
  selectedYearIdx: number;
}

function loadWizardState(): WizardState | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveWizardState(state: WizardState) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export function clearWizardState() {
  sessionStorage.removeItem(SESSION_KEY);
}

export default function AnnualReviewPage() {
  const { portfolio, dispatch } = usePortfolio();
  const navigate = useNavigate();
  const location = useLocation();

  // Rehydrate from location state (navigating back) or sessionStorage (refresh)
  const locationState = location.state as {
    snapshots?: Record<string, Record<string, number>>;
    rothPercents?: Record<string, number>;
    settings?: { nisab: number; taxRate: number; retirementEligible: boolean };
  } | undefined;
  const wizardState = !locationState ? loadWizardState() : null;

  const [activeStep, setActiveStep] = useState(() => wizardState?.activeStep ?? 0);

  // Snapshots: { accountId: { assetType: value } }
  const [snapshots, setSnapshots] = useState<Record<string, Record<string, number>>>(() => {
    const s = locationState?.snapshots ?? wizardState?.snapshots;
    if (s) return s;
    const initial: Record<string, Record<string, number>> = {};
    for (const account of portfolio.accounts) {
      initial[account.id] = {};
      for (const asset of account.assets) {
        initial[account.id][asset] = 0;
      }
    }
    return initial;
  });

  // Roth/Traditional split percentages (for mixed accounts, set per review)
  const [rothPercents, setRothPercents] = useState<Record<string, number>>(() => {
    const r = locationState?.rothPercents ?? wizardState?.rothPercents;
    if (r) return r;
    const initial: Record<string, number> = {};
    for (const account of portfolio.accounts) {
      if (account.type === 'retirement_mixed') {
        initial[account.id] = 50;
      }
    }
    return initial;
  });

  // Settings overrides for this review
  const [nisab, setNisab] = useState(locationState?.settings?.nisab ?? wizardState?.nisab ?? portfolio.settings.nisab);
  const [taxRate, setTaxRate] = useState(locationState?.settings?.taxRate ?? wizardState?.taxRate ?? portfolio.settings.taxRate);
  const [retirementEligible, setRetirementEligible] = useState(
    locationState?.settings?.retirementEligible ?? wizardState?.retirementEligible ?? portfolio.settings.retirementEligible
  );
  const [hawlMonth, setHawlMonth] = useState<number | ''>(portfolio.settings.hawlMonth ?? '');
  const [hawlDay, setHawlDay] = useState<number | ''>(portfolio.settings.hawlDay ?? '');
  const [fetchingPrice, setFetchingPrice] = useState(false);

  // Year options based on local Hawl date state (not stale portfolio.settings)
  const yearOptions: YearOption[] = useMemo(
    () => getYearOptions(
      hawlMonth === '' ? undefined : hawlMonth,
      hawlDay === '' ? undefined : hawlDay
    ),
    [hawlMonth, hawlDay]
  );
  const [selectedYearIdx, setSelectedYearIdx] = useState(() => {
    const ws = loadWizardState();
    return ws?.selectedYearIdx ?? 0;
  });

  // Persist wizard state to sessionStorage on changes
  useEffect(() => {
    saveWizardState({
      activeStep,
      snapshots,
      rothPercents,
      nisab,
      taxRate,
      retirementEligible,
      selectedYearIdx,
    });
  }, [activeStep, snapshots, rothPercents, nisab, taxRate, retirementEligible, selectedYearIdx]);

  // Redirect if no accounts (after all hooks)
  if (portfolio.accounts.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          No accounts to review
        </Typography>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
      </Box>
    );
  }

  // Steps: one per account + Settings + Review
  const accountSteps = portfolio.accounts.map((a) => a.name);
  const steps = [...accountSteps, 'Settings', 'Review'];

  const handleAssetChange = (accountId: string, asset: string, value: string) => {
    const numValue = Math.max(0, parseFloat(value) || 0);
    setSnapshots((prev) => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        [asset]: numValue,
      },
    }));
  };

  const handleFetchGoldPrice = async () => {
    setFetchingPrice(true);
    try {
      const price = await fetchGoldPrice();
      if (price) {
        const nisabValue = calculateNisab(price.pricePerGram);
        setNisab(nisabValue);
      }
    } finally {
      setFetchingPrice(false);
    }
  };

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleFinish = () => {
    // Save settings
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: {
        nisab,
        taxRate,
        retirementEligible,
        ...(hawlMonth && hawlDay ? { hawlMonth, hawlDay } : {}),
      },
    });

    // Navigate to summary with all the review data
    const selectedYear = yearOptions[selectedYearIdx] || yearOptions[0];
    clearWizardState();
    navigate('/summary', {
      state: {
        snapshots,
        settings: { nisab, taxRate, retirementEligible, stockProxyPercent: portfolio.settings.stockProxyPercent },
        rothPercents,
        hijriYear: selectedYear?.hijriYear,
        gregorianYear: selectedYear?.gregorianYear,
      },
    });
  };

  // Calculate running total for the review step
  const reviewSettings = { nisab, taxRate, retirementEligible, stockProxyPercent: portfolio.settings.stockProxyPercent };
  const result = calculateZakat(portfolio.accounts, snapshots, reviewSettings, rothPercents);

  const renderAccountStep = (accountIndex: number) => {
    const account = portfolio.accounts[accountIndex];
    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {account.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter the current market value for each asset in this account.
        </Typography>

        {/* Roth/Traditional split for mixed accounts */}
        {account.type === 'retirement_mixed' && (
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>
              Roth vs Traditional Split
            </Typography>
            <Box sx={{ px: 2 }}>
              <Slider
                value={rothPercents[account.id] ?? 50}
                onChange={(_, val) =>
                  setRothPercents((prev) => ({ ...prev, [account.id]: val as number }))
                }
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v}%`}
                min={0}
                max={100}
                marks={[
                  { value: 0, label: '0% Roth' },
                  { value: 50, label: '50/50' },
                  { value: 100, label: '100% Roth' },
                ]}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {rothPercents[account.id] ?? 50}% Roth / {100 - (rothPercents[account.id] ?? 50)}% Traditional
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {account.assets.map((asset) => (
            <Box key={asset}>
              <TextField
                label={ASSET_LABELS[asset as AssetType]}
                type="number"
                value={snapshots[account.id]?.[asset] || ''}
                onChange={(e) => handleAssetChange(account.id, asset, e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  },
                  htmlInput: { min: 0 },
                }}
                fullWidth
              />
              {NON_DEDUCTIBLE_ASSETS.includes(asset as AssetType) && (
                <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block' }}>
                  ⚠ Long-term debt — not deducted from your Zakat calculation
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const renderSettingsStep = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Review Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Confirm or adjust the settings for this year's calculation.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Zakat Year Selector */}
        <FormControl fullWidth>
          <InputLabel>Zakat Year</InputLabel>
          <Select
            value={selectedYearIdx}
            label="Zakat Year"
            onChange={(e) => setSelectedYearIdx(e.target.value as number)}
          >
            {yearOptions.map((opt, idx) => (
              <MenuItem key={idx} value={idx}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
          {!portfolio.settings.hawlMonth && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Set your Hawl date in Settings for accurate year options.
            </Typography>
          )}
        </FormControl>

        <Box>
          <TextField
            label="Nisab Threshold"
            type="number"
            value={nisab}
            onChange={(e) => setNisab(parseFloat(e.target.value) || 0)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      startIcon={<AutorenewIcon />}
                      onClick={handleFetchGoldPrice}
                      disabled={fetchingPrice}
                    >
                      {fetchingPrice ? 'Fetching...' : 'Fetch Gold Price'}
                    </Button>
                  </InputAdornment>
                ),
              },
            }}
            fullWidth
            helperText="Based on 85 grams of gold at current market price"
          />
        </Box>

        <TextField
          label="Effective Tax Rate"
          type="number"
          value={taxRate}
          onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
          slotProps={{
            input: {
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
            },
          }}
          fullWidth
          helperText="Applied to Traditional retirement account portions"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={retirementEligible}
              onChange={(e) => setRetirementEligible(e.target.checked)}
            />
          }
          label="I am 59½ or older (skip 10% early withdrawal penalty)"
        />

        {/* Hawl Date */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Hawl Date (Islamic Calendar)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The annual date your wealth first reached Nisab. Zakat is due on this date each Hijri year.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl sx={{ minWidth: 180 }}>
              <InputLabel>Hijri Month</InputLabel>
              <Select
                value={hawlMonth}
                label="Hijri Month"
                onChange={(e) => setHawlMonth(e.target.value as number)}
              >
                {HIJRI_MONTHS.map((name, idx) => (
                  <MenuItem key={idx + 1} value={idx + 1}>
                    {idx + 1}. {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Day"
              type="number"
              value={hawlDay}
              onChange={(e) => setHawlDay(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
              slotProps={{ htmlInput: { min: 1, max: 30 } }}
              sx={{ width: 100 }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );

  const renderReviewStep = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Review Summary
      </Typography>

      {result.accountBreakdowns.map((breakdown) => (
        <Card key={breakdown.accountId} variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {breakdown.accountName}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Account Base (after proxies):
              </Typography>
              <Typography variant="body2">{formatCurrency(breakdown.accountBase)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Net Zakatable:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatCurrency(breakdown.netZakatable)}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ))}

      <Card variant="outlined" sx={{ mt: 2, bgcolor: 'primary.50' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Total Net Zakatable:</Typography>
            <Typography sx={{ fontWeight: 600 }}>
              {formatCurrency(result.totalNetZakatable)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Nisab Threshold:</Typography>
            <Typography>{formatCurrency(result.nisab)}</Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              mt: 1,
              pt: 1,
              borderTop: '2px solid',
              borderColor: 'primary.main',
            }}
          >
            <Typography variant="h6">Estimated Zakat Due:</Typography>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
              {formatCurrency(result.zakatDue)}
            </Typography>
          </Box>
          {!result.meetsNisab && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Your net zakatable wealth is below the Nisab threshold. No Zakat is due.
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );

  const renderStepContent = () => {
    if (activeStep < portfolio.accounts.length) {
      return renderAccountStep(activeStep);
    }
    const specialStepIndex = activeStep - portfolio.accounts.length;
    switch (specialStepIndex) {
      case 0:
        return renderSettingsStep();
      case 1:
        return renderReviewStep();
      default:
        return null;
    }
  };

  return (
    <PageContainer title="Annual Zakat Review">
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ minHeight: 300 }}>{renderStepContent()}</Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          startIcon={<NavigateBeforeIcon />}
          onClick={handleBack}
          disabled={activeStep === 0}
        >
          Back
        </Button>

        {activeStep === steps.length - 1 ? (
          <Button
            variant="contained"
            size="large"
            onClick={handleFinish}
            sx={{ fontWeight: 600 }}
          >
            Continue to Summary
          </Button>
        ) : (
          <Button variant="contained" endIcon={<NavigateNextIcon />} onClick={handleNext}>
            Next
          </Button>
        )}
      </Box>
    </PageContainer>
  );
}
