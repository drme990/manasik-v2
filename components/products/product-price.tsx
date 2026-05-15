'use client';

import { usePriceInCurrency, useCurrency } from '@/hooks/currency-hook';
import { cn } from '@/lib/utils';
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
  const { isLoading } = useCurrency();

  // Show skeleton while currency is loading
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        {prefix && (
          <div className="h-4 w-16 rounded bg-primary animate-pulse" />
        )}
        <div className="h-6 w-24 rounded bg-primary animate-pulse" />
      </div>
    );
  }

  // Only get currency-converted price on client to avoid hydration mismatch
  const { amount, currency } = isClient
    ? getPrice(prices, defaultPrice, defaultCurrency)
    : { amount: defaultPrice, currency: defaultCurrency };

  return (
    <span className={cn('text-primary font-bold text-lg', className)}>
      {prefix && (
        <span className="text-secondary font-normal text-sm">{prefix} </span>
      )}
      {amount.toLocaleString()} {currency}
    </span>
  );
}
