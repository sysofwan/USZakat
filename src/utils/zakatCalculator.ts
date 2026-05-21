import type { Account, AccountBreakdown, AccountType, AssetType, Settings, StockHolding, ZakatResult } from '../types';

const ZAKAT_RATE = 0.025;
const EARLY_WITHDRAWAL_PENALTY = 0.10;
const HSA_WITHDRAWAL_PENALTY = 0.20;

/** Account types that are affected by the zakatMethod setting */
const RETIREMENT_TYPES: ReadonlySet<string> = new Set<AccountType>(['retirement_traditional', 'retirement_roth', 'retirement_mixed', 'hsa']);

const STOCK_ASSETS: ReadonlySet<string> = new Set<AssetType>(['stock_passive', 'stock_active']);

function isShortTermDebt(assetType: string): boolean {
  return assetType === 'credit_card_short' || assetType === 'short_term_debt';
}

function isLongTermDebt(assetType: string): boolean {
  return assetType === 'credit_card_long' || assetType === 'loan';
}

/**
 * Calculate the full market value of an account's assets (no proxy applied).
 * Sums all positive asset values; debts are excluded (handled separately).
 */
export function calculateMarketValue(assetValues: Record<string, number>): number {
  let total = 0;
  for (const [assetType, value] of Object.entries(assetValues)) {
    if (assetType === '_other_stocks') continue; // folded into stock_passive by UI
    if (isShortTermDebt(assetType)) {
      total -= value;
    } else if (isLongTermDebt(assetType)) {
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
    if (assetType === '_other_stocks') continue; // folded into stock_passive by UI
    if (assetType === '_other_bonds' || assetType === '_other_metals') {
      base += value; // 100% zakatable
    } else if (assetType === 'stock_passive') {
      if (stockHoldings && stockHoldings.length > 0) {
        // Cap known holdings total to the stock_passive bucket value
        const knownTotal = Math.min(
          stockHoldings.reduce((sum, h) => sum + h.value, 0),
          value
        );
        // Scale holdings proportionally if they exceed bucket
        const rawTotal = stockHoldings.reduce((sum, h) => sum + h.value, 0);
        const scale = rawTotal > value ? value / rawTotal : 1;
        const knownZakatable = stockHoldings.reduce(
          (sum, h) => sum + h.value * scale * (h.zakatablePercent / 100), 0
        );
        const leftover = Math.max(0, value - knownTotal);
        base += knownZakatable + leftover * stockProxy;
      } else {
        base += value * stockProxy;
      }
    } else if (isShortTermDebt(assetType)) {
      base -= value;
    } else if (isLongTermDebt(assetType)) {
      // long-term debt is NOT deducted for zakat
    } else {
      base += value;
    }
  }
  return base; // can be negative for debt accounts
}

/**
 * Split a retirement account's zakatable base into stock vs non-stock portions.
 * Stock portion uses proxy (already zakatable); non-stock portion needs deductions.
 */
function splitRetirementBase(
  assetValues: Record<string, number>,
  stockProxyPercent: number,
  stockHoldings?: StockHolding[]
): { stockBase: number; nonStockBase: number } {
  const stockProxy = stockProxyPercent / 100;
  let stockBase = 0;
  let nonStockBase = 0;

  for (const [assetType, value] of Object.entries(assetValues)) {
    if (isLongTermDebt(assetType)) {
      continue;
    } else if (isShortTermDebt(assetType)) {
      nonStockBase -= value;
    } else if (STOCK_ASSETS.has(assetType)) {
      if (assetType === 'stock_passive') {
        if (stockHoldings && stockHoldings.length > 0) {
          // Cap known holdings total to the stock_passive bucket value
          const rawTotal = stockHoldings.reduce((sum, h) => sum + h.value, 0);
          const scale = rawTotal > value ? value / rawTotal : 1;
          const knownTotal = Math.min(rawTotal, value);

          // Stock holdings: proxy already discounts, no deductions needed
          const stockHoldingsOnly = stockHoldings.filter(h => (h.assetClass ?? 'stock') === 'stock');
          const stockZakatable = stockHoldingsOnly.reduce(
            (sum, h) => sum + h.value * scale * (h.zakatablePercent / 100), 0
          );
          // Bond/commodity holdings: 100% zakatable but locked in retirement (deductions apply)
          const nonStockHoldings = stockHoldings.filter(h => h.assetClass === 'bond' || h.assetClass === 'commodity');
          const nonStockZakatable = nonStockHoldings.reduce(
            (sum, h) => sum + h.value * scale * (h.zakatablePercent / 100), 0
          );
          stockBase += stockZakatable;
          nonStockBase += nonStockZakatable;
          // Leftover uses default stock proxy (assumed to be stock)
          const leftover = Math.max(0, value - knownTotal);
          stockBase += leftover * stockProxy;
        } else {
          stockBase += value * stockProxy;
        }
      } else {
        // stock_active: 100% zakatable, still a stock asset (no deductions needed)
        stockBase += value;
      }
    } else {
      // cash, gold, bonds — full value, will have deductions applied
      nonStockBase += value;
    }
  }

  return { stockBase, nonStockBase };
}

/**
 * Apply wrapper-level deductions based on account type and zakat method.
 *
 * Method 1 (long_term): Stock assets use proxy (no deductions).
 *   Non-stock assets (cash, gold, bonds) in retirement accounts still need tax/penalty
 *   deductions since they're locked in the retirement wrapper.
 *
 * Method 2 (short_term): Full market value, THEN subtract tax and penalty.
 *   Per FCNA ruling: treating account as short-term liquid asset.
 *
 * For retirement accounts on long_term method, the calculation splits by asset class:
 *   - Stocks: proxy is the zakatable amount (per FCNA long-term ruling)
 *   - Non-stocks: full value minus tax/penalty (trapped in retirement wrapper)
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

  // For Method 2 (short_term) retirement: use full market value
  // For Method 1 (long_term) or non-retirement: use proxy-applied base
  const accountBase = (isRetirement && method === 'short_term')
    ? marketValue
    : calculateAccountBase(assetValues, settings.stockProxyPercent, effectiveHoldings);

  const penaltyRate = isRetirement
    ? (settings.retirementEligible ? 0 : (account.type === 'hsa' ? HSA_WITHDRAWAL_PENALTY : EARLY_WITHDRAWAL_PENALTY))
    : 0;
  const taxRate = isRetirement
    ? (account.type === 'retirement_roth' ? 0 : settings.taxRate / 100)
    : 0;

  // Clamp deduction factors to prevent negative multipliers
  const tradFactor = Math.max(0, 1 - taxRate - penaltyRate);
  const rothFactor = Math.max(0, 1 - penaltyRate);

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
    case 'hsa':
      if (method === 'long_term') {
        const { stockBase, nonStockBase } = splitRetirementBase(assetValues, settings.stockProxyPercent, effectiveHoldings);
        netZakatable = stockBase + nonStockBase * tradFactor;
      } else {
        netZakatable = accountBase * tradFactor;
      }
      break;

    case 'retirement_roth':
      if (method === 'long_term') {
        const { stockBase, nonStockBase } = splitRetirementBase(assetValues, settings.stockProxyPercent, effectiveHoldings);
        netZakatable = stockBase + nonStockBase * rothFactor;
      } else {
        netZakatable = accountBase * rothFactor;
      }
      break;

    case 'retirement_mixed': {
      effectiveRothPercent = rothPercent ?? 50;
      const rothPct = effectiveRothPercent / 100;

      if (method === 'long_term') {
        const { stockBase, nonStockBase } = splitRetirementBase(assetValues, settings.stockProxyPercent, effectiveHoldings);
        const rothNonStock = nonStockBase * rothPct;
        const tradNonStock = nonStockBase * (1 - rothPct);
        rothPortion = stockBase * rothPct + rothNonStock;
        tradPortion = stockBase * (1 - rothPct) + tradNonStock;
        netZakatable =
          stockBase +
          rothNonStock * rothFactor +
          tradNonStock * tradFactor;
      } else {
        rothPortion = accountBase * rothPct;
        tradPortion = accountBase * (1 - rothPct);
        netZakatable =
          rothPortion * rothFactor +
          tradPortion * tradFactor;
      }
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
