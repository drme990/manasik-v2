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
  setSelectedCurrency: (
    currency: CurrencyInfo,
    source?: 'auto' | 'manual',
  ) => void;
  countries: Country[];
  currencies: CurrencyInfo[];
  isLoading: boolean;
};

export const CurrencyContext = createContext<CurrencyContextType | null>(null);

const STORAGE_KEY = 'manasik-selected-currency';
const STORAGE_SOURCE_KEY = 'manasik-selected-currency-source';
const FALLBACK_COUNTRY_CODE = 'OT';
type CurrencySelectionSource = 'auto' | 'manual';

type SavedCurrency = {
  currency: CurrencyInfo;
  source: CurrencySelectionSource;
};

function getSavedCurrency(): SavedCurrency | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CurrencyInfo>;
    if (!parsed.code || !parsed.symbol || !parsed.countryCode) return null;

    const sourceRaw = localStorage.getItem(STORAGE_SOURCE_KEY);
    const source = sourceRaw === 'auto' ? 'auto' : 'manual';

    return {
      currency: parsed as CurrencyInfo,
      source: parsed.countryCode === FALLBACK_COUNTRY_CODE ? 'auto' : source,
    };
  } catch {
    // ignore
  }
  return null;
}

function saveCurrency(
  currency: CurrencyInfo,
  source: CurrencySelectionSource,
): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currency));
    localStorage.setItem(STORAGE_SOURCE_KEY, source);
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

async function readGeoRouteCountry(): Promise<string | null> {
  try {
    const res = await fetch('/api/geo/detect', { cache: 'no-store' });
    const data = (await res.json()) as {
      success?: boolean;
      data?: { countryCode?: string | null };
    };

    if (!data.success) return null;

    return normalizeCountryCode(data.data?.countryCode ?? null);
  } catch {
    return null;
  }
}

function getBrowserCoordinates(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  });
}

async function readGeoRouteCountryFromLocation(): Promise<string | null> {
  const coordinates = await getBrowserCoordinates();
  if (!coordinates) return null;

  try {
    const res = await fetch('/api/geo/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(coordinates),
      cache: 'no-store',
    });
    const data = (await res.json()) as {
      success?: boolean;
      data?: { countryCode?: string | null };
    };

    if (!data.success) return null;

    return normalizeCountryCode(data.data?.countryCode ?? null);
  } catch {
    return null;
  }
}

function findCurrencyByCountryCode(
  currencies: CurrencyInfo[],
  countryCode: string,
): CurrencyInfo | null {
  return (
    currencies.find((currency) => currency.countryCode === countryCode) ?? null
  );
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

  const setSelectedCurrency = useCallback(
    (currency: CurrencyInfo, source: CurrencySelectionSource = 'manual') => {
      setSelectedCurrencyState(currency);
      saveCurrency(currency, source);
    },
    [],
  );

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/countries?active=true');
        const data = await res.json();
        if (!data.success || !data.data) return;

        const visibleCountries: Country[] = data.data;

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

        const saved = getSavedCurrency();
        const savedManualCurrency =
          saved?.source === 'manual'
            ? findCurrencyByCountryCode(
                availableCurrencies,
                saved.currency.countryCode,
              )
            : null;

        if (savedManualCurrency) {
          setSelectedCurrency(savedManualCurrency, 'manual');
          return;
        }

        const normalizedInitialCountry = initialCountryCode
          ? normalizeCountryCode(initialCountryCode)
          : null;
        const initialCurrency = normalizedInitialCountry
          ? findCurrencyByCountryCode(
              availableCurrencies,
              normalizedInitialCountry,
            )
          : null;

        if (initialCurrency) {
          setSelectedCurrency(initialCurrency, 'auto');
          return;
        }

        const detectedCountryCode =
          (await readGeoRouteCountry()) ||
          (await readGeoRouteCountryFromLocation());
        const detectedCurrency = detectedCountryCode
          ? findCurrencyByCountryCode(availableCurrencies, detectedCountryCode)
          : null;

        if (detectedCurrency) {
          setSelectedCurrency(detectedCurrency, 'auto');
          return;
        }

        const savedAutoCurrency =
          saved?.source === 'auto'
            ? findCurrencyByCountryCode(
                availableCurrencies,
                saved.currency.countryCode,
              )
            : null;

        if (savedAutoCurrency) {
          setSelectedCurrency(savedAutoCurrency, 'auto');
          return;
        }

        const fallback =
          availableCurrencies.find(
            (c) => c.countryCode === FALLBACK_COUNTRY_CODE,
          ) ?? availableCurrencies[0];
        setSelectedCurrency(fallback, 'auto');
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
