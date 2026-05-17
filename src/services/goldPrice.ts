const GOLD_NISAB_GRAMS = 85; // 85 grams of gold = Nisab threshold

interface MetalPrice {
  pricePerGram: number;
  currency: string;
  timestamp: string;
}

/**
 * Fetch current gold price from a free API.
 * Falls back gracefully if the API is unavailable.
 * Uses goldapi.io or a similar free service.
 */
export async function fetchGoldPrice(): Promise<MetalPrice | null> {
  try {
    // Using a free metals price API
    const response = await fetch(
      'https://api.metalpriceapi.com/v1/latest?api_key=demo&base=USD&currencies=XAU'
    );
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // XAU is price per troy ounce, convert to per gram
    // 1 troy ounce = 31.1035 grams
    if (data.rates?.USDXAU) {
      const pricePerOunce = 1 / data.rates.USDXAU;
      const pricePerGram = pricePerOunce / 31.1035;
      
      return {
        pricePerGram,
        currency: 'USD',
        timestamp: new Date().toISOString(),
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
