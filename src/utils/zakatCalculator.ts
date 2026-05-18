import type { Account, AccountBreakdown, Settings, ZakatResult } from '../types';

const ZAKAT_RATE = 0.025;
const EARLY_WITHDRAWAL_PENALTY = 0.10;
const HSA_WITHDRAWAL_PENALTY = 0.20;

/**
 * Calculate the account-level zakatable base from sub-asset values.
 * Applies the stock proxy multiplier to passive stocks; everything else is 100%.
 */
export function calculateAccountBase(assetValues: Record<string, number>, stockProxyPercent: number): number {
  const stockProxy = stockProxyPercent / 100;
  let base = 0;
  for (const [assetType, value] of Object.entries(assetValues)) {
    if (assetType === 'stock_passive') {
      base += value * stockProxy;
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
 * Apply wrapper-level deductions (tax/penalty) based on account type.
 * rothPercent is passed in separately (set during annual review, not account creation).
 */
export function calculateAccountNet(
  account: Account,
  assetValues: Record<string, number>,
  settings: Settings,
  rothPercent?: number
): AccountBreakdown {
  const accountBase = calculateAccountBase(assetValues, settings.stockProxyPercent);
  const penaltyRate = settings.retirementEligible ? 0 : EARLY_WITHDRAWAL_PENALTY;
  const taxRate = settings.taxRate / 100;

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
      netZakatable = accountBase * (1 - taxRate - penaltyRate);
      break;

    case 'hsa':
      netZakatable = accountBase * (1 - taxRate - HSA_WITHDRAWAL_PENALTY);
      break;

    case 'retirement_roth':
      netZakatable = accountBase * (1 - penaltyRate);
      break;

    case 'retirement_mixed': {
      effectiveRothPercent = rothPercent ?? 50;
      const rothPct = effectiveRothPercent / 100;
      rothPortion = accountBase * rothPct;
      tradPortion = accountBase * (1 - rothPct);
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
    rothPercent: effectiveRothPercent,
    assetValues,
    accountBase,
    penaltyRate,
    taxRate,
    rothPortion,
    tradPortion,
    netZakatable,
  };
}

/**
 * Calculate the full zakat result across all accounts.
 */
export function calculateZakat(
  accounts: Account[],
  snapshots: Record<string, Record<string, number>>,
  settings: Settings,
  rothPercents?: Record<string, number>
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

    const breakdown = calculateAccountNet(account, assetValues, settings, rothPercents?.[account.id]);
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
