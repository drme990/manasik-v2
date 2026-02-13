'use client';

import { useContext } from 'react';
import { CurrencyContext } from '@/components/providers/currency-provider';

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
}

/**
 * Helper: Get price for the current selected currency from a product's prices array.
 */
export function usePriceInCurrency() {
  const { selectedCurrency } = useCurrency();

  return function getPrice(
    prices: { currencyCode: string; amount: number }[] | undefined,
    defaultPrice: number,
    defaultCurrency: string,
  ): { amount: number; currency: string } {
    if (prices && prices.length > 0) {
      const match = prices.find(
        (p) => p.currencyCode === selectedCurrency.code,
      );
      if (match) {
        return { amount: match.amount, currency: selectedCurrency.code };
      }
    }
    return { amount: defaultPrice, currency: defaultCurrency };
  };
}
