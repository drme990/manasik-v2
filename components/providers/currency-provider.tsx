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
  countryName: { ar: string; en: string };
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
const IP_DETECTED_KEY = 'manasik-ip-detected';

const DEFAULT_CURRENCY: CurrencyInfo = {
  code: 'SAR',
  symbol: 'ر.س',
  countryCode: 'SA',
  flagEmoji: '🇸🇦',
  countryName: { ar: 'السعودية', en: 'Saudi Arabia' },
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
                countryName: country.name,
              });
            }
          }
          const availableCurrencies = Array.from(currencyMap.values());
          setCurrencies(availableCurrencies);

          const saved = getSavedCurrency();
          const alreadyIpDetected =
            typeof window !== 'undefined' &&
            localStorage.getItem(IP_DETECTED_KEY) === '1';

          if (saved) {
            const stillExists = availableCurrencies.some(
              (c) => c.code === saved.code,
            );
            if (!stillExists) {
              setSelectedCurrency(DEFAULT_CURRENCY);
            }
            // If we already saved a preference (manual or ip), keep it
          } else if (!alreadyIpDetected) {
            // No saved preference yet — try to detect from IP
            try {
              const ipRes = await fetch('https://ipwho.is/');
              const ipData = await ipRes.json();
              if (ipData.success && ipData.country_code) {
                const match = availableCurrencies.find(
                  (c) => c.countryCode === ipData.country_code.toUpperCase(),
                );
                if (match) {
                  setSelectedCurrency(match);
                }
              }
            } catch {
              // IP detection failed, keep default
            } finally {
              try {
                localStorage.setItem(IP_DETECTED_KEY, '1');
              } catch {
                /* ignore */
              }
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
