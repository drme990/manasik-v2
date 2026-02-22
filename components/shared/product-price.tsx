'use client';

import { usePriceInCurrency } from '@/hooks/currency-hook';
import { CurrencyPrice } from '@/types/Product';
import { useSyncExternalStore } from 'react';

interface ProductPriceProps {
  prices?: CurrencyPrice[];
  defaultPrice: number;
  defaultCurrency: string;
  className?: string;
  /** Optional text displayed before the price (e.g. "Starts from"). */
  prefix?: string;
}

// Subscribe to client-side hydration state
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export default function ProductPrice({
  prices,
  defaultPrice,
  defaultCurrency,
  className = '',
  prefix,
}: ProductPriceProps) {
  const isClient = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const getPrice = usePriceInCurrency();

  // Only get currency-converted price on client to avoid hydration mismatch
  const { amount, currency } = isClient
    ? getPrice(prices, defaultPrice, defaultCurrency)
    : { amount: defaultPrice, currency: defaultCurrency };

  return (
    <span className={className}>
      {prefix && (
        <span className="text-secondary font-normal text-sm">{prefix} </span>
      )}
      {amount.toLocaleString()} {currency}
    </span>
  );
}
