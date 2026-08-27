'use client';

import { useContext } from 'react';
import { CurrencyContext } from '@/components/providers/currency-provider';
import type { ResolvedPrice } from '@/types/Product';

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
}

/**
 * Get the display price for the currently selected currency.
 *
 * With backend-resolved pricing, this is a simple lookup:
 *   1. Find the entry in `resolvedPrices[]` matching the selected currency.
 *   2. If not found, return null (caller shows a skeleton).
 *
 * No exchange rate fetching, no conversion, no base-price fallback.
 * The backend ALWAYS sends resolvedPrices — if it's missing or doesn't
 * have the selected currency, we show a loading skeleton rather than
 * a wrong price.
 *
 * **IMPORTANT**: The `currency` field in the returned object is ALWAYS the
 * ISO 4217 currency code (e.g., "EGP", "SAR", "USD"), never the localized
 * symbol. This ensures the value sent to checkout/payment APIs is stable
 * regardless of the user's locale. Use `selectedCurrency.symbol` from
 * `useCurrency()` for display purposes only.
 *
 * @returns `getPrice()` which returns `{ amount, currency }` or `null`.
 */
export function usePriceInCurrency() {
  const { selectedCurrency, isLoading } = useCurrency();

  return function getPrice(
    resolvedPrices: ResolvedPrice[] | undefined,
  ): { amount: number; currency: string } | null {
    // While currency context is loading, return null so callers
    // can show a skeleton instead of the wrong currency.
    if (isLoading || !selectedCurrency) {
      return null;
    }

    // Only use resolvedPrices — never fall back to base price.
    // The backend always sends resolvedPrices for every visible currency.
    const match = resolvedPrices?.find(
      (p) => p.currencyCode === selectedCurrency.code,
    );
    if (match && typeof match.amount === 'number') {
      // ALWAYS return the ISO currency code, never the localized symbol.
      // The symbol is only for UI display; the code is for API calls.
      return { amount: match.amount, currency: selectedCurrency.code };
    }

    // No match — return null (caller shows skeleton)
    return null;
  };
}
