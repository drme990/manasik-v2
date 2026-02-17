'use client';

import { useContext } from 'react';
import { CurrencyContext } from '@/components/providers/currency-provider';
import { useLocale } from 'next-intl';

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
}

/**
 * Helper: Get price for the current selected currency from a product's prices array.
 * Returns locale-aware currency display (code for EN, symbol for AR).
 */
export function usePriceInCurrency() {
  const { selectedCurrency } = useCurrency();
  const locale = useLocale();
  const isAr = locale === 'ar';

  return function getPrice(
    prices: { currencyCode: string; amount: number }[] | undefined,
    defaultPrice: number,
    defaultCurrency: string,
  ): { amount: number; currency: string } {
    let currencyDisplay: string;

    if (prices && prices.length > 0) {
      const match = prices.find(
        (p) => p.currencyCode === selectedCurrency.code,
      );
      if (match) {
        currencyDisplay = isAr
          ? selectedCurrency.symbol
          : selectedCurrency.code;
        return { amount: match.amount, currency: currencyDisplay };
      }
    }

    // Fallback: use defaultCurrency code for EN, try to get symbol for AR
    currencyDisplay = isAr
      ? selectedCurrency.code === defaultCurrency
        ? selectedCurrency.symbol
        : defaultCurrency
      : defaultCurrency;
    return { amount: defaultPrice, currency: currencyDisplay };
  };
}
