'use client';

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Country } from '@/types/Country';
import { fetchExchangeRates } from '@/lib/currency-api';

type CurrencyInfo = {
  code: string;
  symbol: string;
  countryCode: string;
  flagEmoji: string;
  countryName: { ar: string; en: string };
};

type ExchangeRates = Record<string, number>;

type CurrencyContextType = {
  selectedCurrency: CurrencyInfo | null;
  setSelectedCurrency: (
    currency: CurrencyInfo,
    source?: 'auto' | 'manual',
  ) => void;
  countries: Country[];
  currencies: CurrencyInfo[];
  exchangeRates: ExchangeRates | null;
  mainCurrencyCode: string | null;
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
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(
    null,
  );
  const [mainCurrencyCode, setMainCurrencyCode] = useState<string | null>(null);
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
        const normalizedInitialCountry = initialCountryCode
          ? normalizeCountryCode(initialCountryCode)
          : null;
        const resolvedViewerCountryCode =
          normalizedInitialCountry ||
          (await readGeoRouteCountry()) ||
          (await readGeoRouteCountryFromLocation());

        const countriesUrl = new URL('/api/countries', window.location.origin);
        countriesUrl.searchParams.set('active', 'true');
        if (resolvedViewerCountryCode) {
          countriesUrl.searchParams.set(
            'viewerCountryCode',
            resolvedViewerCountryCode,
          );
        }

        const res = await fetch(countriesUrl.toString(), { cache: 'no-store' });
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

        const initialCurrency = normalizedInitialCountry
          ? findCurrencyByCountryCode(
              availableCurrencies,
              normalizedInitialCountry,
            )
          : null;

        const detectedCountryCode =
          (await readGeoRouteCountry()) ||
          (await readGeoRouteCountryFromLocation());
        const detectedCurrency = detectedCountryCode
          ? findCurrencyByCountryCode(availableCurrencies, detectedCountryCode)
          : null;

        const savedAutoCurrency =
          saved?.source === 'auto'
            ? findCurrencyByCountryCode(
                availableCurrencies,
                saved.currency.countryCode,
              )
            : null;

        const fallback =
          availableCurrencies.find(
            (c) => c.countryCode === FALLBACK_COUNTRY_CODE,
          ) ?? availableCurrencies[0];
        
        const finalCurrency = savedManualCurrency || initialCurrency || detectedCurrency || savedAutoCurrency || fallback;
        setSelectedCurrency(finalCurrency, (savedManualCurrency || savedAutoCurrency) ? (savedManualCurrency ? 'manual' : 'auto') : 'auto');

        // Set main currency code for exchange basis
        const mCurrency = finalCurrency?.code || 'USD';
        setMainCurrencyCode(mCurrency);

        // Fetch exchange rates if needed
        const needsExchange = visibleCountries.some(
          (c) => c.viewerVisibility?.exchangePrice === true,
        );
        if (needsExchange) {
          try {
            const rates = await fetchExchangeRates(mCurrency);
            setExchangeRates(rates);
          } catch (err) {
            console.error('[CurrencyProvider] Failed to fetch rates:', err);
          }
        }
      } catch (error) {
        console.error('[CurrencyProvider] Failed to initialise:', error);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [setSelectedCurrency, initialCountryCode]);

  // Don't block rendering - show children even while loading
  // Components can check isLoading to show loading states
  return (
    <CurrencyContext.Provider
      value={{
        selectedCurrency,
        setSelectedCurrency,
        countries,
        currencies,
        exchangeRates,
        mainCurrencyCode,
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}
