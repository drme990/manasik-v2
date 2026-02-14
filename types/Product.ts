export interface CurrencyPrice {
  currencyCode: string;
  amount: number;
  isManual: boolean;
}

export interface ProductSection {
  title: {
    ar: string;
    en: string;
  };
  content: {
    ar: string;
    en: string;
  };
  type: 'text' | 'list';
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
  sections: ProductSection[];
  verify?: {
    ar: string;
    en: string;
  };
  receiving?: {
    ar: string;
    en: string;
  };
  implementationMechanism?: {
    ar: string;
    en: string;
  };
  implementationPeriod?: {
    ar: string;
    en: string;
  };
  implementationPlaces?: {
    ar: string;
    en: string;
  };
  price: number;
  currency: string;
  mainCurrency: string;
  prices: CurrencyPrice[];
  supportedCountries: string[];
  inStock: boolean;
  image?: string;
}
