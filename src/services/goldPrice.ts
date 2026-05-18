const GOLD_NISAB_GRAMS = 85; // 85 grams of gold = Nisab threshold
const TROY_OUNCE_GRAMS = 31.1035;

interface MetalPrice {
  pricePerGram: number;
  currency: string;
  timestamp: string;
}

/**
 * Fetch current gold price from Gold-API.com (free, no auth, CORS-enabled).
 * Returns price per gram in USD. Falls back gracefully if unavailable.
 */
export async function fetchGoldPrice(): Promise<MetalPrice | null> {
  try {
    const response = await fetch('https://api.gold-api.com/price/XAU');

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();

    // API returns price per troy ounce in USD
    if (data.price && typeof data.price === 'number') {
      const pricePerGram = data.price / TROY_OUNCE_GRAMS;

      return {
        pricePerGram,
        currency: data.currency || 'USD',
        timestamp: data.updatedAt || new Date().toISOString(),
      };
    }

    return null;
  } catch (error) {
    console.warn('Failed to fetch gold price:', error);
    return null;
  }
}

/**
 * Calculate the Nisab threshold in USD based on gold price.
 */
export function calculateNisab(pricePerGram: number): number {
  return Math.round(pricePerGram * GOLD_NISAB_GRAMS);
}

export { GOLD_NISAB_GRAMS };
