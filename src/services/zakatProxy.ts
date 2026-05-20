/**
 * Service for loading and accessing the pre-computed zakat proxy data.
 * Fetches public/data/zakat-proxy.json and caches it in memory.
 */

import type { FundAssetClass } from '../types';

const DEFAULT_PROXY_KEY = 'zakatfolio_defaultProxy';

interface ZakatProxyData {
  generated: string;
  methodology: string;
  fallback: number;
  count: number;
  data: Record<string, number>;
  assetClasses?: Record<string, FundAssetClass>;
}

let cachedData: ZakatProxyData | null = null;
let loadPromise: Promise<ZakatProxyData | null> | null = null;

/**
 * Load the zakat proxy data (fetches once, then caches).
 */
export async function loadZakatProxy(): Promise<ZakatProxyData | null> {
  if (cachedData) return cachedData;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/zakat-proxy.json`);
      if (!res.ok) return null;
      cachedData = await res.json();
      return cachedData;
    } catch {
      return null;
    }
  })();

  return loadPromise;
}

/**
 * Get the zakatable percentage for a stock/ETF symbol.
 * Returns the percentage (0-1 scale) or null if not found.
 */
export async function getZakatPercent(symbol: string): Promise<number | null> {
  const data = await loadZakatProxy();
  if (!data) return null;
  const pct = data.data[symbol.toUpperCase()];
  return pct !== undefined ? pct : null;
}

/**
 * Get the zakatable percentage synchronously (from cache only).
 * Returns null if data hasn't been loaded yet or symbol not found.
 */
export function getZakatPercentSync(symbol: string): number | null {
  if (!cachedData) return null;
  const pct = cachedData.data[symbol.toUpperCase()];
  return pct !== undefined ? pct : null;
}

/**
 * Get the asset class for a symbol (stock, bond, or commodity).
 * Returns null if data hasn't been loaded or symbol not found in assetClasses.
 * Symbols not in assetClasses are assumed to be 'stock'.
 */
export function getAssetClassSync(symbol: string): FundAssetClass | null {
  if (!cachedData) return null;
  const upper = symbol.toUpperCase();
  // If it's in assetClasses, return that
  if (cachedData.assetClasses?.[upper]) return cachedData.assetClasses[upper];
  // If it's in data (but not in assetClasses), it's a stock
  if (cachedData.data[upper] !== undefined) return 'stock';
  return null;
}

/**
 * Get all available symbols from the proxy data.
 */
export function getAvailableSymbols(): string[] {
  if (!cachedData) return [];
  return Object.keys(cachedData.data);
}

/**
 * Get the generation date of the proxy data.
 */
export function getProxyGeneratedDate(): string | null {
  return cachedData?.generated ?? null;
}

/**
 * Get the default proxy percentage for stocks not in the data.
 * User-settable, persisted to localStorage.
 */
export function getDefaultProxy(): number {
  const stored = localStorage.getItem(DEFAULT_PROXY_KEY);
  if (stored !== null) {
    const val = parseFloat(stored);
    if (!isNaN(val)) return val;
  }
  return cachedData?.fallback ?? 0.30;
}

/**
 * Set the default proxy percentage (0-1 scale).
 */
export function setDefaultProxy(value: number): void {
  localStorage.setItem(DEFAULT_PROXY_KEY, String(value));
}

/**
 * Get the fallback percentage (for stocks not in the data).
 * @deprecated Use getDefaultProxy() instead
 */
export function getFallbackPercent(): number {
  return getDefaultProxy();
}
