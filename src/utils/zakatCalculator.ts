import type { Account, AccountBreakdown, AccountType, Settings, StockHolding, ZakatMethod, ZakatResult } from '../types';

const ZAKAT_RATE = 0.025;
const EARLY_WITHDRAWAL_PENALTY = 0.10;
const HSA_WITHDRAWAL_PENALTY = 0.20;

/** Account types that are affected by the zakatMethod setting */
const RETIREMENT_TYPES: ReadonlySet<string> = new Set<AccountType>(['retirement_traditional', 'retirement_roth', 'retirement_mixed', 'hsa']);

/** Whether a retirement method values the account at full market value (no stock proxy). */
export function usesFullMarketValue(method: ZakatMethod): boolean {
  return method === 'short_term';
}

/** Whether a retirement method deducts tax and early-withdrawal penalty. */
export function deductsTaxAndPenalty(method: ZakatMethod): boolean {
  return method !== 'long_term';
}

/**
 * Early-withdrawal penalty for a retirement account.
 * Retirement accounts: 10%, waived at 59½+. HSA: 20% on non-medical withdrawals, waived at 65+.
 */
export function getPenaltyRate(accountType: AccountType, settings: Pick<Settings, 'retirementEligible' | 'hsaEligible'>): number {
  if (!RETIREMENT_TYPES.has(accountType)) return 0;
  if (accountType === 'hsa') return settings.hsaEligible ? 0 : HSA_WITHDRAWAL_PENALTY;
  return settings.retirementEligible || settings.hsaEligible ? 0 : EARLY_WITHDRAWAL_PENALTY;
}

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
 * Apply wrapper-level deductions based on account type and zakat method.
 *
 * FCNA long_term: Zakatable base only (stock proxy applied; cash, bonds, metals,
 *   bitcoin at 100%). No tax or penalty deductions, since they will not be incurred.
 *
 * FCNA short_term: Full market value, THEN subtract tax and penalty,
 *   treating the account as a short-term liquid asset.
 *
 * AMJA (amja): Zakatable base (stock proxy applied), THEN subtract tax and penalty,
 *   since zakat is due only on the amount one could access today.
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
  const fullMarketValue = isRetirement && usesFullMarketValue(settings.zakatMethod);
  const applyDeductions = isRetirement && deductsTaxAndPenalty(settings.zakatMethod);

  // Per-symbol holdings only apply when proxy is used (not FCNA short_term retirement)
  const effectiveHoldings = fullMarketValue ? undefined : stockHoldings;

  // FCNA short_term retirement: use full market value
  // Otherwise: use proxy-applied base
  const accountBase = fullMarketValue
    ? marketValue
    : calculateAccountBase(assetValues, settings.stockProxyPercent, effectiveHoldings);

  // Tax and penalty only apply to retirement accounts under FCNA short_term or AMJA
  const penaltyRate = applyDeductions ? getPenaltyRate(account.type, settings) : 0;
  const taxRate = applyDeductions && account.type !== 'retirement_roth'
    ? settings.taxRate / 100
    : 0;

  // Clamp deduction factors to prevent negative multipliers
  const tradFactor = Math.max(0, 1 - taxRate - penaltyRate);
  const rothFactor = Math.max(0, 1 - penaltyRate);

  let netZakatable: number;
  let rothPortion: number | undefined;
  let tradPortion: number | undefined;
  let effectiveRothPercent = rothPercent;

  switch (account.type) {
    case 'retirement_traditional':
    case 'hsa':
      netZakatable = accountBase * tradFactor;
      break;

    case 'retirement_roth':
      netZakatable = accountBase * rothFactor;
      break;

    case 'retirement_mixed': {
      effectiveRothPercent = rothPercent ?? 50;
      const rothPct = effectiveRothPercent / 100;
      rothPortion = accountBase * rothPct;
      tradPortion = accountBase * (1 - rothPct);
      netZakatable =
        rothPortion * rothFactor +
        tradPortion * tradFactor;
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
    zakatMethod: settings.zakatMethod,
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
      grossWealth += calculateMarketValue(assetValues);
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
