import type { PortfolioData } from '../types';
import { DEFAULT_PORTFOLIO } from '../types';

const STORAGE_KEY = 'zakatfolio_data';

export function loadPortfolio(): PortfolioData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        settings: { ...DEFAULT_PORTFOLIO.settings, ...parsed.settings },
        accounts: parsed.accounts ?? [],
        history: parsed.history ?? [],
        stockSymbols: parsed.stockSymbols ?? [],
      };
    }
  } catch (e) {
    console.error('Failed to load portfolio data:', e);
  }
  return { ...DEFAULT_PORTFOLIO, accounts: [], history: [] };
}

export function savePortfolio(data: PortfolioData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save portfolio data:', e);
  }
}

export function exportPortfolio(data: PortfolioData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `us-zakat-calculator-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function hasExistingData(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}
