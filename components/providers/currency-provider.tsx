'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
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

const DEFAULT_CURRENCY: CurrencyInfo = {
  code: 'SAR',
  symbol: 'ر.س',
  countryCode: 'SA',
  flagEmoji: '🇸🇦',
};

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [selectedCurrency, setSelectedCurrency] =
    useState<CurrencyInfo>(DEFAULT_CURRENCY);
  const [countries, setCountries] = useState<Country[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
          setCurrencies(Array.from(currencyMap.values()));
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCountries();
  }, []);

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
