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
const OTHER_COUNTRY_CODE = 'OT';

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

function normalizeCountryCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  if (code === 'XX' || code === 'ZZ') return null;
  return code;
}

function resolveInitialCountryCode(
  initialCountryCode: string | null | undefined,
  countries: Country[],
): string | null {
  const normalizedInitial = normalizeCountryCode(initialCountryCode);
  if (
    normalizedInitial &&
    countries.some((country) => country.code === normalizedInitial)
  ) {
    return normalizedInitial;
  }
  return null;
}

function getVisibleCountries(
  allCountries: Country[],
  viewerCountryCode: string,
): Country[] {
  const viewerCountry = allCountries.find(
    (country) => country.code === viewerCountryCode,
  );
  if (!viewerCountry) return allCountries;

  const mode = viewerCountry.visibilityMode ?? 'all';
  if (mode === 'all') return allCountries;
  const visibleTo = (viewerCountry.visibleToCountries ?? []).map((code) =>
    code.toUpperCase(),
  );
  const filtered = allCountries.filter((country) =>
    visibleTo.includes(country.code.toUpperCase()),
  );
  if (!filtered.some((country) => country.code === viewerCountryCode)) {
    return [viewerCountry, ...filtered];
  }
  return filtered;
}

async function getCountryCodeFromCoords(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const url = new URL(
      'https://api.bigdatacloud.net/data/reverse-geocode-client',
    );
    url.searchParams.set('latitude', String(latitude));
    url.searchParams.set('longitude', String(longitude));
    url.searchParams.set('localityLanguage', 'en');

    const response = await fetch(url.toString());
    if (!response.ok) return null;
    const data = (await response.json()) as { countryCode?: string };
    return normalizeCountryCode(data.countryCode ?? null);
  } catch {
    return null;
  }
}

async function getGeolocationCountryCode(): Promise<string | null> {
  if (typeof window === 'undefined' || !navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const code = await getCountryCodeFromCoords(
          position.coords.latitude,
          position.coords.longitude,
        );
        resolve(code);
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  });
}

export function CurrencyProvider({
  children,
  initialCountryCode,
}: {
  children: ReactNode;
  initialCountryCode?: string | null;
}) {
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
          // Sort countries by sortOrder (null last) to guarantee admin-defined display order
          const sortedCountries = [...data.data].sort(
            (a: Country, b: Country) => {
              const ao = a.sortOrder ?? Infinity;
              const bo = b.sortOrder ?? Infinity;
              return ao !== bo ? ao - bo : a.name.ar.localeCompare(b.name.ar);
            },
          );

          let viewerCountryCode = resolveInitialCountryCode(
            initialCountryCode,
            sortedCountries,
          );
          if (!viewerCountryCode) {
            viewerCountryCode = await getGeolocationCountryCode();
          }
          if (
            viewerCountryCode &&
            !sortedCountries.some(
              (country) => country.code === viewerCountryCode,
            )
          ) {
            viewerCountryCode = null;
          }
          if (!viewerCountryCode) {
            viewerCountryCode = OTHER_COUNTRY_CODE;
          }

          const visibleCountries = getVisibleCountries(
            sortedCountries,
            viewerCountryCode,
          );

          setCountries(visibleCountries);

          // Map every country to a CurrencyInfo entry (no deduplication — show all countries)
          const availableCurrencies: CurrencyInfo[] = visibleCountries.map(
            (country) => ({
              code: country.currencyCode,
              symbol: country.currencySymbol,
              countryCode: country.code,
              flagEmoji: country.flagEmoji,
              countryName: country.name,
            }),
          );
          setCurrencies(availableCurrencies);

          const otherCurrency = availableCurrencies.find(
            (currency) => currency.countryCode === OTHER_COUNTRY_CODE,
          );

          const detectedCurrency = availableCurrencies.find(
            (currency) => currency.countryCode === viewerCountryCode,
          );

          if (detectedCurrency && viewerCountryCode !== OTHER_COUNTRY_CODE) {
            setSelectedCurrency(detectedCurrency);
            return;
          }

          const saved = getSavedCurrency();
          const normalizedSaved = saved;
          const hasValidSaved = Boolean(
            normalizedSaved &&
            availableCurrencies.some(
              (currency) =>
                currency.countryCode === normalizedSaved.countryCode,
            ),
          );

          if (hasValidSaved && normalizedSaved) {
            setSelectedCurrency(normalizedSaved);
            return;
          }

          const fallbackCurrency =
            otherCurrency || availableCurrencies[0] || DEFAULT_CURRENCY;
          setSelectedCurrency(fallbackCurrency);
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCountries();
  }, [setSelectedCurrency, initialCountryCode]);

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
