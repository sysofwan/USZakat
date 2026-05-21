import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  Link,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Slider,
  TextField,
  Typography,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CalculateIcon from '@mui/icons-material/Calculate';
import { usePortfolio } from '../context/PortfolioContext';
import { ASSET_LABELS, NON_DEDUCTIBLE_ASSETS } from '../types';
import type { AssetType, DraftReview, StockHolding, StockSymbol, ZakatMethod } from '../types';
import { calculateZakat, formatCurrency } from '../utils/zakatCalculator';
import { fetchGoldPrice, calculateNisab } from '../services/goldPrice';
import { HIJRI_MONTHS, getYearOptions, formatHijriDate, getNextHawlGregorian } from '../utils/hijriDate';
import type { YearOption } from '../utils/hijriDate';
import { loadZakatProxy, getZakatPercentSync, getAssetClassSync, getAvailableSymbols, getProxyGeneratedDate } from '../services/zakatProxy';
import PageContainer from '../components/PageContainer';

const SESSION_KEY = 'zakatfolio_review_state';

interface WizardState {
  activeStep: number;
  snapshots: Record<string, Record<string, number>>;
  rothPercents: Record<string, number>;
  nisab: number;
  taxRate: number;
  retirementEligible: boolean;
  zakatMethod: ZakatMethod;
  stockProxyPercent: number;
  selectedYearIdx: number;
  stockHoldings: Record<string, StockHolding[]>; // accountId -> holdings
  usePerSymbol: Record<string, boolean>; // accountId -> whether per-symbol mode is active
}

function loadWizardState(): WizardState | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveWizardState(state: WizardState) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export function clearWizardState() {
  localStorage.removeItem(SESSION_KEY);
}

function loadDraftOrWizard(portfolio: { draftReview?: DraftReview }): WizardState | null {
  // Prefer portfolio.draftReview (synced to Drive) over legacy localStorage
  if (portfolio.draftReview) {
    const { lastUpdated: _, ...rest } = portfolio.draftReview;
    return rest;
  }
  return loadWizardState();
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
    stockHoldings?: Record<string, StockHolding[]>;
    usePerSymbol?: Record<string, boolean>;
  } | undefined;
  const wizardState = !locationState ? loadDraftOrWizard(portfolio) : null;

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
  const [taxRateStr, setTaxRateStr] = useState<string>(
    String(locationState?.settings?.taxRate ?? wizardState?.taxRate ?? portfolio.settings.taxRate)
  );
  const taxRate = parseFloat(taxRateStr) || 0;
  const [retirementEligible, setRetirementEligible] = useState(
    locationState?.settings?.retirementEligible ?? wizardState?.retirementEligible ?? portfolio.settings.retirementEligible
  );
  const [zakatMethod, setZakatMethod] = useState<ZakatMethod>(
    (locationState?.settings as { zakatMethod?: ZakatMethod } | undefined)?.zakatMethod ?? wizardState?.zakatMethod ?? portfolio.settings.zakatMethod
  );
  const [stockProxyPercent, setStockProxyPercent] = useState<string>(
    String((locationState?.settings as { stockProxyPercent?: number } | undefined)?.stockProxyPercent ?? wizardState?.stockProxyPercent ?? portfolio.settings.stockProxyPercent)
  );
  const stockProxyValue = parseFloat(stockProxyPercent) || 0;
  const [hawlMonth, setHawlMonth] = useState<number | ''>(portfolio.settings.hawlMonth ?? '');
  const [hawlDay, setHawlDay] = useState<number | ''>(portfolio.settings.hawlDay ?? '');
  const [fetchingPrice, setFetchingPrice] = useState(false);

  // Per-symbol stock holdings state
  const [stockHoldings, setStockHoldings] = useState<Record<string, StockHolding[]>>(() =>
    locationState?.stockHoldings ?? wizardState?.stockHoldings ?? {}
  );
  const [usePerSymbol, setUsePerSymbol] = useState<Record<string, boolean>>(() =>
    locationState?.usePerSymbol ?? wizardState?.usePerSymbol ?? {}
  );
  // Local copy of symbol registry (saved to portfolio on finish)
  const [localSymbols, setLocalSymbols] = useState<StockSymbol[]>(() =>
    portfolio.stockSymbols ?? []
  );
  const [proxyLoaded, setProxyLoaded] = useState(false);

  // Load zakat proxy data on mount
  useEffect(() => {
    loadZakatProxy().then(() => setProxyLoaded(true));
  }, []);

  // Combine local symbols with proxy data for autocomplete options
  const allSymbolOptions = useMemo(() => {
    const localSet = new Set(localSymbols.map((s) => s.symbol));
    const proxySymbols = proxyLoaded ? getAvailableSymbols() : [];
    const combined = new Set([...localSet, ...proxySymbols]);
    return [...combined].sort();
  }, [localSymbols, proxyLoaded]);

  // Lookup zakatable percent: proxy first, then local registry, then default
  const lookupZakatPercent = useCallback((symbol: string): number | null => {
    // Check proxy data (returns 0-1 scale, convert to 0-100)
    const proxyPct = getZakatPercentSync(symbol);
    if (proxyPct !== null) return Math.round(proxyPct * 1000) / 10; // e.g. 0.0337 → 3.4
    // Check local registry
    const local = localSymbols.find((s) => s.symbol === symbol);
    if (local) return local.zakatablePercent;
    // Use the user's default stock proxy % for unknown symbols
    if (symbol.length >= 1 && symbol.length <= 6) {
      return stockProxyValue;
    }
    return null;
  }, [localSymbols, stockProxyValue]);
  // Year options based on local Hawl date state (not stale portfolio.settings)
  const yearOptions: YearOption[] = useMemo(
    () => getYearOptions(
      hawlMonth === '' ? undefined : hawlMonth,
      hawlDay === '' ? undefined : hawlDay
    ),
    [hawlMonth, hawlDay]
  );
  const [selectedYearIdx, setSelectedYearIdx] = useState(() => {
    return wizardState?.selectedYearIdx ?? 0;
  });

  // Persist wizard state to localStorage (fast) + portfolio (syncs to Drive)
  useEffect(() => {
    const state: WizardState = {
      activeStep,
      snapshots,
      rothPercents,
      nisab,
      taxRate,
      retirementEligible,
      zakatMethod,
      stockProxyPercent: stockProxyValue,
      selectedYearIdx,
      stockHoldings,
      usePerSymbol,
    };
    saveWizardState(state);
    dispatch({ type: 'SET_DRAFT_REVIEW', payload: { ...state, lastUpdated: new Date().toISOString() } });
  }, [activeStep, snapshots, rothPercents, nisab, taxRate, retirementEligible, zakatMethod, stockProxyValue, selectedYearIdx, stockHoldings, usePerSymbol, dispatch]);

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

  // Steps: Settings first, then one per account, then Review
  const accountSteps = portfolio.accounts.map((a) => a.name);
  const steps = ['Settings', ...accountSteps, 'Review'];

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

    // Save symbol registry
    dispatch({ type: 'SET_STOCK_SYMBOLS', payload: localSymbols });

    // Navigate to summary with all the review data
    const selectedYear = yearOptions[selectedYearIdx] || yearOptions[0];
    clearWizardState();
    dispatch({ type: 'SET_DRAFT_REVIEW', payload: undefined });
    navigate('/summary', {
      state: {
        snapshots: effectiveSnapshots,
        settings: { nisab, taxRate, retirementEligible, zakatMethod, stockProxyPercent: stockProxyValue },
        rothPercents,
        hijriYear: selectedYear?.hijriYear,
        gregorianYear: selectedYear?.gregorianYear,
        stockHoldings,
        usePerSymbol,
      },
    });
  };

  // Build effective holdings for calculation (only accounts in per-symbol mode)
  const effectiveHoldings: Record<string, StockHolding[]> = {};
  for (const [accountId, holdings] of Object.entries(stockHoldings)) {
    if (usePerSymbol[accountId] && holdings.length > 0) {
      effectiveHoldings[accountId] = holdings;
    }
  }

  // In per-symbol mode, derive stock_passive from holdings + other stocks
  const effectiveSnapshots = useMemo(() => {
    const result = { ...snapshots };
    for (const [accountId, isActive] of Object.entries(usePerSymbol)) {
      if (!isActive) continue;
      const holdings = stockHoldings[accountId] ?? [];
      const holdingsSum = holdings.reduce((s, h) => s + h.value, 0);
      const otherStocks = snapshots[accountId]?.['_other_stocks'] ?? 0;
      result[accountId] = {
        ...result[accountId],
        stock_passive: holdingsSum + otherStocks,
        // In per-symbol mode, bonds/gold are handled via _other_bonds/_other_metals
        bonds: 0,
        gold: 0,
      };
    }
    return result;
  }, [snapshots, usePerSymbol, stockHoldings]);

  const reviewSettings = { nisab, taxRate, retirementEligible, zakatMethod, stockProxyPercent: stockProxyValue };
  const result = calculateZakat(portfolio.accounts, effectiveSnapshots, reviewSettings, rothPercents, effectiveHoldings);

  const renderAccountStep = (accountIndex: number) => {
    const account = portfolio.accounts[accountIndex];
    const hasPassiveStock = account.assets.includes('stock_passive');
    const isRetirementShortTerm = ['retirement_traditional', 'retirement_roth', 'retirement_mixed', 'hsa'].includes(account.type)
      && zakatMethod === 'short_term';
    // Per-symbol mode only useful when proxy applies (not short_term retirement)
    const canUsePerSymbol = hasPassiveStock && !isRetirementShortTerm;
    const isPerSymbol = canUsePerSymbol && (usePerSymbol[account.id] ?? false);
    const accountHoldings = stockHoldings[account.id] ?? [];
    const holdingsTotal = accountHoldings.reduce((sum, h) => sum + h.value, 0);

    const handleAddHolding = () => {
      setStockHoldings((prev) => ({
        ...prev,
        [account.id]: [...(prev[account.id] ?? []), { symbol: '', value: 0, zakatablePercent: stockProxyValue }],
      }));
    };

    const handleUpdateHolding = (idx: number, field: keyof StockHolding, val: string | number) => {
      setStockHoldings((prev) => {
        const list = [...(prev[account.id] ?? [])];
        if (field === 'symbol') {
          const normalized = (val as string).toUpperCase().trim();
          list[idx] = { ...list[idx], symbol: normalized };
          // Auto-fill zakatable % and asset class from proxy data or registry
          const ac = getAssetClassSync(normalized);
          if (ac) {
            list[idx].assetClass = ac;
            if (ac === 'bond' || ac === 'commodity') {
              list[idx].zakatablePercent = 100;
            } else {
              const pct = lookupZakatPercent(normalized);
              if (pct !== null) list[idx].zakatablePercent = pct;
            }
          } else {
            const pct = lookupZakatPercent(normalized);
            if (pct !== null) list[idx].zakatablePercent = pct;
          }
        } else if (field === 'value') {
          list[idx] = { ...list[idx], value: Math.max(0, parseFloat(val as string) || 0) };
        } else if (field === 'zakatablePercent') {
          list[idx] = { ...list[idx], zakatablePercent: Math.min(100, Math.max(0, parseFloat(val as string) || 0)) };
        } else if (field === 'assetClass') {
          const newClass = val as StockHolding['assetClass'];
          list[idx] = { ...list[idx], assetClass: newClass };
          // Bond and metal are 100% zakatable
          if (newClass === 'bond' || newClass === 'commodity') {
            list[idx].zakatablePercent = 100;
          }
        }
        return { ...prev, [account.id]: list };
      });
    };

    const handleDeleteHolding = (idx: number) => {
      setStockHoldings((prev) => ({
        ...prev,
        [account.id]: (prev[account.id] ?? []).filter((_, i) => i !== idx),
      }));
    };

    // When user finishes editing a symbol, save it to the local registry if new
    const handleSymbolBlur = (holding: StockHolding) => {
      if (!holding.symbol) return;
      const existing = localSymbols.find((s) => s.symbol === holding.symbol);
      if (!existing) {
        setLocalSymbols((prev) => [...prev, { symbol: holding.symbol, zakatablePercent: holding.zakatablePercent, assetClass: holding.assetClass }]);
      } else if (existing.zakatablePercent !== holding.zakatablePercent || existing.assetClass !== holding.assetClass) {
        setLocalSymbols((prev) =>
          prev.map((s) => s.symbol === holding.symbol ? { ...s, zakatablePercent: holding.zakatablePercent, assetClass: holding.assetClass } : s)
        );
      }
    };

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
          {account.assets.map((asset) => {
            // In per-symbol mode, replace stock_passive field with detailed breakdown
            if (asset === 'stock_passive' && isPerSymbol) {
              return (
                <Box key={asset}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Stock Holdings (Per-Symbol)
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => setUsePerSymbol((prev) => ({ ...prev, [account.id]: false }))}
                        sx={{ textTransform: 'none' }}
                      >
                        Switch to simple mode
                      </Button>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                      Enter each fund/ETF. Bond and metal ETFs are 100% zakatable. Stock ETFs use their specific zakatable %.
                    </Typography>
                    {proxyLoaded && getProxyGeneratedDate() && (
                      <Chip
                        label={`Auto-fill from financial data (${getProxyGeneratedDate()})`}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ mb: 1.5 }}
                      />
                    )}

                    {accountHoldings.map((holding, idx) => (
                      <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Autocomplete
                          freeSolo
                          size="small"
                          options={allSymbolOptions}
                          value={holding.symbol}
                          onInputChange={(_, val) => handleUpdateHolding(idx, 'symbol', val)}
                          onBlur={() => handleSymbolBlur(holding)}
                          sx={{ width: 140 }}
                          renderInput={(params) => (
                            <TextField {...params} label="Symbol" placeholder="e.g. VOO" />
                          )}
                        />
                        <TextField
                          size="small"
                          label="Value"
                          type="number"
                          value={holding.value || ''}
                          onChange={(e) => handleUpdateHolding(idx, 'value', e.target.value)}
                          slotProps={{
                            input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
                            htmlInput: { min: 0 },
                          }}
                          sx={{ width: 160 }}
                        />
                        <TextField
                          size="small"
                          label="Zakatable %"
                          type="number"
                          value={holding.zakatablePercent}
                          onChange={(e) => handleUpdateHolding(idx, 'zakatablePercent', e.target.value)}
                          onBlur={() => handleSymbolBlur(holding)}
                          disabled={(holding.assetClass ?? 'stock') !== 'stock'}
                          slotProps={{
                            input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                            htmlInput: { min: 0, max: 100, step: 0.1 },
                          }}
                          sx={{ width: 120 }}
                        />
                        <FormControl size="small" sx={{ minWidth: 90 }}>
                          <Select
                            value={holding.assetClass ?? 'stock'}
                            onChange={(e) => handleUpdateHolding(idx, 'assetClass', e.target.value)}
                            size="small"
                          >
                            <MenuItem value="stock">Stock</MenuItem>
                            <MenuItem value="bond">Bond</MenuItem>
                            <MenuItem value="commodity">Metal</MenuItem>
                          </Select>
                        </FormControl>
                        <IconButton size="small" onClick={() => handleDeleteHolding(idx)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}

                    <Button size="small" startIcon={<AddIcon />} onClick={handleAddHolding} sx={{ mt: 1 }}>
                      Add Holding
                    </Button>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Other categories */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <TextField
                        size="small"
                        label="Other Stocks"
                        type="number"
                        value={snapshots[account.id]?.['_other_stocks'] || ''}
                        onChange={(e) => handleAssetChange(account.id, '_other_stocks', e.target.value)}
                        slotProps={{
                          input: {
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            endAdornment: <InputAdornment position="end">× {stockProxyValue}%</InputAdornment>,
                          },
                          htmlInput: { min: 0 },
                        }}
                        sx={{ flex: 1, minWidth: 180 }}
                      />
                      <TextField
                        size="small"
                        label="Other Bonds"
                        type="number"
                        value={snapshots[account.id]?.['_other_bonds'] || ''}
                        onChange={(e) => handleAssetChange(account.id, '_other_bonds', e.target.value)}
                        slotProps={{
                          input: {
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            endAdornment: <InputAdornment position="end">× 100%</InputAdornment>,
                          },
                          htmlInput: { min: 0 },
                        }}
                        sx={{ flex: 1, minWidth: 180 }}
                      />
                      <TextField
                        size="small"
                        label="Other Metals"
                        type="number"
                        value={snapshots[account.id]?.['_other_metals'] || ''}
                        onChange={(e) => handleAssetChange(account.id, '_other_metals', e.target.value)}
                        slotProps={{
                          input: {
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            endAdornment: <InputAdornment position="end">× 100%</InputAdornment>,
                          },
                          htmlInput: { min: 0 },
                        }}
                        sx={{ flex: 1, minWidth: 180 }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      Any holdings not listed above by symbol. Bonds and metals are 100% zakatable.
                    </Typography>

                    {/* Summary */}
                    {(accountHoldings.some((h) => h.value > 0) || (snapshots[account.id]?.['_other_stocks'] ?? 0) > 0 || (snapshots[account.id]?.['_other_bonds'] ?? 0) > 0 || (snapshots[account.id]?.['_other_metals'] ?? 0) > 0) && (
                      <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Divider sx={{ mb: 0.5 }} />
                        {accountHoldings.filter((h) => h.symbol && h.value > 0).map((h, i) => (
                          <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption">
                              {h.symbol}{h.assetClass && h.assetClass !== 'stock' ? ` [${h.assetClass === 'commodity' ? 'metal' : h.assetClass}]` : ''}: {formatCurrency(h.value)} × {h.zakatablePercent}%
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>{formatCurrency(h.value * h.zakatablePercent / 100)}</Typography>
                          </Box>
                        ))}
                        {(snapshots[account.id]?.['_other_stocks'] ?? 0) > 0 && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">
                              Other stocks: {formatCurrency(snapshots[account.id]['_other_stocks'])} × {stockProxyValue}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                              {formatCurrency(snapshots[account.id]['_other_stocks'] * stockProxyValue / 100)}
                            </Typography>
                          </Box>
                        )}
                        {(snapshots[account.id]?.['_other_bonds'] ?? 0) > 0 && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">
                              Other bonds: {formatCurrency(snapshots[account.id]['_other_bonds'])} × 100%
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                              {formatCurrency(snapshots[account.id]['_other_bonds'])}
                            </Typography>
                          </Box>
                        )}
                        {(snapshots[account.id]?.['_other_metals'] ?? 0) > 0 && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">
                              Other metals: {formatCurrency(snapshots[account.id]['_other_metals'])} × 100%
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                              {formatCurrency(snapshots[account.id]['_other_metals'])}
                            </Typography>
                          </Box>
                        )}
                        <Divider sx={{ my: 0.5 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            Total Value: {formatCurrency(holdingsTotal + (snapshots[account.id]?.['_other_stocks'] ?? 0) + (snapshots[account.id]?.['_other_bonds'] ?? 0) + (snapshots[account.id]?.['_other_metals'] ?? 0))}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            Net Zakatable: {formatCurrency(
                              result.accountBreakdowns.find((b) => b.accountId === account.id)?.netZakatable ?? 0
                            )}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Card>
                </Box>
              );
            }

            // In per-symbol mode, hide bonds/gold fields (covered by Other Bonds/Metals)
            if (isPerSymbol && (asset === 'bonds' || asset === 'gold')) {
              return null;
            }

            return (
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

                {/* Per-symbol holdings toggle for stock_passive */}
                {asset === 'stock_passive' && canUsePerSymbol && (
                  <Box sx={{ mt: 1 }}>
                    <Button
                      size="small"
                      startIcon={<CalculateIcon />}
                      onClick={() => setUsePerSymbol((prev) => ({ ...prev, [account.id]: true }))}
                      sx={{ textTransform: 'none' }}
                    >
                      Calculate from specific holdings instead
                    </Button>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const hasRetirementAccounts = portfolio.accounts.some(
    (a) => ['retirement_traditional', 'retirement_roth', 'retirement_mixed', 'hsa'].includes(a.type)
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

        {/* Retirement Calculation Method */}
        {hasRetirementAccounts && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Retirement Account Method
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Per{' '}
                <Link href="https://fiqhcouncil.org/zakah-on-retirement-funds/" target="_blank" rel="noopener">
                  FCNA ruling
                </Link>
                {' '}— choose based on your intent for these funds.
              </Typography>
              <RadioGroup
                value={zakatMethod}
                onChange={(e) => setZakatMethod(e.target.value as ZakatMethod)}
              >
                <FormControlLabel
                  value="long_term"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Long-term Investment</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Zakatable % (stock proxy) only — no tax/penalty deductions
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="short_term"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Short-term / Liquid View</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Full market value minus taxes and penalties
                      </Typography>
                    </Box>
                  }
                />
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Stock Proxy — zakatable % for passive stocks */}
        <TextField
          label="Default Stock Proxy %"
          type="number"
          value={stockProxyPercent}
          onChange={(e) => setStockProxyPercent(e.target.value)}
          error={stockProxyPercent === '' || isNaN(parseFloat(stockProxyPercent))}
          slotProps={{
            input: {
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
            },
            htmlInput: { min: 0, max: 100 },
          }}
          fullWidth
          helperText={
            zakatMethod === 'long_term'
              ? 'Zakātable portion of passively-held stocks — cash, receivables & inventory in the underlying businesses. Look up your fund at zakat.zoya.finance.'
              : 'Only applies to standard (non-retirement) accounts in Short-term mode'
          }
        />

        {/* Saved Stock Symbols Registry */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Saved Fund Symbols
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Manage your fund/ETF zakatable percentages. These are available when entering per-symbol holdings in each account.
              {proxyLoaded && ` ${getAvailableSymbols().length}+ symbols auto-fill from financial data.`}
            </Typography>

            {localSymbols.length > 0 && (
              <Box sx={{ mb: 1 }}>
                {localSymbols.map((sym, idx) => (
                  <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Autocomplete
                      size="small"
                      freeSolo
                      options={allSymbolOptions}
                      value={sym.symbol}
                      onInputChange={(_e, value, reason) => {
                        if (reason === 'reset') return;
                        const normalized = value.toUpperCase().trim();
                        setLocalSymbols((prev) => prev.map((s, i) => i === idx ? { ...s, symbol: normalized } : s));
                      }}
                      onChange={(_e, value) => {
                        if (value) {
                          const normalized = value.toUpperCase().trim();
                          const proxyPct = getZakatPercentSync(normalized);
                          const pct = proxyPct !== null ? Math.round(proxyPct * 1000) / 10 : sym.zakatablePercent;
                          const ac = getAssetClassSync(normalized) ?? sym.assetClass;
                          setLocalSymbols((prev) => prev.map((s, i) => i === idx ? { ...s, symbol: normalized, zakatablePercent: pct, assetClass: ac } : s));
                        }
                      }}
                      onBlur={() => {
                        if (sym.symbol) {
                          const proxyPct = getZakatPercentSync(sym.symbol);
                          const ac = getAssetClassSync(sym.symbol);
                          if (proxyPct !== null || ac) {
                            const pct = proxyPct !== null ? Math.round(proxyPct * 1000) / 10 : sym.zakatablePercent;
                            setLocalSymbols((prev) => prev.map((s, i) => i === idx ? { ...s, zakatablePercent: pct, assetClass: ac ?? s.assetClass } : s));
                          }
                        }
                      }}
                      sx={{ width: 140 }}
                      renderInput={(params) => <TextField {...params} label="Symbol" />}
                    />
                    <FormControl size="small" sx={{ minWidth: 90 }}>
                      <Select
                        value={sym.assetClass ?? 'stock'}
                        onChange={(e) => {
                          const ac = e.target.value as StockSymbol['assetClass'];
                          const pct = ac !== 'stock' ? 100 : sym.zakatablePercent;
                          setLocalSymbols((prev) => prev.map((s, i) => i === idx ? { ...s, assetClass: ac, zakatablePercent: pct } : s));
                        }}
                        size="small"
                      >
                        <MenuItem value="stock">Stock</MenuItem>
                        <MenuItem value="bond">Bond</MenuItem>
                        <MenuItem value="commodity">Metal</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      size="small"
                      type="number"
                      value={sym.zakatablePercent}
                      disabled={(sym.assetClass ?? 'stock') !== 'stock'}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) {
                          setLocalSymbols((prev) =>
                            prev.map((s, i) => i === idx ? { ...s, zakatablePercent: Math.min(100, Math.max(0, v)) } : s)
                          );
                        }
                      }}
                      slotProps={{
                        input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                        htmlInput: { min: 0, max: 100, step: 0.1 },
                      }}
                      sx={{ width: 120 }}
                      label="Zakatable %"
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setLocalSymbols((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}

            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setLocalSymbols((prev) => [...prev, { symbol: '', zakatablePercent: 25 }])}
            >
              Add Symbol
            </Button>
          </CardContent>
        </Card>

        {/* Tax Rate */}
        <TextField
          label="Effective Tax Rate"
          type="number"
          value={taxRateStr}
          onChange={(e) => setTaxRateStr(e.target.value)}
          slotProps={{
            input: {
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
            },
          }}
          fullWidth
          helperText="Applied to Traditional retirement account portions (non-stock assets in long-term method, all assets in short-term method)"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={retirementEligible}
              onChange={(e) => setRetirementEligible(e.target.checked)}
              disabled={zakatMethod === 'long_term'}
            />
          }
          label={
            <Typography variant="body2" color={zakatMethod === 'long_term' ? 'text.disabled' : 'text.primary'}>
              I am 59½ or older (skip 10% early withdrawal penalty)
              {zakatMethod === 'long_term' && ' — not applicable for Long-term method'}
            </Typography>
          }
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
    if (activeStep === 0) {
      return renderSettingsStep();
    }
    if (activeStep <= portfolio.accounts.length) {
      return renderAccountStep(activeStep - 1);
    }
    return renderReviewStep();
  };

  return (
    <PageContainer title="Annual Zakat Review">
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <FormControl size="small" sx={{ minWidth: 200, flexGrow: 1 }}>
            <Select
              value={activeStep}
              onChange={(e) => setActiveStep(e.target.value as number)}
            >
              {steps.map((label, index) => (
                <MenuItem key={label} value={index}>
                  {index + 1}. {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {activeStep + 1} / {steps.length}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={((activeStep + 1) / steps.length) * 100}
          sx={{ height: 6, borderRadius: 3 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Net Zakatable: {formatCurrency(result.netZakatableWealth)}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }} color="primary">
            Est. Zakat: {formatCurrency(result.zakatDue)}
          </Typography>
        </Box>
        {hawlMonth && hawlDay && (() => {
          const gregDate = getNextHawlGregorian(hawlMonth as number, hawlDay as number);
          return (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              📅 Calculation Date: <strong>{gregDate ? gregDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : ''}</strong>
              {' '}({formatHijriDate(hawlMonth as number, hawlDay as number)})
              {' — enter asset values as of this date'}
            </Typography>
          );
        })()}
      </Box>

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
