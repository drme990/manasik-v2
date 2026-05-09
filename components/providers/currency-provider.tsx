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
const FALLBACK_COUNTRY_CODE = 'OT';

function getSavedCurrency(): CurrencyInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CurrencyInfo>;
    if (parsed.code && parsed.symbol && parsed.countryCode)
      return parsed as CurrencyInfo;
  } catch {
    // ignore
  }
  return null;
}

function saveCurrency(currency: CurrencyInfo): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currency));
  } catch {
    // ignore
  }
}

function normalizeCountryCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) && code !== 'XX' && code !== 'ZZ'
    ? code
    : null;
}

export function CurrencyProvider({
  children,
  initialCountryCode,
}: {
  children: ReactNode;
  initialCountryCode?: string | null;
}) {
  const [selectedCurrency, setSelectedCurrencyState] =
    useState<CurrencyInfo | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const setSelectedCurrency = useCallback((currency: CurrencyInfo) => {
    setSelectedCurrencyState(currency);
    saveCurrency(currency);
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/countries?active=true');
        const data = await res.json();
        if (!data.success || !data.data) return;

        const visibleCountries: Country[] = data.data;
        const viewerCodeFromServer = data.meta?.viewerCode
          ? normalizeCountryCode(data.meta.viewerCode)
          : null;

        setCountries(visibleCountries);

        const availableCurrencies: CurrencyInfo[] = visibleCountries.map(
          (c) => ({
            code: c.currencyCode,
            symbol: c.currencySymbol,
            countryCode: c.code,
            flagEmoji: c.flagEmoji,
            countryName: c.name,
          }),
        );
        setCurrencies(availableCurrencies);

        // Selection priority: server-detected viewer → saved preference → fallback
        const detected = viewerCodeFromServer
          ? availableCurrencies.find(
              (c) => c.countryCode === viewerCodeFromServer,
            )
          : null;
        if (detected) {
          setSelectedCurrency(detected);
          return;
        }

        const saved = getSavedCurrency();
        if (
          saved &&
          availableCurrencies.some((c) => c.countryCode === saved.countryCode)
        ) {
          setSelectedCurrency(saved);
          return;
        }

        const fallback =
          availableCurrencies.find(
            (c) => c.countryCode === FALLBACK_COUNTRY_CODE,
          ) ?? availableCurrencies[0];
        setSelectedCurrency(fallback);
      } catch (error) {
        console.error('[CurrencyProvider] Failed to initialise:', error);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [setSelectedCurrency, initialCountryCode]);

  if (!selectedCurrency) return null;

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
