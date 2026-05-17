import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { usePortfolio } from '../context/PortfolioContext';
import { ASSET_LABELS } from '../types';
import type { AssetType, Liability } from '../types';
import { calculateZakat, formatCurrency } from '../utils/zakatCalculator';
import { fetchGoldPrice, calculateNisab } from '../services/goldPrice';
import { v4 as uuidv4 } from 'uuid';
import PageContainer from '../components/PageContainer';

export default function AnnualReviewPage() {
  const { portfolio, dispatch } = usePortfolio();
  const navigate = useNavigate();

  // Redirect if no accounts
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

  const [activeStep, setActiveStep] = useState(0);

  // Snapshots: { accountId: { assetType: value } }
  const [snapshots, setSnapshots] = useState<Record<string, Record<string, number>>>(() => {
    const initial: Record<string, Record<string, number>> = {};
    for (const account of portfolio.accounts) {
      initial[account.id] = {};
      for (const asset of account.assets) {
        initial[account.id][asset] = 0;
      }
    }
    return initial;
  });

  // Liabilities
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [newLiabilityDesc, setNewLiabilityDesc] = useState('');
  const [newLiabilityAmt, setNewLiabilityAmt] = useState('');

  // Settings overrides for this review
  const [nisab, setNisab] = useState(portfolio.settings.nisab);
  const [taxRate, setTaxRate] = useState(portfolio.settings.taxRate);
  const [retirementEligible, setRetirementEligible] = useState(
    portfolio.settings.retirementEligible
  );
  const [fetchingPrice, setFetchingPrice] = useState(false);

  // Steps: one per account + Liabilities + Settings + Review
  const accountSteps = portfolio.accounts.map((a) => a.name);
  const steps = [...accountSteps, 'Liabilities', 'Settings', 'Review'];

  const handleAssetChange = (accountId: string, asset: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setSnapshots((prev) => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        [asset]: numValue,
      },
    }));
  };

  const handleAddLiability = () => {
    if (!newLiabilityDesc.trim() || !newLiabilityAmt) return;
    setLiabilities((prev) => [
      ...prev,
      {
        id: uuidv4(),
        description: newLiabilityDesc.trim(),
        amount: parseFloat(newLiabilityAmt) || 0,
      },
    ]);
    setNewLiabilityDesc('');
    setNewLiabilityAmt('');
  };

  const handleRemoveLiability = (id: string) => {
    setLiabilities((prev) => prev.filter((l) => l.id !== id));
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
      payload: { nisab, taxRate, retirementEligible },
    });

    // Navigate to summary with all the review data
    navigate('/summary', {
      state: {
        snapshots,
        liabilities,
        settings: { nisab, taxRate, retirementEligible },
      },
    });
  };

  // Calculate running total for the review step
  const reviewSettings = { nisab, taxRate, retirementEligible };
  const result = calculateZakat(portfolio.accounts, snapshots, liabilities, reviewSettings);

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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {account.assets.map((asset) => (
            <TextField
              key={asset}
              label={ASSET_LABELS[asset as AssetType]}
              type="number"
              value={snapshots[account.id]?.[asset] || ''}
              onChange={(e) => handleAssetChange(account.id, asset, e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                },
              }}
              fullWidth
            />
          ))}
        </Box>
      </Box>
    );
  };

  const renderLiabilitiesStep = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Short-Term Liabilities
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Add any current credit card balances, utility bills, or other immediate debts.
        Long-term debts (mortgage, student loans) should NOT be included.
      </Typography>

      {liabilities.map((liability) => (
        <Card key={liability.id} variant="outlined" sx={{ mb: 1 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1, '&:last-child': { pb: 1 } }}>
            <Typography sx={{ flexGrow: 1 }}>{liability.description}</Typography>
            <Typography sx={{ fontWeight: 600 }}>
              {formatCurrency(liability.amount)}
            </Typography>
            <IconButton
              size="small"
              color="error"
              onClick={() => handleRemoveLiability(liability.id)}
            >
              <DeleteIcon />
            </IconButton>
          </CardContent>
        </Card>
      ))}

      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <TextField
          label="Description"
          value={newLiabilityDesc}
          onChange={(e) => setNewLiabilityDesc(e.target.value)}
          size="small"
          sx={{ flexGrow: 1 }}
        />
        <TextField
          label="Amount"
          type="number"
          value={newLiabilityAmt}
          onChange={(e) => setNewLiabilityAmt(e.target.value)}
          size="small"
          sx={{ width: 150 }}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            },
          }}
        />
        <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddLiability}>
          Add
        </Button>
      </Box>

      {liabilities.length > 0 && (
        <Typography variant="body2" sx={{ mt: 2, fontWeight: 600 }}>
          Total Liabilities: {formatCurrency(liabilities.reduce((s, l) => s + l.amount, 0))}
        </Typography>
      )}
    </Box>
  );

  const renderSettingsStep = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Review Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Confirm or adjust the settings for this year's calculation.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
            <Typography>Liabilities:</Typography>
            <Typography>- {formatCurrency(result.totalLiabilities)}</Typography>
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
        return renderLiabilitiesStep();
      case 1:
        return renderSettingsStep();
      case 2:
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
