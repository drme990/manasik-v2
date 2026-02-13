/**
 * Currency conversion service using Exchange Rate API (free tier).
 * Fetches live rates and converts prices between currencies.
 *
 * Uses: https://open.er-api.com/v6/latest/{base}
 * Free, no API key required, updates daily.
 */

interface ExchangeRateResponse {
  result: string;
  base_code: string;
  rates: Record<string, number>;
  time_last_update_utc: string;
}

// In-memory cache with TTL (1 hour)
const cache: Map<string, { data: ExchangeRateResponse; expiry: number }> =
  new Map();

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get exchange rates for a given base currency.
 */
export async function getExchangeRates(
  baseCurrency: string,
): Promise<Record<string, number>> {
  const key = baseCurrency.toUpperCase();
  const cached = cache.get(key);

  if (cached && cached.expiry > Date.now()) {
    return cached.data.rates;
  }

  try {
    const res = await fetch(
      `https://open.er-api.com/v6/latest/${key}`,
      { next: { revalidate: 3600 } }, // Cache for 1 hour in Next.js
    );

    if (!res.ok) {
      throw new Error(`Exchange rate API returned ${res.status}`);
    }

    const data: ExchangeRateResponse = await res.json();

    if (data.result !== 'success') {
      throw new Error(`Exchange rate API error: ${data.result}`);
    }

    cache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });

    return data.rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    // Return cached data even if expired, as fallback
    if (cached) return cached.data.rates;
    throw error;
  }
}

/**
 * Convert an amount from one currency to another.
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): Promise<number> {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return amount;
  }

  const rates = await getExchangeRates(fromCurrency.toUpperCase());
  const rate = rates[toCurrency.toUpperCase()];

  if (!rate) {
    throw new Error(
      `No exchange rate found for ${fromCurrency} → ${toCurrency}`,
    );
  }

  // Round to 2 decimal places
  return Math.round(amount * rate * 100) / 100;
}

/**
 * Convert a base price to multiple currencies at once.
 * Returns a map of currency code → converted amount.
 */
export async function convertToMultipleCurrencies(
  amount: number,
  baseCurrency: string,
  targetCurrencies: string[],
): Promise<Record<string, number>> {
  const rates = await getExchangeRates(baseCurrency.toUpperCase());
  const result: Record<string, number> = {};

  for (const target of targetCurrencies) {
    const code = target.toUpperCase();
    if (code === baseCurrency.toUpperCase()) {
      result[code] = amount;
    } else if (rates[code]) {
      result[code] = Math.round(amount * rates[code] * 100) / 100;
    }
  }

  return result;
}
