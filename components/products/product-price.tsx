'use client';

import { usePriceInCurrency, useCurrency, useDisplayCurrency } from '@/hooks/currency-hook';
import { cn } from '@/lib/utils';
import type { ResolvedPrice } from '@/types/Product';

interface ProductPriceProps {
  /** Pre-resolved prices from the backend */
  prices?: ResolvedPrice[];
  className?: string;
  /** Optional text displayed before the price (e.g. "Starts from"). */
  prefix?: string;
}

export default function ProductPrice({
  prices,
  className = '',
  prefix,
}: ProductPriceProps) {
  const getPrice = usePriceInCurrency();
  const { isLoading } = useCurrency();
  const displayCurrency = useDisplayCurrency();

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

  const result = getPrice(prices);

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
      {result.amount.toLocaleString()} {displayCurrency || result.currency}
    </span>
  );
}
