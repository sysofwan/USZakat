export type AccountType = 'standard' | 'retirement_traditional' | 'retirement_roth' | 'retirement_mixed';

export type AssetType = 'cash' | 'stock_passive' | 'stock_active' | 'bonds' | 'gold';

export const ASSET_LABELS: Record<AssetType, string> = {
  cash: 'Cash',
  stock_passive: 'Stocks (Passive/Long-term)',
  stock_active: 'Stocks (Active Trading)',
  bonds: 'Bonds / Fixed Income',
  gold: 'Gold & Silver ETFs',
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  standard: 'Standard (Brokerage/Bank)',
  retirement_traditional: 'Retirement (Traditional)',
  retirement_roth: 'Retirement (Roth)',
  retirement_mixed: 'Retirement (Mixed)',
};

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  rothPercent?: number; // 0-100, only for retirement_mixed
  assets: AssetType[];
}

export interface Settings {
  nisab: number;
  taxRate: number; // effective tax rate in % (e.g. 22 means 22%)
  retirementEligible: boolean; // true = skip 10% penalty (59½+)
}

export interface Liability {
  id: string;
  description: string;
  amount: number;
}

export interface AccountSnapshot {
  [assetType: string]: number; // e.g. { cash: 5000, stock_passive: 40000 }
}

export interface AccountBreakdown {
  accountId: string;
  accountName: string;
  accountType: AccountType;
  rothPercent?: number;
  assetValues: Record<string, number>;
  accountBase: number; // after 25% proxy etc.
  penaltyRate: number;
  taxRate: number;
  rothPortion?: number;
  tradPortion?: number;
  netZakatable: number;
}

export interface ZakatResult {
  accountBreakdowns: AccountBreakdown[];
  grossWealth: number;
  totalAccountBase: number;
  totalNetZakatable: number;
  totalLiabilities: number;
  netZakatableWealth: number;
  meetsNisab: boolean;
  nisab: number;
  zakatRate: number; // 0.025
  zakatDue: number;
}

export interface HistoryEntry {
  id: string;
  year: number;
  date: string; // ISO string
  totalZakat: number;
  zakatableWealth: number;
  grossWealth: number;
  notes: string;
  snapshots: Record<string, AccountSnapshot>;
  liabilities: Liability[];
  settings: Settings;
  accountBreakdowns: AccountBreakdown[];
}

export interface PortfolioData {
  settings: Settings;
  accounts: Account[];
  history: HistoryEntry[];
}

export const DEFAULT_SETTINGS: Settings = {
  nisab: 5500,
  taxRate: 22,
  retirementEligible: false,
};

export const DEFAULT_PORTFOLIO: PortfolioData = {
  settings: { ...DEFAULT_SETTINGS },
  accounts: [],
  history: [],
};
