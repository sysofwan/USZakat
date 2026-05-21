export type AccountType = 'standard' | 'retirement_traditional' | 'retirement_roth' | 'retirement_mixed' | 'hsa' | 'debt';

export type ZakatMethod = 'long_term' | 'short_term';

export type AssetType = 'cash' | 'stock_passive' | 'stock_active' | 'bonds' | 'gold' | 'short_term_debt' | 'credit_card_short' | 'credit_card_long' | 'loan';

export const ASSET_LABELS: Record<AssetType, string> = {
  cash: 'Cash',
  stock_passive: 'Stocks (Passive/Long-term)',
  stock_active: 'Stocks (Active Trading)',
  bonds: 'Bonds / Fixed Income',
  gold: 'Gold & Silver ETFs',
  short_term_debt: 'Short-term Debt',
  credit_card_short: 'Credit Card (Short-term)',
  credit_card_long: 'Credit Card (Long-term)',
  loan: 'Loan (Mortgage, Student, Auto)',
};

/** Asset types that are NOT deducted from the zakatable base */
export const NON_DEDUCTIBLE_ASSETS: AssetType[] = ['credit_card_long', 'loan'];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  standard: 'Standard (Brokerage/Bank)',
  retirement_traditional: 'Retirement (Traditional)',
  retirement_roth: 'Retirement (Roth)',
  retirement_mixed: 'Retirement (Mixed)',
  hsa: 'HSA (Health Savings Account)',
  debt: 'Debt Account',
};

export const ACCOUNT_TYPE_DESCRIPTIONS: Record<AccountType, string> = {
  standard: 'Taxable brokerage or bank accounts. No tax or penalty deductions applied — full value is zakatable.',
  retirement_traditional: 'Pre-tax retirement accounts (Traditional 401k, Traditional IRA). Calculation depends on your chosen Zakat method.',
  retirement_roth: 'After-tax retirement accounts (Roth 401k, Roth IRA). Calculation depends on your chosen Zakat method.',
  retirement_mixed: 'Retirement accounts with both Roth and Traditional contributions. Specify the split during your annual review.',
  hsa: 'Health Savings Account. Treated similarly to retirement accounts for zakat purposes.',
  debt: 'Track your debts. Short-term debts are deducted from your zakatable wealth; long-term debts are tracked but not deducted.',
};

/** Which asset types are available for each account type */
export const ACCOUNT_ASSET_MAP: Record<AccountType, AssetType[]> = {
  standard: ['cash', 'stock_passive', 'stock_active', 'bonds', 'gold'],
  retirement_traditional: ['cash', 'stock_passive', 'stock_active', 'bonds', 'gold'],
  retirement_roth: ['cash', 'stock_passive', 'stock_active', 'bonds', 'gold'],
  retirement_mixed: ['cash', 'stock_passive', 'stock_active', 'bonds', 'gold'],
  hsa: ['cash', 'stock_passive', 'stock_active', 'bonds', 'gold'],
  debt: ['short_term_debt', 'credit_card_short', 'credit_card_long', 'loan'],
};

export type FundAssetClass = 'stock' | 'bond' | 'commodity';

export interface StockSymbol {
  symbol: string;          // normalized to uppercase, e.g. "VOO"
  zakatablePercent: number; // e.g. 24.8
  assetClass?: FundAssetClass; // default 'stock'
}

export interface StockHolding {
  symbol: string;          // references a StockSymbol
  value: number;           // dollar amount (market value)
  zakatablePercent: number; // snapshot at review time (not looked up from registry)
  assetClass?: FundAssetClass; // default 'stock'
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  assets: AssetType[];
}

export interface Settings {
  nisab: number;
  taxRate: number; // effective tax rate in % (e.g. 22 means 22%)
  retirementEligible: boolean; // true = skip 10% penalty (59½+)
  zakatMethod: ZakatMethod; // long_term = proxy only, short_term = deduct tax/penalty
  hawlMonth?: number; // Hijri month (1-12)
  hawlDay?: number;   // Hijri day (1-30)
  stockProxyPercent: number; // passive stock zakatable proxy (default 30%)
  dismissedHawlYears?: number[]; // Hijri years where overdue warning was dismissed
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
  zakatMethod: ZakatMethod;
  rothPercent?: number;
  assetValues: Record<string, number>;
  marketValue: number; // full market value before any deductions or proxy
  accountBase: number; // after stock proxy (Method 1) or same as marketValue (Method 2)
  penaltyRate: number;
  taxRate: number;
  rothPortion?: number;
  tradPortion?: number;
  netZakatable: number;
  stockHoldings?: StockHolding[]; // per-symbol holdings if used (for display)
}

export interface ZakatResult {
  accountBreakdowns: AccountBreakdown[];
  grossWealth: number;
  totalAccountBase: number;
  totalNetZakatable: number;
  netZakatableWealth: number;
  meetsNisab: boolean;
  nisab: number;
  zakatRate: number; // 0.025
  zakatDue: number;
}

export interface ZakatPayment {
  id: string;
  recipient: string;
  amount: number;
  date: string; // ISO string
}

export interface HistoryEntry {
  id: string;
  year: number; // Hijri year (AH)
  gregorianYear: number; // Gregorian year (CE)
  date: string; // ISO string (Gregorian)
  totalZakat: number;
  zakatableWealth: number;
  grossWealth: number;
  notes: string;
  snapshots: Record<string, AccountSnapshot>;
  liabilities: Liability[];
  settings: Settings;
  accountBreakdowns: AccountBreakdown[];
  payments: ZakatPayment[];
  stockHoldings?: Record<string, StockHolding[]>; // accountId -> holdings (if per-symbol used)
}

export interface DraftReview {
  activeStep: number;
  snapshots: Record<string, Record<string, number>>;
  rothPercents: Record<string, number>;
  nisab: number;
  taxRate: number;
  retirementEligible: boolean;
  zakatMethod: ZakatMethod;
  stockProxyPercent: number;
  selectedYearIdx: number;
  stockHoldings: Record<string, StockHolding[]>;
  usePerSymbol: Record<string, boolean>;
  lastUpdated: string; // ISO date string
}

export interface PortfolioData {
  settings: Settings;
  accounts: Account[];
  history: HistoryEntry[];
  stockSymbols: StockSymbol[]; // global registry of fund symbols + zakatable %
  draftReview?: DraftReview; // in-progress annual review
}

export const DEFAULT_SETTINGS: Settings = {
  nisab: 5500,
  taxRate: 22,
  retirementEligible: false,
  zakatMethod: 'long_term',
  stockProxyPercent: 30,
};

export const DEFAULT_PORTFOLIO: PortfolioData = {
  settings: { ...DEFAULT_SETTINGS },
  accounts: [],
  history: [],
  stockSymbols: [],
};
