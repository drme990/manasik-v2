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
  easykashLinks: EasykashLinks;
}

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
  price: number;
  currency: string;
  mainCurrency: string;
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
}
