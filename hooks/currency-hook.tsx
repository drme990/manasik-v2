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
  const { selectedCurrency, countries, exchangeRates, mainCurrencyCode } =
    useCurrency();
  const locale = useLocale();
  const isAr = locale === 'ar';

  return function getPrice(
    prices: { currencyCode: string; amount: number }[] | undefined,
    defaultPrice: number,
    defaultCurrency: string,
  ): { amount: number; currency: string } {
    let currencyDisplay: string;

    // If currency is still loading or not set, use default
    if (!selectedCurrency) {
      currencyDisplay = defaultCurrency;
      return { amount: defaultPrice, currency: currencyDisplay };
    }

    currencyDisplay = isAr ? selectedCurrency.symbol : selectedCurrency.code;

    // 1. Try Exchange Rate Conversion if enabled for this country
    const country = countries.find(
      (c) => c.code === selectedCurrency.countryCode,
    );
    const useExchange = country?.viewerVisibility?.exchangePrice === true;

    if (useExchange && exchangeRates && mainCurrencyCode) {
      // Try to find the price in the main user currency (the base for exchange)
      const basePriceMatch = prices?.find(
        (p) => p.currencyCode === mainCurrencyCode,
      );

      if (basePriceMatch) {
        const rate = exchangeRates[selectedCurrency.code.toUpperCase()];
        if (rate) {
          const convertedAmount = Math.ceil(basePriceMatch.amount * rate);
          return { amount: convertedAmount, currency: currencyDisplay };
        }
      }
    }

    // 2. Standard Match (use pre-defined price for this currency if exists)
    if (prices && prices.length > 0) {
      const match = prices.find(
        (p) => p.currencyCode === selectedCurrency.code,
      );
      if (match) {
        return { amount: Math.ceil(match.amount), currency: currencyDisplay };
      }
    }

    // 3. Fallback: use default price
    // If selected currency matches default currency, ensure we use the right display
    const finalDisplay =
      selectedCurrency.code === defaultCurrency
        ? currencyDisplay
        : isAr
          ? defaultCurrency
          : defaultCurrency;

    return { amount: Math.ceil(defaultPrice), currency: finalDisplay };
  };
}
