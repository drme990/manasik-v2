'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import * as flags from 'country-flag-icons/react/3x2';
import { useTranslations } from 'next-intl';
import Modal from '@/components/ui/modal';
import Switch from '@/components/ui/switch';

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
  const [showModal, setShowModal] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    nameAr: '',
    nameEn: '',
    currencyCode: '',
    currencySymbol: '',
    isActive: true,
  });
  const t = useTranslations('admin.countries');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const body = {
      code: formData.code.toUpperCase(),
      name: {
        ar: formData.nameAr,
        en: formData.nameEn,
      },
      currencyCode: formData.currencyCode.toUpperCase(),
      currencySymbol: formData.currencySymbol,
      isActive: formData.isActive,
    };

    try {
      const url = editingCountry
        ? `/api/countries/${editingCountry._id}`
        : '/api/countries';
      const method = editingCountry ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        await fetchCountries();
        handleCloseModal();
      } else {
        alert(data.error || t('messages.saveFailed'));
      }
    } catch (error) {
      console.error('Error saving country:', error);
      alert(t('messages.saveFailed'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return;

    try {
      const response = await fetch(`/api/countries/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        await fetchCountries();
      } else {
        alert(data.error || t('messages.deleteFailed'));
      }
    } catch (error) {
      console.error('Error deleting country:', error);
      alert(t('messages.deleteFailed'));
    }
  };

  const handleEdit = (country: Country) => {
    setEditingCountry(country);
    setFormData({
      code: country.code,
      nameAr: country.name.ar,
      nameEn: country.name.en,
      currencyCode: country.currencyCode,
      currencySymbol: country.currencySymbol,
      isActive: country.isActive,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCountry(null);
    setFormData({
      code: '',
      nameAr: '',
      nameEn: '',
      currencyCode: '',
      currencySymbol: '',
      isActive: true,
    });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('title')}
          </h1>
          <p className="text-secondary">{t('description')}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-md hover:bg-success/90 transition-colors"
        >
          <Plus size={20} />
          {t('addCountry')}
        </button>
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
                {t('table.nameEn')}
              </th>
              <th className="text-start px-6 py-4 text-sm font-semibold text-foreground">
                {t('table.nameAr')}
              </th>
              <th className="text-start px-6 py-4 text-sm font-semibold text-foreground">
                {t('table.currency')}
              </th>
              <th className="text-start px-6 py-4 text-sm font-semibold text-foreground">
                {t('table.status')}
              </th>
              <th className="text-start px-6 py-4 text-sm font-semibold text-foreground">
                {t('table.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {countries.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-secondary"
                >
                  {t('emptyMessage')}
                </td>
              </tr>
            ) : (
              countries.map((country) => (
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
                    {country.name.en}
                  </td>
                  <td className="px-6 py-4 text-foreground">
                    {country.name.ar}
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
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        country.isActive
                          ? 'bg-success/10 text-success'
                          : 'bg-gray-500/10 text-gray-500'
                      }`}
                    >
                      {country.isActive ? (
                        <Eye size={12} />
                      ) : (
                        <EyeOff size={12} />
                      )}
                      {country.isActive
                        ? t('status.active')
                        : t('status.inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(country)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Edit country"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(country._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete country"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingCountry ? t('editCountry') : t('addCountry')}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 border border-stroke rounded-md text-foreground hover:bg-muted/50 transition-colors"
            >
              {t('buttons.cancel')}
            </button>
            <button
              type="submit"
              form="country-form"
              className="px-4 py-2 bg-success text-white rounded-md hover:bg-success/90 transition-colors"
            >
              {editingCountry
                ? t('buttons.updateCountry')
                : t('buttons.createCountry')}
            </button>
          </div>
        }
      >
        <form id="country-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('form.countryCode')}
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase(),
                  })
                }
                maxLength={2}
                className="w-full px-4 py-2 border border-stroke rounded-md bg-background text-foreground font-mono uppercase"
                placeholder="SA"
                required
                disabled={!!editingCountry}
              />
              <p className="mt-1 text-xs text-secondary">
                {t('form.countryCodeHelp')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('form.currencyCode')}
              </label>
              <input
                type="text"
                value={formData.currencyCode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    currencyCode: e.target.value.toUpperCase(),
                  })
                }
                maxLength={3}
                className="w-full px-4 py-2 border border-stroke rounded-md bg-background text-foreground font-mono uppercase"
                placeholder="SAR"
                required
              />
              <p className="mt-1 text-xs text-secondary">
                {t('form.currencyCodeHelp')}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('form.currencySymbol')}
            </label>
            <input
              type="text"
              value={formData.currencySymbol}
              onChange={(e) =>
                setFormData({ ...formData, currencySymbol: e.target.value })
              }
              className="w-full px-4 py-2 border border-stroke rounded-md bg-background text-foreground"
              placeholder="ر.س"
              required
            />
            <p className="mt-1 text-xs text-secondary">
              {t('form.currencySymbolHelp')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('form.nameEn')}
            </label>
            <input
              type="text"
              value={formData.nameEn}
              onChange={(e) =>
                setFormData({ ...formData, nameEn: e.target.value })
              }
              className="w-full px-4 py-2 border border-stroke rounded-md bg-background text-foreground"
              placeholder="Saudi Arabia"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('form.nameAr')}
            </label>
            <input
              type="text"
              value={formData.nameAr}
              onChange={(e) =>
                setFormData({ ...formData, nameAr: e.target.value })
              }
              className="w-full px-4 py-2 border border-stroke rounded-md bg-background text-foreground"
              placeholder="المملكة العربية السعودية"
              dir="rtl"
              required
            />
          </div>

          <Switch
            id="isActive"
            checked={formData.isActive}
            onChange={(checked) =>
              setFormData({ ...formData, isActive: checked })
            }
            label={t('form.activeLabel')}
          />
        </form>
      </Modal>
    </div>
  );
}
