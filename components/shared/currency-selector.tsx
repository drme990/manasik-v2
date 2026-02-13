'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useCurrency } from '@/hooks/currency-hook';
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
      <div className="flex items-center text-foreground p-2">
        <div className="w-6 h-4 rounded-sm overflow-hidden">
          {getFlagComponent('SA')}
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-foreground hover:text-secondary transition-colors p-2 rounded-md hover:bg-muted/50"
        aria-label="Select currency"
      >
        <div className="w-6 h-4 rounded-sm overflow-hidden">
          {getFlagComponent(selectedCurrency.countryCode)}
        </div>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-background border border-stroke rounded-md shadow-lg z-50 p-1 max-h-75 overflow-y-auto">
          {currencies.map((currency) => (
            <button
              key={currency.code}
              onClick={() => {
                setSelectedCurrency(currency);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-center px-3 py-2 hover:bg-muted rounded transition-colors ${
                selectedCurrency.code === currency.code ? 'bg-success/10' : ''
              }`}
            >
              <div
                className="w-6 h-4 rounded-sm overflow-hidden"
                title={currency.code}
              >
                {getFlagComponent(currency.countryCode)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
