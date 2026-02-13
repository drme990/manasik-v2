'use client';

import { usePriceInCurrency } from '@/hooks/currency-hook';
import { CurrencyPrice } from '@/types/Product';

interface ProductPriceProps {
  prices?: CurrencyPrice[];
  defaultPrice: number;
  defaultCurrency: string;
  className?: string;
}

export default function ProductPrice({
  prices,
  defaultPrice,
  defaultCurrency,
  className = '',
}: ProductPriceProps) {
  const getPrice = usePriceInCurrency();
  const { amount, currency } = getPrice(prices, defaultPrice, defaultCurrency);

  return (
    <span className={className}>
      {amount} {currency}
    </span>
  );
}
