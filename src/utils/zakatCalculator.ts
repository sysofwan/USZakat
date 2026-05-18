import type { Account, AccountBreakdown, Settings, StockHolding, ZakatResult } from '../types';

const ZAKAT_RATE = 0.025;
const EARLY_WITHDRAWAL_PENALTY = 0.10;
const HSA_WITHDRAWAL_PENALTY = 0.20;

/** Account types that are affected by the zakatMethod setting */
const RETIREMENT_TYPES = new Set(['retirement_traditional', 'retirement_roth', 'retirement_mixed', 'hsa']);

/**
 * Calculate the full market value of an account's assets (no proxy applied).
 * Sums all positive asset values; debts are excluded (handled separately).
 */
export function calculateMarketValue(assetValues: Record<string, number>): number {
  let total = 0;
  for (const [assetType, value] of Object.entries(assetValues)) {
    if (assetType === 'credit_card_short' || assetType === 'short_term_debt') {
      total -= value;
    } else if (assetType === 'credit_card_long' || assetType === 'loan') {
      // long-term debt is NOT counted
    } else {
      total += value;
    }
  }
  return total;
}

/**
 * Calculate the account-level zakatable base from sub-asset values.
 * Applies the stock proxy multiplier to passive stocks; everything else is 100%.
 *
 * When stockHoldings is provided, known holdings use their per-symbol zakatable %,
 * and any leftover (total stock_passive minus known holdings) uses the flat proxy.
 */
export function calculateAccountBase(
  assetValues: Record<string, number>,
  stockProxyPercent: number,
  stockHoldings?: StockHolding[]
): number {
  const stockProxy = stockProxyPercent / 100;
  let base = 0;
  for (const [assetType, value] of Object.entries(assetValues)) {
    if (assetType === 'stock_passive') {
      if (stockHoldings && stockHoldings.length > 0) {
        // Per-symbol: known holdings use their own %, leftover uses default proxy
        const knownTotal = stockHoldings.reduce((sum, h) => sum + h.value, 0);
        const knownZakatable = stockHoldings.reduce(
          (sum, h) => sum + h.value * (h.zakatablePercent / 100), 0
        );
        const leftover = Math.max(0, value - knownTotal);
        base += knownZakatable + leftover * stockProxy;
      } else {
        base += value * stockProxy;
      }
    } else if (assetType === 'credit_card_short' || assetType === 'short_term_debt') {
      base -= value; // short-term debt is deducted
    } else if (assetType === 'credit_card_long' || assetType === 'loan') {
      // long-term debt is NOT deducted for zakat
    } else {
      base += value;
    }
  }
  return base; // can be negative for debt accounts
}

/**
 * Apply wrapper-level deductions based on account type and zakat method.
 *
 * Method 1 (long_term): Stock proxy applied, NO tax/penalty deductions.
 *   Per FCNA ruling: zakatable % IS the zakatable amount for long-term investments.
 *
 * Method 2 (short_term): Full market value, THEN subtract tax and penalty.
 *   Per FCNA ruling: treating account as short-term liquid asset.
 *
 * These methods are mutually exclusive — mixing proxy with deductions is prohibited.
 */
export function calculateAccountNet(
  account: Account,
  assetValues: Record<string, number>,
  settings: Settings,
  rothPercent?: number,
  stockHoldings?: StockHolding[]
): AccountBreakdown {
  const marketValue = calculateMarketValue(assetValues);
  const isRetirement = RETIREMENT_TYPES.has(account.type);
  const method = settings.zakatMethod;

  // Per-symbol holdings only apply when proxy is used (not short_term retirement)
  const effectiveHoldings = (isRetirement && method === 'short_term') ? undefined : stockHoldings;

  // For Method 1: use proxy-applied base; for Method 2 retirement: use full market value
  const accountBase = (isRetirement && method === 'short_term')
    ? marketValue
    : calculateAccountBase(assetValues, settings.stockProxyPercent, effectiveHoldings);

  const penaltyRate = (isRetirement && method === 'short_term')
    ? (settings.retirementEligible ? 0 : (account.type === 'hsa' ? HSA_WITHDRAWAL_PENALTY : EARLY_WITHDRAWAL_PENALTY))
    : 0;
  const taxRate = (isRetirement && method === 'short_term')
    ? (account.type === 'retirement_roth' ? 0 : settings.taxRate / 100)
    : 0;

  let netZakatable: number;
  let rothPortion: number | undefined;
  let tradPortion: number | undefined;
  let effectiveRothPercent = rothPercent;

  switch (account.type) {
    case 'standard':
    case 'debt':
      netZakatable = accountBase;
      break;

    case 'retirement_traditional':
      // Method 1: accountBase already has proxy, no deductions
      // Method 2: accountBase is marketValue, deduct tax + penalty
      netZakatable = accountBase * (1 - taxRate - penaltyRate);
      break;

    case 'hsa':
      netZakatable = accountBase * (1 - taxRate - penaltyRate);
      break;

    case 'retirement_roth':
      // Method 1: accountBase has proxy, no deductions (taxRate=0, penaltyRate=0)
      // Method 2: accountBase is marketValue, deduct penalty only (taxRate=0)
      netZakatable = accountBase * (1 - penaltyRate);
      break;

    case 'retirement_mixed': {
      effectiveRothPercent = rothPercent ?? 50;
      const rothPct = effectiveRothPercent / 100;
      rothPortion = accountBase * rothPct;
      tradPortion = accountBase * (1 - rothPct);
      // Method 1: penaltyRate=0, taxRate=0 → net = accountBase (proxy-applied)
      // Method 2: deduct penalty from both, tax from trad portion only
      netZakatable =
        rothPortion * (1 - penaltyRate) +
        tradPortion * (1 - taxRate - penaltyRate);
      break;
    }

    default:
      netZakatable = accountBase;
  }

  // Ensure non-negative (except debt accounts which act as liabilities)
  if (account.type !== 'debt') {
    netZakatable = Math.max(0, netZakatable);
  }

  return {
    accountId: account.id,
    accountName: account.name,
    accountType: account.type,
    zakatMethod: method,
    rothPercent: effectiveRothPercent,
    assetValues,
    marketValue,
    accountBase,
    penaltyRate,
    taxRate,
    rothPortion,
    tradPortion,
    netZakatable,
    stockHoldings: effectiveHoldings,
  };
}

/**
 * Calculate the full zakat result across all accounts.
 */
export function calculateZakat(
  accounts: Account[],
  snapshots: Record<string, Record<string, number>>,
  settings: Settings,
  rothPercents?: Record<string, number>,
  stockHoldingsByAccount?: Record<string, StockHolding[]>
): ZakatResult {
  const accountBreakdowns: AccountBreakdown[] = [];
  let grossWealth = 0;
  let totalAccountBase = 0;
  let totalNetZakatable = 0;

  for (const account of accounts) {
    const assetValues = snapshots[account.id] || {};
    
    // Gross wealth excludes debt accounts
    if (account.type !== 'debt') {
      for (const value of Object.values(assetValues)) {
        grossWealth += value;
      }
    }

    const holdings = stockHoldingsByAccount?.[account.id];
    const breakdown = calculateAccountNet(account, assetValues, settings, rothPercents?.[account.id], holdings);
    accountBreakdowns.push(breakdown);
    totalAccountBase += breakdown.accountBase;
    totalNetZakatable += breakdown.netZakatable;
  }

  const netZakatableWealth = Math.max(0, totalNetZakatable);
  const meetsNisab = netZakatableWealth >= settings.nisab;
  const zakatDue = meetsNisab ? Math.round(netZakatableWealth * ZAKAT_RATE * 100) / 100 : 0;

  return {
    accountBreakdowns,
    grossWealth,
    totalAccountBase,
    totalNetZakatable,
    netZakatableWealth,
    meetsNisab,
    nisab: settings.nisab,
    zakatRate: ZAKAT_RATE,
    zakatDue,
  };
}

/**
 * Format a number as currency (USD).
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a number as a percentage string.
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
