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

// ─── Storage ────────────────────────────────────────────────────────────────

function getSavedCurrency(): CurrencyInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CurrencyInfo>;
    if (parsed.code && parsed.symbol && parsed.countryCode) {
      return parsed as CurrencyInfo;
    }
  } catch {
    // corrupted — ignore
  }
  return null;
}

function saveCurrency(currency: CurrencyInfo): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currency));
  } catch {
    // storage full or unavailable — ignore
  }
}

// ─── Country-code helpers ────────────────────────────────────────────────────

function normalizeCountryCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) && code !== 'XX' && code !== 'ZZ'
    ? code
    : null;
}

function isKnownCountry(code: string, countries: Country[]): boolean {
  return countries.some((c) => c.code === code);
}

// ─── Detection strategies ────────────────────────────────────────────────────

async function detectByIp(): Promise<string | null> {
  try {
    const res = await fetch('/api/geo/country', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      success?: boolean;
      data?: { countryCode?: unknown };
    };
    return data?.success ? normalizeCountryCode(data?.data?.countryCode) : null;
  } catch {
    return null;
  }
}

async function detectByGeolocation(): Promise<string | null> {
  if (typeof window === 'undefined' || !navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const url = new URL(
            'https://api.bigdatacloud.net/data/reverse-geocode-client',
          );
          url.searchParams.set('latitude', String(coords.latitude));
          url.searchParams.set('longitude', String(coords.longitude));
          url.searchParams.set('localityLanguage', 'en');

          const res = await fetch(url.toString());
          if (!res.ok) return resolve(null);
          const data = (await res.json()) as { countryCode?: string };
          resolve(normalizeCountryCode(data.countryCode ?? null));
        } catch {
          resolve(null);
        }
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
    );
  });
}

// ─── Visibility filter ───────────────────────────────────────────────────────

function getVisibleCountries(
  allCountries: Country[],
  viewerCode: string,
): Country[] {
  const viewer = allCountries.find((c) => c.code === viewerCode);
  if (!viewer || (viewer.visibilityMode ?? 'all') === 'all')
    return allCountries;

  const allowed = (viewer.visibleToCountries ?? []).map((c) => c.toUpperCase());
  const filtered = allCountries.filter((c) =>
    allowed.includes(c.code.toUpperCase()),
  );

  // Always keep the viewer's own country in the list
  return filtered.some((c) => c.code === viewerCode)
    ? filtered
    : [viewer, ...filtered];
}

// ─── Provider ────────────────────────────────────────────────────────────────

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

        // Sort by admin-defined order
        const allCountries: Country[] = [...data.data].sort(
          (a: Country, b: Country) => {
            const ao = a.sortOrder ?? Infinity;
            const bo = b.sortOrder ?? Infinity;
            return ao !== bo ? ao - bo : a.name.ar.localeCompare(b.name.ar);
          },
        );

        // ── Resolve viewer's country code ──────────────────────────────────
        //   Priority: prop hint → IP → Geolocation → OT (fallback)

        let viewerCode: string | null = null;

        const normalized = normalizeCountryCode(initialCountryCode);
        if (normalized && isKnownCountry(normalized, allCountries)) {
          viewerCode = normalized;
        }

        if (!viewerCode) {
          const ip = await detectByIp();
          if (ip && isKnownCountry(ip, allCountries)) viewerCode = ip;
        }

        if (!viewerCode) {
          const geo = await detectByGeolocation();
          if (geo && isKnownCountry(geo, allCountries)) viewerCode = geo;
        }

        // Always fall back to OT so something is shown
        viewerCode ??= FALLBACK_COUNTRY_CODE;

        // ── Apply visibility rules & build currency list ───────────────────

        const visibleCountries = getVisibleCountries(allCountries, viewerCode);
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

        // ── Pick the currency to display ───────────────────────────────────
        //   Priority: detected country → saved preference → OT → first

        const detected = availableCurrencies.find(
          (c) =>
            c.countryCode === viewerCode &&
            viewerCode !== FALLBACK_COUNTRY_CODE,
        );

        if (detected) {
          setSelectedCurrency(detected);
          return;
        }

        // Try to restore the user's last explicit choice
        const saved = getSavedCurrency();
        if (
          saved &&
          availableCurrencies.some((c) => c.countryCode === saved.countryCode)
        ) {
          setSelectedCurrency(saved);
          return;
        }

        // Hard fallback: OT or first available
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

  // Don't render children until we have a currency to avoid flicker
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
