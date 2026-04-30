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
  visibilityMode?: 'all' | 'specific';
  visibleToCountries?: string[];
  visibleToOther?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
