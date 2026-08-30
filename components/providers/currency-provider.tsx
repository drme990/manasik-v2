'use client';

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { Country } from '@/types/Country';
import { hasClientAuthCookie } from '@/lib/client-auth-cookie';
import { COUNTRIES } from '@/lib/countries';

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
  homeCountryCode: string | null;
  isLoading: boolean;
};

export const CurrencyContext = createContext<CurrencyContextType | null>(null);

const STORAGE_KEY = 'manasik-selected-currency';
const STORAGE_SOURCE_KEY = 'manasik-selected-currency-source';
const HOME_COUNTRY_KEY = 'manasik-home-country';
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
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Already a 2-letter code
  const upper = trimmed.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper) && upper !== 'XX' && upper !== 'ZZ') {
    return upper;
  }

  // Full country name → convert to 2-letter code using the static
  // COUNTRIES list (handles legacy DB data like detectedCountry: 'Egypt')
  const match = COUNTRIES.find(
    (c) =>
      c.en.toLowerCase() === trimmed.toLowerCase() ||
      c.value.toLowerCase() === trimmed.toLowerCase() ||
      c.ar === trimmed,
  );
  return match?.code ?? null;
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
  const [exchangeRates] = useState<ExchangeRates | null>(null);
  const [mainCurrencyCode, setMainCurrencyCode] = useState<string | null>(null);
  const [homeCountryCode, setHomeCountryCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setSelectedCurrency = useCallback(
    (currency: CurrencyInfo, source: CurrencySelectionSource = 'manual') => {
      setSelectedCurrencyState(currency);
      saveCurrency(currency, source);
    },
    [],
  );

  // Use a ref so the init function always sees the latest props/state
  const initRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    async function init() {
      try {
        // 1. Detect Home Country (Viewer Country)
        //
        // PRIORITY ORDER:
        //   a. Logged-in user's DB detectedCountry (overwrites cookie/localStorage)
        //   b. Cookie/localStorage (cached result from a previous detection)
        //   c. Server-side IP detection (initialCountryCode from layout)
        //   d. Client-side IP detection (/api/geo/detect)
        //   e. Browser geolocation (with user permission)
        //   f. 'OT' (Other) — final fallback when no country can be detected
        //
        // For logged-in users, the DB detectedCountry is the single source
        // of truth — it overwrites the cookie/localStorage so that the
        // product page (which reads the cookie) and checkout stay
        // consistent with each other.

        let userDetectedCountry: string | null = null;

        if (hasClientAuthCookie()) {
          try {
            const res = await fetch('/api/auth/manasik/session', { cache: 'no-store' });
            if (res.ok) {
              const data = await res.json();
              if (data?.data?.detectedCountry) {
                userDetectedCountry = normalizeCountryCode(data.data.detectedCountry);
              }
            }
          } catch {
            // ignore
          }
        }

        let homeCountryCode: string | null =
          userDetectedCountry ||
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

        // 4. Set Main Currency Code (home country's currency)
        // Note: Exchange rates are no longer fetched here — the backend
        // now pre-resolves all prices via resolveProductPrices() and
        // returns them in the product's resolvedPrices array.
        const homeCurrencyMatch = homeCountryCode
          ? visibleCountries.find(c => c.code === homeCountryCode)
          : null;

        const mCurrency = homeCurrencyMatch?.currencyCode || finalCurrency?.code || 'USD';
        setMainCurrencyCode(mCurrency);
        setHomeCountryCode(homeCountryCode);
      } catch (error) {
        console.error('[CurrencyProvider] Failed to initialise:', error);
      } finally {
        setIsLoading(false);
      }
    }

    initRef.current = init;
    init();
  }, [setSelectedCurrency, initialCountryCode]);

  // Re-initialise when auth state changes (login/logout from any page,
  // including the checkout page which can't do a full reload).
  useEffect(() => {
    const handleAuthChanged = () => {
      setIsLoading(true);
      initRef.current?.();
    };
    window.addEventListener('auth-changed', handleAuthChanged);
    return () => window.removeEventListener('auth-changed', handleAuthChanged);
  }, []);

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
        homeCountryCode,
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}
