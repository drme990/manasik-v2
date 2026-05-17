'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronDown, Search, Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import { COUNTRIES, type Country } from '@/lib/countries';
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';

interface PhoneInputProps {
  id?: string;
  value: string;
  onChange: (phone: string) => void;
  label?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  validateOnChange?: boolean;
}

const parsePhoneValue = (value: string) => {
  if (!value.startsWith('+')) {
    return {
      country: null,
      phone: value,
    };
  }

  const normalized = value.replace(/\s+/g, '');

  for (const country of COUNTRIES) {
    if (normalized.startsWith(`+${country.phoneCode}`)) {
      return {
        country,
        phone: normalized.slice(country.phoneCode.length + 1),
      };
    }
  }

  return {
    country: null,
    phone: normalized.replace(/^\+/, ''),
  };
};

export default function PhoneInput({
  id,
  value,
  onChange,
  label,
  error,
  className,
  disabled = false,
  required = false,
  placeholder,
  validateOnChange = false,
}: PhoneInputProps) {
  const locale = useLocale();
  const t = useTranslations('common');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  /**
   * Derive state from value instead of syncing with useEffect
   * This avoids cascading render warnings.
   */
  const { country: selectedCountry, phone: phoneNumber } = useMemo(
    () => parsePhoneValue(value),
    [value],
  );

  /**
   * Close dropdown on outside click
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /**
   * Auto focus search input
   */
  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  /**
   * Filter countries
   */
  const filteredCountries = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    if (!term) return COUNTRIES;

    return COUNTRIES.filter((country) => {
      const displayName = locale === 'ar' ? country.ar : country.en;

      return (
        displayName.toLowerCase().includes(term) ||
        country.en.toLowerCase().includes(term) ||
        country.ar.toLowerCase().includes(term) ||
        country.phoneCode.includes(term)
      );
    });
  }, [searchTerm, locale]);

  /**
   * Update full phone
   */
  const updatePhone = useCallback(
    (country: Country | null, phone: string) => {
      const cleanedPhone = phone.replace(/[^\d]/g, '');

      if (country) {
        onChange(`+${country.phoneCode}${cleanedPhone}`);
      } else {
        onChange(cleanedPhone);
      }
    },
    [onChange],
  );

  /**
   * Select country
   */
  const handleSelectCountry = (country: Country) => {
    setIsOpen(false);
    setSearchTerm('');

    updatePhone(country, phoneNumber);
  };

  /**
   * Handle phone input
   */
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPhone = e.target.value; // Allow all input, filter later
    if (selectedCountry) {
      onChange(`+${selectedCountry.phoneCode}${newPhone}`);
    } else {
      onChange(newPhone);
    }
    
    // Validate on change if enabled
    if (validateOnChange && newPhone) {
      const fullPhone = selectedCountry ? `+${selectedCountry.phoneCode}${newPhone}` : newPhone;
      if (!validatePhone(fullPhone)) {
        setValidationError('Invalid phone number format');
      } else {
        setValidationError(null);
      }
    } else {
      setValidationError(null);
    }
  };

  // Validate phone number
  const validatePhone = (phone: string): boolean => {
    if (!phone) return false;
    if (selectedCountry) {
      try {
        return isValidPhoneNumber(phone, selectedCountry.code as any);
      } catch {
        return false;
      }
    }
    // If no country selected, try to validate without country code
    try {
      const parsed = parsePhoneNumber(phone);
      return parsed?.isValid() ?? false;
    } catch {
      return false;
    }
  };

  return (
    <div className={cn('relative w-full', className)}>
      {label && (
        <label
          htmlFor={id}
          className="mb-2 block text-sm font-medium text-foreground"
        >
          {label}

          {required && <span className="ml-1 text-error">*</span>}
        </label>
      )}

      <div className="flex gap-2">
        {/* Country Selector */}
        <div ref={dropdownRef} className="relative shrink-0">
          <button
            type="button"
            disabled={disabled}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            onClick={() => setIsOpen((prev) => !prev)}
            className={cn(
              'flex h-12 min-w-27.5 items-center justify-between rounded-lg border bg-background px-3 transition-all',
              'focus:outline-none focus:ring-2 focus:ring-success/20',
              error ? 'border-error' : 'border-stroke focus:border-success',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <span className="truncate font-medium text-foreground">
              {selectedCountry ? `+${selectedCountry.phoneCode}` : '+'}
            </span>

            <ChevronDown
              size={16}
              className={cn(
                'shrink-0 text-secondary transition-transform',
                isOpen && 'rotate-180',
              )}
            />
          </button>

          {/* Dropdown */}
          {isOpen && !disabled && (
            <div className="absolute z-50 mt-2 w-70 overflow-hidden rounded-xl border border-stroke bg-background shadow-xl">
              {/* Search */}
              <div className="border-b border-stroke p-3">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary"
                  />

                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('messages.searchCountry', {
                      defaultValue: 'Search countries...',
                    })}
                    className="h-10 w-full rounded-lg border border-stroke bg-card-bg pl-10 pr-4 text-sm focus:border-success focus:outline-none"
                    dir={locale === 'ar' ? 'rtl' : 'ltr'}
                  />
                </div>
              </div>

              {/* Countries */}
              <div className="max-h-64 overflow-y-auto py-1">
                {filteredCountries.length === 0 ? (
                  <div className="p-4 text-center text-sm text-secondary">
                    {t('messages.noCountriesFound')}
                  </div>
                ) : (
                  filteredCountries.map((country) => {
                    const displayName =
                      locale === 'ar' ? country.ar : country.en;

                    const isSelected = selectedCountry?.code === country.code;

                    return (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => handleSelectCountry(country)}
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-card-bg',
                          isSelected && 'bg-success/10',
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {displayName}
                          </span>

                          <span className="text-xs text-secondary">
                            +{country.phoneCode}
                          </span>
                        </div>

                        {isSelected && (
                          <Check size={16} className="shrink-0 text-success" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Phone Input */}
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          disabled={disabled}
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder={placeholder}
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
          className={cn(
            'h-12 flex-1 rounded-lg border bg-background px-4 transition-all',
            'focus:outline-none focus:ring-2 focus:ring-success/20',
            error ? 'border-error' : 'border-stroke focus:border-success',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        />
      </div>

      {/* Error Message */}
      {(error || validationError) && (
        <p className="mt-1 text-sm text-error">{error || validationError}</p>
      )}
    </div>
  );
}
