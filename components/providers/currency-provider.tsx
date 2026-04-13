'use client';

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Country } from '@/types/Country';
import Modal from '@/components/ui/modal';
import Button from '@/components/ui/button';
import { Search, Check } from 'lucide-react';
import * as flags from 'country-flag-icons/react/3x2';

type FlagComponents = Record<
  string,
  React.ComponentType<{ className?: string }>
>;

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
const OTHER_COUNTRY_CODE = '__OTHER__';

const DEFAULT_CURRENCY: CurrencyInfo = {
  code: 'SAR',
  symbol: 'ر.س',
  countryCode: 'SA',
  flagEmoji: '🇸🇦',
  countryName: { ar: 'السعودية', en: 'Saudi Arabia' },
};

const OTHER_CURRENCY: CurrencyInfo = {
  code: 'USD',
  symbol: '$',
  countryCode: OTHER_COUNTRY_CODE,
  flagEmoji: '🌍',
  countryName: { ar: 'أخرى', en: 'Other' },
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

async function detectCountryFromRequest(): Promise<string | null> {
  try {
    const res = await fetch('/geo/country', { cache: 'no-store' });
    const data = await res.json();
    if (!data?.success) return null;
    return normalizeCountryCode(data?.data?.countryCode);
  } catch {
    return null;
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const t = useTranslations('common.countryPicker');
  const [selectedCurrency, setSelectedCurrencyState] = useState<CurrencyInfo>(
    () => getSavedCurrency() || DEFAULT_CURRENCY,
  );
  const [countries, setCountries] = useState<Country[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [pendingCountryCode, setPendingCountryCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const getFlagComponent = useCallback((countryCode: string) => {
    try {
      const flagComponents = flags as FlagComponents;
      const FlagComponent = flagComponents[countryCode.toUpperCase()];
      if (FlagComponent) {
        return <FlagComponent className="w-full h-full object-cover" />;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const renderFlag = useCallback(
    (countryCode: string) => {
      const flag = getFlagComponent(countryCode);
      if (flag) return flag;

      return (
        <div className="w-full h-full flex items-center justify-center text-2xl leading-none">
          🌍
        </div>
      );
    },
    [getFlagComponent],
  );

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
          setCountries(sortedCountries);

          // Map every country to a CurrencyInfo entry (no deduplication — show all countries)
          const availableCurrencies: CurrencyInfo[] = sortedCountries.map(
            (country) => ({
              code: country.currencyCode,
              symbol: country.currencySymbol,
              countryCode: country.code,
              flagEmoji: country.flagEmoji,
              countryName: country.name,
            }),
          );
          const selectableCurrencies = [...availableCurrencies, OTHER_CURRENCY];
          setCurrencies(selectableCurrencies);

          const saved = getSavedCurrency();
          const normalizedSaved =
            saved?.countryCode === OTHER_COUNTRY_CODE ? OTHER_CURRENCY : saved;
          const hasValidSaved = Boolean(
            normalizedSaved &&
            selectableCurrencies.some(
              (currency) =>
                currency.countryCode === normalizedSaved.countryCode,
            ),
          );

          if (hasValidSaved && normalizedSaved) {
            setSelectedCurrency(normalizedSaved);
            return;
          }

          const detectedCountryCode = await detectCountryFromRequest();
          if (detectedCountryCode) {
            const detectedCurrency = availableCurrencies.find(
              (currency) => currency.countryCode === detectedCountryCode,
            );

            if (detectedCurrency) {
              setSelectedCurrency(detectedCurrency);
              return;
            }
          }

          setShowCountryModal(true);
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCountries();
  }, [setSelectedCurrency]);

  const filteredCurrencies = currencies.filter((currency) => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    if (!normalizedSearchTerm) return true;

    const localizedName =
      currency.countryCode === OTHER_COUNTRY_CODE
        ? t('otherOption')
        : locale === 'ar'
          ? currency.countryName.ar
          : currency.countryName.en;

    return (
      localizedName.toLowerCase().includes(normalizedSearchTerm) ||
      currency.countryCode.toLowerCase().includes(normalizedSearchTerm)
    );
  });

  const confirmCountrySelection = () => {
    if (!pendingCountryCode) return;

    const selected =
      currencies.find(
        (currency) => currency.countryCode === pendingCountryCode,
      ) ?? OTHER_CURRENCY;

    setSelectedCurrency(selected);
    setShowCountryModal(false);
    setPendingCountryCode('');
    setSearchTerm('');
  };

  return (
    <>
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

      <Modal
        isOpen={!isLoading && showCountryModal}
        onClose={() => {}}
        title={t('title')}
        size="lg"
        showCloseButton={false}
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary">{t('description')}</p>
          <label className="block text-sm font-medium text-foreground">
            {t('label')}
          </label>

          <div className="relative">
            <Search
              size={16}
              className={`absolute top-1/2 -translate-y-1/2 text-secondary ${
                locale === 'ar' ? 'right-3' : 'left-3'
              }`}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full h-11 rounded-xl border border-stroke bg-background ps-10 pe-3 text-sm text-foreground placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-success/20"
              dir={locale === 'ar' ? 'rtl' : 'ltr'}
            />
          </div>

          {filteredCurrencies.length === 0 ? (
            <div className="rounded-lg border border-stroke bg-background/40 p-4 text-sm text-secondary text-center">
              {t('noResults')}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-88 overflow-y-auto pe-1">
              {filteredCurrencies.map((currency) => {
                const isSelected = pendingCountryCode === currency.countryCode;
                const localizedName =
                  currency.countryCode === OTHER_COUNTRY_CODE
                    ? t('otherOption')
                    : locale === 'ar'
                      ? currency.countryName.ar
                      : currency.countryName.en;

                return (
                  <button
                    key={currency.countryCode}
                    type="button"
                    onClick={() => setPendingCountryCode(currency.countryCode)}
                    className={`relative w-full rounded-xl border px-3 py-3 transition-all text-center flex flex-col items-center justify-center gap-3 min-h-32 ${
                      isSelected
                        ? 'border-success bg-success/10 shadow-sm'
                        : 'border-stroke bg-background hover:bg-background/70 hover:border-success/30'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute right-2 top-2">
                        <Check size={16} className="text-success" />
                      </span>
                    )}

                    <div className="w-14 h-10 rounded-md overflow-hidden border border-stroke/60 shadow-sm">
                      {renderFlag(currency.countryCode)}
                    </div>

                    <span className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
                      {localizedName}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <Button
            type="button"
            variant="primary"
            className="w-full"
            onClick={confirmCountrySelection}
            disabled={!pendingCountryCode}
          >
            {t('confirm')}
          </Button>
        </div>
      </Modal>
    </>
  );
}
