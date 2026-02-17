'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import * as flags from 'country-flag-icons/react/3x2';
import { useTranslations, useLocale } from 'next-intl';
import Switch from '@/components/ui/switch';
import { toast } from 'react-toastify';

type FlagComponents = Record<
  string,
  React.ComponentType<{ className?: string }>
>;

interface Country {
  _id: string;
  code: string;
  name: {
    ar: string;
    en: string;
  };
  currencyCode: string;
  currencySymbol: string;
  flagEmoji: string;
  isActive: boolean;
}

export default function CountriesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const t = useTranslations('admin.countries');
  const locale = useLocale();

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const response = await fetch('/api/countries?active=false');
      const data = await response.json();
      if (data.success) {
        setCountries(data.data);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCountries = useMemo(() => {
    let result = countries;

    // Filter by active status
    if (filter === 'active') result = result.filter((c) => c.isActive);
    else if (filter === 'inactive') result = result.filter((c) => !c.isActive);

    // Filter by search query
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.en.toLowerCase().includes(q) ||
          c.name.ar.includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.currencyCode.toLowerCase().includes(q),
      );
    }

    return result;
  }, [countries, search, filter]);

  const handleToggleActive = async (country: Country) => {
    const newValue = !country.isActive;

    // Optimistic update
    setCountries((prev) =>
      prev.map((c) =>
        c._id === country._id ? { ...c, isActive: newValue } : c,
      ),
    );

    try {
      const response = await fetch(`/api/countries/${country._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newValue }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('messages.updateSuccess'));
      } else {
        // Revert on failure
        setCountries((prev) =>
          prev.map((c) =>
            c._id === country._id ? { ...c, isActive: !newValue } : c,
          ),
        );
        toast.error(data.error || t('messages.saveFailed'));
      }
    } catch (error) {
      console.error('Error toggling country:', error);
      // Revert on failure
      setCountries((prev) =>
        prev.map((c) =>
          c._id === country._id ? { ...c, isActive: !newValue } : c,
        ),
      );
      toast.error(t('messages.saveFailed'));
    }
  };

  const getFlagComponent = (countryCode: string) => {
    try {
      const flagComponents = flags as FlagComponents;
      const FlagComponent = flagComponents[countryCode.toUpperCase()];
      if (FlagComponent) {
        return <FlagComponent className="w-8 h-6" />;
      }
      return (
        <div className="w-8 h-6 bg-gray-200 rounded flex items-center justify-center text-xs">
          {countryCode}
        </div>
      );
    } catch {
      return (
        <div className="w-8 h-6 bg-gray-200 rounded flex items-center justify-center text-xs">
          {countryCode}
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="text-secondary">{t('loadingCountries')}</div>
      </div>
    );
  }

  const activeCount = countries.filter((c) => c.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t('title')}
        </h1>
        <p className="text-secondary">
          {t('description')} &middot; {activeCount} / {countries.length}{' '}
          {t('status.active').toLowerCase()}
        </p>
      </div>

      {/* Search + Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            size={18}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full ps-10 pe-4 py-2.5 bg-card-bg border border-stroke rounded-site text-foreground placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-success/30 focus:border-success transition-colors"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-muted/30 border border-stroke rounded-site p-1">
          {(['all', 'active', 'inactive'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                filter === tab
                  ? 'bg-card-bg text-foreground shadow-sm border border-stroke'
                  : 'text-secondary hover:text-foreground'
              }`}
            >
              {t(`filter.${tab}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Countries Table */}
      <div className="bg-card-bg border border-stroke rounded-site overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-stroke">
            <tr>
              <th className="text-start px-6 py-4 text-sm font-semibold text-foreground">
                {t('table.flag')}
              </th>
              <th className="text-start px-6 py-4 text-sm font-semibold text-foreground">
                {t('table.code')}
              </th>
              <th className="text-start px-6 py-4 text-sm font-semibold text-foreground">
                {locale === 'ar' ? t('table.nameAr') : t('table.nameEn')}
              </th>
              <th className="text-start px-6 py-4 text-sm font-semibold text-foreground">
                {t('table.currency')}
              </th>
              <th className="text-start px-6 py-4 text-sm font-semibold text-foreground">
                {t('table.status')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredCountries.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-secondary"
                >
                  {search.trim() ? t('noResults') : t('emptyMessage')}
                </td>
              </tr>
            ) : (
              filteredCountries.map((country) => (
                <tr
                  key={country._id}
                  className="border-b border-stroke hover:bg-muted/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {getFlagComponent(country.code)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {country.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-foreground">
                    {locale === 'ar' ? country.name.ar : country.name.en}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <span className="text-foreground font-medium">
                        {country.currencyCode}
                      </span>
                      <span className="text-secondary">
                        ({country.currencySymbol})
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Switch
                      id={`country-${country._id}`}
                      checked={country.isActive}
                      onChange={() => handleToggleActive(country)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
