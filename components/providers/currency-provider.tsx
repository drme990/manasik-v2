'use client';

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Country } from '@/types/Country';

type CurrencyInfo = {
  code: string;
  symbol: string;
  countryCode: string;
  flagEmoji: string;
};

type CurrencyContextType = {
  selectedCurrency: CurrencyInfo;
  setSelectedCurrency: (currency: CurrencyInfo) => void;
  countries: Country[];
  currencies: CurrencyInfo[];
  isLoading: boolean;
};

export const CurrencyContext = createContext<CurrencyContextType | null>(null);

const STORAGE_KEY = 'manasik-selected-currency';

const DEFAULT_CURRENCY: CurrencyInfo = {
  code: 'SAR',
  symbol: 'ر.س',
  countryCode: 'SA',
  flagEmoji: '🇸🇦',
};

function getSavedCurrency(): CurrencyInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.code && parsed.symbol && parsed.countryCode) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [selectedCurrency, setSelectedCurrencyState] = useState<CurrencyInfo>(
    () => getSavedCurrency() || DEFAULT_CURRENCY,
  );
  const [countries, setCountries] = useState<Country[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Persist to localStorage whenever currency changes
  const setSelectedCurrency = useCallback((currency: CurrencyInfo) => {
    setSelectedCurrencyState(currency);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currency));
    } catch {
      // Storage full or unavailable
    }
  }, []);

  useEffect(() => {
    async function fetchCountries() {
      try {
        const res = await fetch('/api/countries?active=true');
        const data = await res.json();

        if (data.success && data.data) {
          setCountries(data.data);

          // Deduplicate currencies by code
          const currencyMap = new Map<string, CurrencyInfo>();
          for (const country of data.data) {
            if (!currencyMap.has(country.currencyCode)) {
              currencyMap.set(country.currencyCode, {
                code: country.currencyCode,
                symbol: country.currencySymbol,
                countryCode: country.code,
                flagEmoji: country.flagEmoji,
              });
            }
          }
          const availableCurrencies = Array.from(currencyMap.values());
          setCurrencies(availableCurrencies);

          // Validate that the saved/selected currency still exists in available currencies
          const saved = getSavedCurrency();
          if (saved) {
            const stillExists = availableCurrencies.some(
              (c) => c.code === saved.code,
            );
            if (!stillExists) {
              // Saved currency no longer available, reset to default
              setSelectedCurrency(DEFAULT_CURRENCY);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCountries();
  }, [setSelectedCurrency]);

  return (
    <CurrencyContext.Provider
      value={{
        selectedCurrency,
        setSelectedCurrency,
        countries,
        currencies,
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}
