'use client';

import { usePriceInCurrency, useCurrency } from '@/hooks/currency-hook';
import { cn } from '@/lib/utils';
import type { ResolvedPrice, CurrencyPrice } from '@/types/Product';

interface ProductPriceProps {
  /** Pre-resolved prices from the backend, or raw prices[] as fallback */
  prices?: ResolvedPrice[] | CurrencyPrice[];
  defaultPrice: number;
  defaultCurrency: string;
  className?: string;
  /** Optional text displayed before the price (e.g. "Starts from"). */
  prefix?: string;
}

export default function ProductPrice({
  prices,
  defaultPrice,
  defaultCurrency,
  className = '',
  prefix,
}: ProductPriceProps) {
  const getPrice = usePriceInCurrency();
  const { isLoading } = useCurrency();

  // Show skeleton while currency context is initializing or price not resolved
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

  const result = getPrice(prices, defaultPrice, defaultCurrency);

  if (!result) {
    return (
      <div className="flex items-center gap-2">
        {prefix && (
          <div className="h-4 w-16 rounded bg-primary animate-pulse" />
        )}
        <div className="h-6 w-24 rounded bg-primary animate-pulse" />
      </div>
    );
  }

  return (
    <span className={cn('text-primary font-bold text-lg', className)}>
      {prefix && (
        <span className="text-secondary font-normal text-sm">{prefix} </span>
      )}
      {result.amount.toLocaleString()} {result.currency}
    </span>
  );
}
