export interface CurrencyPrice {
  currencyCode: string;
  amount: number;
  isManual: boolean;
}

export interface CurrencyMinimumPayment {
  currencyCode: string;
  value: number;
  isManual: boolean;
}

export interface EasykashLinks {
  fullPayment: string;
  halfPayment: string;
  customPayment: string;
}

export interface ProductSize {
  _id?: string;
  name: {
    ar: string;
    en: string;
  };
  price: number;
  prices: CurrencyPrice[];
  easykashLinks: EasykashLinks;
  feedsUp?: number;
}

/**
 * Product pricing rules:
 * - If a product has sizes, each size holds its own price/prices.
 *   The product-level `price` is set to 0 and `prices` to [] (unused).
 * - If a product has NO sizes, `price` and `prices` are the source of truth.
 */
export interface Product {
  _id: string;
  name: {
    ar: string;
    en: string;
  };
  content: {
    ar: string;
    en: string;
  };
  /** Base price — only used when there are NO sizes. Set to 0 when sizes exist. */
  price: number;
  currency: string;
  mainCurrency: string;
  /** Multi-currency prices — only used when there are NO sizes. */
  prices: CurrencyPrice[];
  inStock: boolean;
  image?: string;
  images?: string[];
  allowPartialPayment?: boolean;
  minimumPayment?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  minimumPaymentType?: 'percentage' | 'fixed';
  minimumPayments?: CurrencyMinimumPayment[];
  sizes?: ProductSize[];
  easykashLinks?: EasykashLinks;
  displayOrder?: number;
  workAsSacrifice?: boolean;
  sacrificeCount?: number;
  feedsUp?: number;
}
