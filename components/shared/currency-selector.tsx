'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useCurrency } from '@/hooks/currency-hook';
import { useLocale } from 'next-intl';
import * as flags from 'country-flag-icons/react/3x2';

type FlagComponents = Record<
  string,
  React.ComponentType<{ className?: string }>
>;

export default function CurrencySelector() {
  const { selectedCurrency, setSelectedCurrency, currencies, isLoading } =
    useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const isAr = locale === 'ar';

  // Get flag component dynamically by country code
  const getFlagComponent = (countryCode: string) => {
    try {
      const flagComponents = flags as FlagComponents;
      const FlagComponent = flagComponents[countryCode.toUpperCase()];
      if (FlagComponent) {
        return <FlagComponent className="w-full h-full object-cover" />;
      }
      // Fallback to empty if flag not found
      return null;
    } catch {
      return null;
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (isLoading || currencies.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-foreground p-2">
        <div className="w-6 h-4 rounded-sm overflow-hidden">
          {getFlagComponent('SA')}
        </div>
        <span className="text-xs font-medium hidden sm:inline">SAR</span>
      </div>
    );
  }

  const selectedName = isAr
    ? selectedCurrency.countryName?.ar
    : selectedCurrency.countryName?.en;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-foreground hover:text-secondary transition-colors p-2 rounded-md hover:bg-muted/50"
        aria-label="Select currency"
      >
        <div className="w-6 h-4 rounded-sm overflow-hidden">
          {getFlagComponent(selectedCurrency.countryCode)}
        </div>
        <span className="text-xs font-medium hidden sm:inline">
          {selectedName || selectedCurrency.code}
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-background border border-stroke rounded-md shadow-lg z-50 p-1 max-h-75 overflow-y-auto min-w-40">
          {currencies.map((currency) => {
            const name = isAr
              ? currency.countryName?.ar
              : currency.countryName?.en;
            return (
              <button
                key={currency.code}
                onClick={() => {
                  setSelectedCurrency(currency);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded transition-colors ${
                  selectedCurrency.code === currency.code ? 'bg-success/10' : ''
                }`}
              >
                <div
                  className="w-6 h-4 rounded-sm overflow-hidden shrink-0"
                  title={currency.code}
                >
                  {getFlagComponent(currency.countryCode)}
                </div>
                <span className="text-sm whitespace-nowrap">
                  {name || currency.code}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
