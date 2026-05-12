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
const HOME_COUNTRY_KEY = 'user-home-country';
const FALLBACK_COUNTRY_CODE = 'OT';
type CurrencySelectionSource = 'auto' | 'manual';

type SavedCurrency = {
  currency: CurrencyInfo;
  source: CurrencySelectionSource;
};

function setCookie(name: string, value: string, days: number) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = '; expires=' + date.toUTCString();
  document.cookie = name + '=' + (value || '') + expires + '; path=/';
}

function getCookie(name: string) {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

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
        // 1. Detect/Restore Home Country (Viewer Country)
        let homeCountryCode =
          getCookie(HOME_COUNTRY_KEY) ||
          localStorage.getItem(HOME_COUNTRY_KEY) ||
          (initialCountryCode ? normalizeCountryCode(initialCountryCode) : null);

        if (!homeCountryCode) {
          homeCountryCode =
            (await readGeoRouteCountry()) ||
            (await readGeoRouteCountryFromLocation());
        }

        if (homeCountryCode) {
          localStorage.setItem(HOME_COUNTRY_KEY, homeCountryCode);
          setCookie(HOME_COUNTRY_KEY, homeCountryCode, 365);
        }

        const resolvedViewerCountryCode = homeCountryCode || FALLBACK_COUNTRY_CODE;

        // 2. Fetch Countries relative to Home Country
        const countriesUrl = new URL('/api/countries', window.location.origin);
        countriesUrl.searchParams.set('active', 'true');
        countriesUrl.searchParams.set(
          'viewerCountryCode',
          resolvedViewerCountryCode,
        );

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

        // 3. Determine Selected Currency (Can be different from Home)
        const saved = getSavedCurrency();
        const savedManualCurrency =
          saved?.source === 'manual'
            ? findCurrencyByCountryCode(
                availableCurrencies,
                saved.currency.countryCode,
              )
            : null;

        const initialCurrency = initialCountryCode
          ? findCurrencyByCountryCode(availableCurrencies, initialCountryCode)
          : null;

        const detectedCurrency = homeCountryCode
          ? findCurrencyByCountryCode(availableCurrencies, homeCountryCode)
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

        const finalCurrency =
          savedManualCurrency ||
          initialCurrency ||
          detectedCurrency ||
          savedAutoCurrency ||
          fallback;
        
        setSelectedCurrency(
          finalCurrency,
          savedManualCurrency || savedAutoCurrency
            ? savedManualCurrency
              ? 'manual'
              : 'auto'
            : 'auto',
        );

        // 4. Set Main Currency Code (ALWAYS use Home Country's currency for exchange base)
        const homeCurrencyMatch = homeCountryCode 
          ? visibleCountries.find(c => c.code === homeCountryCode)
          : null;
        
        const mCurrency = homeCurrencyMatch?.currencyCode || finalCurrency?.code || 'USD';
        setMainCurrencyCode(mCurrency);

        // 5. Fetch Exchange Rates based on Home Currency
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
