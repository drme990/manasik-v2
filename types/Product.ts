export interface CurrencyPrice {
  currencyCode: string;
  amount: number;
  isManual: boolean;
}

export interface Product {
  _id: string;
  name: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  features: {
    ar: string[];
    en: string[];
  };
  price: number;
  currency: string;
  mainCurrency: string;
  prices: CurrencyPrice[];
  supportedCountries: string[];
  inStock: boolean;
  image?: string;
  other?: { [key: string]: unknown };
}
