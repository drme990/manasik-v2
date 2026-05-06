export interface Country {
  _id: string;
  code: string;
  name: {
    ar: string;
    en: string;
  };
  currencyCode: string;
  currencySymbol: string;
  flagEmoji: string;
  isActive: boolean;
  sortOrder: number | null;
  region?: string;
  visibilityMode?: 'all' | 'specific';
  visibleToCountries?: string[];
  createdAt?: string;
  updatedAt?: string;
}
