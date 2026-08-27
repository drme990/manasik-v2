export async function fetchExchangeRates(baseCurrency: string): Promise<Record<string, number>> {
  const currencyKey = baseCurrency.toLowerCase();

  // 1. Try @latest (always available)
  try {
    const response = await fetch(
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${currencyKey}.json`,
    );
    if (response.ok) {
      const data = await response.json();
      const rates = data[currencyKey];
      if (rates && typeof rates === 'object') {
        const normalizedRates: Record<string, number> = {};
        for (const [currency, rate] of Object.entries(rates as Record<string, number>)) {
          normalizedRates[currency.toUpperCase()] = rate;
        }
        return normalizedRates;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch @latest rates:', error);
  }

  // 2. Fallback: try today, then yesterday
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const dates = [today, yesterday.toISOString().split('T')[0]];

  for (const date of dates) {
    try {
      const response = await fetch(
        `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/${currencyKey}.json`,
      );
      if (!response.ok) continue;

      const data = await response.json();
      const rates = data[currencyKey];

      if (!rates || typeof rates !== 'object') continue;

      const normalizedRates: Record<string, number> = {};
      for (const [currency, rate] of Object.entries(rates as Record<string, number>)) {
        normalizedRates[currency.toUpperCase()] = rate;
      }

      return normalizedRates;
    } catch (error) {
      console.warn(`Failed to fetch rates for ${date}:`, error);
    }
  }

  throw new Error(`Unable to fetch exchange rates for ${baseCurrency}`);
}
