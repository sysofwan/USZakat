import type { Account, AccountBreakdown, Liability, Settings, ZakatResult } from '../types';

const ZAKAT_RATE = 0.025;
const PASSIVE_STOCK_PROXY = 0.25;
const EARLY_WITHDRAWAL_PENALTY = 0.10;

/**
 * Calculate the account-level zakatable base from sub-asset values.
 * Applies the 25% proxy to passive stocks; everything else is 100%.
 */
export function calculateAccountBase(assetValues: Record<string, number>): number {
  let base = 0;
  for (const [assetType, value] of Object.entries(assetValues)) {
    if (assetType === 'stock_passive') {
      base += value * PASSIVE_STOCK_PROXY;
    } else {
      base += value;
    }
  }
  return base;
}

/**
 * Apply wrapper-level deductions (tax/penalty) based on account type.
 */
export function calculateAccountNet(
  account: Account,
  assetValues: Record<string, number>,
  settings: Settings
): AccountBreakdown {
  const accountBase = calculateAccountBase(assetValues);
  const penaltyRate = settings.retirementEligible ? 0 : EARLY_WITHDRAWAL_PENALTY;
  const taxRate = settings.taxRate / 100;

  let netZakatable: number;
  let rothPortion: number | undefined;
  let tradPortion: number | undefined;

  switch (account.type) {
    case 'standard':
      netZakatable = accountBase;
      break;

    case 'retirement_traditional':
      netZakatable = accountBase * (1 - taxRate - penaltyRate);
      break;

    case 'retirement_roth':
      netZakatable = accountBase * (1 - penaltyRate);
      break;

    case 'retirement_mixed': {
      const rothPct = (account.rothPercent ?? 50) / 100;
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

  // Ensure non-negative
  netZakatable = Math.max(0, netZakatable);

  return {
    accountId: account.id,
    accountName: account.name,
    accountType: account.type,
    rothPercent: account.rothPercent,
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
  liabilities: Liability[],
  settings: Settings
): ZakatResult {
  const accountBreakdowns: AccountBreakdown[] = [];
  let grossWealth = 0;
  let totalAccountBase = 0;
  let totalNetZakatable = 0;

  for (const account of accounts) {
    const assetValues = snapshots[account.id] || {};
    
    // Gross wealth is the sum of all raw asset values
    for (const value of Object.values(assetValues)) {
      grossWealth += value;
    }

    const breakdown = calculateAccountNet(account, assetValues, settings);
    accountBreakdowns.push(breakdown);
    totalAccountBase += breakdown.accountBase;
    totalNetZakatable += breakdown.netZakatable;
  }

  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.amount, 0);
  const netZakatableWealth = Math.max(0, totalNetZakatable - totalLiabilities);
  const meetsNisab = netZakatableWealth >= settings.nisab;
  const zakatDue = meetsNisab ? netZakatableWealth * ZAKAT_RATE : 0;

  return {
    accountBreakdowns,
    grossWealth,
    totalAccountBase,
    totalNetZakatable,
    totalLiabilities,
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
