'use client';

import { useState, useEffect } from 'react';
import { Product, ProductSection } from '@/types/Product';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import Input from '@/components/ui/input';
import Switch from '@/components/ui/switch';
import Dropdown from '@/components/ui/dropdown';
import MultiCurrencyPriceEditor, {
  CurrencyPrice,
} from '@/components/admin/multi-currency-price-editor';
import MultiImageUpload from '@/components/admin/multi-image-upload';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';

interface ProductFormProps {
  product?: Product | null;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function ProductForm({
  product,
  onSubmit,
  onCancel,
  loading = false,
}: ProductFormProps) {
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    description_ar: '',
    description_en: '',
    features_ar: [] as string[],
    features_en: [] as string[],
    sections: [] as ProductSection[],
    verify_ar: '',
    verify_en: '',
    receiving_ar: '',
    receiving_en: '',
    implementationMechanism_ar: '',
    implementationMechanism_en: '',
    implementationPeriod_ar: '',
    implementationPeriod_en: '',
    implementationPlaces_ar: '',
    implementationPlaces_en: '',
    price: 0,
    currency: 'SAR',
    mainCurrency: 'SAR',
    prices: [] as CurrencyPrice[],
    inStock: true,
    images: [] as string[],
    allowPartialPayment: false,
    minimumPaymentType: 'percentage' as 'percentage' | 'fixed',
    minimumPaymentValue: 50,
  });
  const [addedPricePercentage, setAddedPricePercentage] = useState<number>(0);
  const t = useTranslations('admin.products');

  // Initialize form data when product prop changes
  useEffect(() => {
    if (product) {
      setFormData({
        name_ar: product.name.ar,
        name_en: product.name.en,
        description_ar: product.description.ar,
        description_en: product.description.en,
        features_ar: product.features?.ar || [],
        features_en: product.features?.en || [],
        sections: product.sections || [],
        verify_ar: product.verify?.ar || '',
        verify_en: product.verify?.en || '',
        receiving_ar: product.receiving?.ar || '',
        receiving_en: product.receiving?.en || '',
        implementationMechanism_ar: product.implementationMechanism?.ar || '',
        implementationMechanism_en: product.implementationMechanism?.en || '',
        implementationPeriod_ar: product.implementationPeriod?.ar || '',
        implementationPeriod_en: product.implementationPeriod?.en || '',
        implementationPlaces_ar: product.implementationPlaces?.ar || '',
        implementationPlaces_en: product.implementationPlaces?.en || '',
        price: product.price,
        currency: product.currency,
        mainCurrency: product.mainCurrency || product.currency || 'SAR',
        prices: product.prices || [],
        inStock: product.inStock,
        images: product.images?.length
          ? product.images
          : product.image
            ? [product.image]
            : [],
        allowPartialPayment: product.allowPartialPayment || false,
        minimumPaymentType: product.minimumPayment?.type || 'percentage',
        minimumPaymentValue: product.minimumPayment?.value ?? 50,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?._id]);

  const handleApplyPriceIncrease = () => {
    if (!addedPricePercentage || addedPricePercentage <= 0) {
      toast.error(t('messages.invalidPercentage'));
      return;
    }
    if (formData.price <= 0) {
      toast.error(t('messages.setPriceFirst'));
      return;
    }
    const multiplier = 1 + addedPricePercentage / 100;
    const newBasePrice = Math.ceil(formData.price * multiplier);
    const updatedPrices = formData.prices.map((p) => ({
      ...p,
      amount: Math.ceil(p.amount * multiplier),
    }));
    setFormData({ ...formData, price: newBasePrice, prices: updatedPrices });
    toast.success(
      t('messages.priceIncreased', { percentage: addedPricePercentage }),
    );
    setAddedPricePercentage(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Filter valid sections
    const validSections = formData.sections.filter(
      (s) =>
        s.title.ar.trim() ||
        s.title.en.trim() ||
        s.content.ar.trim() ||
        s.content.en.trim(),
    );

    const removedSections = formData.sections.length - validSections.length;
    if (removedSections > 0) {
      toast.warning(t('messages.sectionsFiltered', { count: removedSections }));
    }

    const productData = {
      name: { ar: formData.name_ar, en: formData.name_en },
      description: {
        ar: formData.description_ar,
        en: formData.description_en,
      },
      features: {
        ar: formData.features_ar.filter((f) => f.trim()),
        en: formData.features_en.filter((f) => f.trim()),
      },
      sections: validSections,
      verify: { ar: formData.verify_ar, en: formData.verify_en },
      receiving: { ar: formData.receiving_ar, en: formData.receiving_en },
      implementationMechanism: {
        ar: formData.implementationMechanism_ar,
        en: formData.implementationMechanism_en,
      },
      implementationPeriod: {
        ar: formData.implementationPeriod_ar,
        en: formData.implementationPeriod_en,
      },
      implementationPlaces: {
        ar: formData.implementationPlaces_ar,
        en: formData.implementationPlaces_en,
      },
      price: formData.price,
      currency: formData.currency,
      mainCurrency: formData.mainCurrency,
      prices: formData.prices,
      inStock: formData.inStock,
      image: formData.images[0] || '',
      images: formData.images,
      allowPartialPayment: formData.allowPartialPayment,
      minimumPayment: {
        type: formData.minimumPaymentType,
        value: formData.minimumPaymentValue,
      },
    };

    await onSubmit(productData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label={t('form.nameAr')}
          type="text"
          required
          value={formData.name_ar}
          onChange={(e) =>
            setFormData({ ...formData, name_ar: e.target.value })
          }
        />
        <Input
          label={t('form.nameEn')}
          type="text"
          required
          value={formData.name_en}
          onChange={(e) =>
            setFormData({ ...formData, name_en: e.target.value })
          }
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-2">
          {t('form.descriptionAr')}
        </label>
        <textarea
          required
          rows={3}
          value={formData.description_ar}
          onChange={(e) =>
            setFormData({ ...formData, description_ar: e.target.value })
          }
          className="w-full px-4 py-2 rounded-lg border border-stroke bg-background focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">
          {t('form.descriptionEn')}
        </label>
        <textarea
          required
          rows={3}
          value={formData.description_en}
          onChange={(e) =>
            setFormData({ ...formData, description_en: e.target.value })
          }
          className="w-full px-4 py-2 rounded-lg border border-stroke bg-background focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success"
        />
      </div>

      {/* Multi-Currency Price Editor */}
      <MultiCurrencyPriceEditor
        mainCurrency={formData.mainCurrency}
        basePrice={formData.price}
        prices={formData.prices}
        onChange={(prices) => setFormData({ ...formData, prices })}
        onMainCurrencyChange={(currency) => {
          setFormData({
            ...formData,
            mainCurrency: currency,
            currency: currency,
          });
        }}
        onBasePriceChange={(price) => setFormData({ ...formData, price })}
      />

      {/* Added Price Percentage */}
      <div className="border border-stroke rounded-lg p-4 bg-background space-y-3">
        <label className="block text-sm font-medium">
          {t('form.addedPrice')}
        </label>
        <p className="text-xs text-secondary">{t('form.addedPriceHelp')}</p>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              type="number"
              value={addedPricePercentage || ''}
              onChange={(e) =>
                setAddedPricePercentage(parseFloat(e.target.value) || 0)
              }
              placeholder={t('form.addedPricePlaceholder')}
              min="0"
              step="0.1"
            />
          </div>
          <button
            type="button"
            onClick={handleApplyPriceIncrease}
            disabled={!addedPricePercentage || addedPricePercentage <= 0}
            className="px-6 py-3 bg-success text-white rounded-lg hover:bg-success/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('form.applyButton')}
          </button>
        </div>
      </div>

      {/* Partial Payment Settings */}
      <div className="border border-stroke rounded-lg p-4 bg-background space-y-4">
        <Switch
          id="allowPartialPayment"
          checked={formData.allowPartialPayment}
          onChange={(checked) =>
            setFormData({ ...formData, allowPartialPayment: checked })
          }
          label={t('form.allowPartialPayment')}
        />
        {formData.allowPartialPayment && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Dropdown
                label={t('form.minimumPaymentType')}
                value={formData.minimumPaymentType}
                options={[
                  {
                    label: t('form.minimumPaymentPercentage'),
                    value: 'percentage',
                  },
                  {
                    label: t('form.minimumPaymentFixed'),
                    value: 'fixed',
                  },
                ]}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    minimumPaymentType: value as 'percentage' | 'fixed',
                  })
                }
              />
            </div>
            <Input
              label={t('form.minimumPaymentValue')}
              type="number"
              min="0"
              step="1"
              value={formData.minimumPaymentValue}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  minimumPaymentValue: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>
        )}
      </div>

      {/* Features AR */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium">
            {t('form.featuresAr')}
          </label>
          <button
            type="button"
            onClick={() =>
              setFormData({
                ...formData,
                features_ar: [...formData.features_ar, ''],
              })
            }
            className="text-xs text-success hover:text-success/80 flex items-center gap-1"
          >
            <Plus size={14} />
            {t('form.addFeature')}
          </button>
        </div>
        {formData.features_ar.map((feature, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={feature}
              onChange={(e) => {
                const updated = [...formData.features_ar];
                updated[index] = e.target.value;
                setFormData({ ...formData, features_ar: updated });
              }}
              placeholder={`${t('form.featurePlaceholder')} ${index + 1}`}
            />
            <button
              type="button"
              onClick={() => {
                const updated = formData.features_ar.filter(
                  (_, i) => i !== index,
                );
                setFormData({ ...formData, features_ar: updated });
              }}
              className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Features EN */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium">
            {t('form.featuresEn')}
          </label>
          <button
            type="button"
            onClick={() =>
              setFormData({
                ...formData,
                features_en: [...formData.features_en, ''],
              })
            }
            className="text-xs text-success hover:text-success/80 flex items-center gap-1"
          >
            <Plus size={14} />
            {t('form.addFeature')}
          </button>
        </div>
        {formData.features_en.map((feature, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={feature}
              onChange={(e) => {
                const updated = [...formData.features_en];
                updated[index] = e.target.value;
                setFormData({ ...formData, features_en: updated });
              }}
              placeholder={`${t('form.featurePlaceholder')} ${index + 1}`}
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => {
                const updated = formData.features_en.filter(
                  (_, i) => i !== index,
                );
                setFormData({ ...formData, features_en: updated });
              }}
              className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Custom Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium">
            {t('form.customSections')}
          </label>
          <button
            type="button"
            onClick={() =>
              setFormData({
                ...formData,
                sections: [
                  ...formData.sections,
                  {
                    title: { ar: '', en: '' },
                    content: { ar: '', en: '' },
                    type: 'text',
                  },
                ],
              })
            }
            className="text-xs text-success hover:text-success/80 flex items-center gap-1"
          >
            <Plus size={14} />
            {t('form.addSection')}
          </button>
        </div>

        {formData.sections.map((section, sIndex) => (
          <div
            key={sIndex}
            className="border border-stroke rounded-lg p-4 space-y-3 relative"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-xs text-secondary">
                <GripVertical size={14} />
                <span>{t('form.sectionNumber', { number: sIndex + 1 })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Dropdown
                  value={section.type}
                  options={[
                    {
                      label: t('form.sectionTypeText'),
                      value: 'text',
                    },
                    {
                      label: t('form.sectionTypeList'),
                      value: 'list',
                    },
                  ]}
                  onChange={(value) => {
                    const updated = [...formData.sections];
                    updated[sIndex] = {
                      ...updated[sIndex],
                      type: value as 'text' | 'list',
                    };
                    setFormData({ ...formData, sections: updated });
                  }}
                  className="w-24"
                />
                <button
                  type="button"
                  onClick={() => {
                    const updated = formData.sections.filter(
                      (_, i) => i !== sIndex,
                    );
                    setFormData({ ...formData, sections: updated });
                  }}
                  className="p-1 text-error hover:bg-error/10 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label={t('form.sectionTitleAr')}
                value={section.title.ar}
                onChange={(e) => {
                  const updated = [...formData.sections];
                  updated[sIndex] = {
                    ...updated[sIndex],
                    title: { ...updated[sIndex].title, ar: e.target.value },
                  };
                  setFormData({ ...formData, sections: updated });
                }}
                placeholder={t('form.sectionTitleArPlaceholder')}
              />
              <Input
                label={t('form.sectionTitleEn')}
                value={section.title.en}
                onChange={(e) => {
                  const updated = [...formData.sections];
                  updated[sIndex] = {
                    ...updated[sIndex],
                    title: { ...updated[sIndex].title, en: e.target.value },
                  };
                  setFormData({ ...formData, sections: updated });
                }}
                placeholder={t('form.sectionTitleEnPlaceholder')}
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                {t('form.sectionContentAr')}
              </label>
              <textarea
                rows={3}
                value={section.content.ar}
                onChange={(e) => {
                  const updated = [...formData.sections];
                  updated[sIndex] = {
                    ...updated[sIndex],
                    content: { ...updated[sIndex].content, ar: e.target.value },
                  };
                  setFormData({ ...formData, sections: updated });
                }}
                placeholder={
                  section.type === 'list'
                    ? t('form.sectionContentListPlaceholder')
                    : t('form.sectionContentTextPlaceholder')
                }
                className="w-full px-3 py-2 rounded-lg border border-stroke bg-background focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                {t('form.sectionContentEn')}
              </label>
              <textarea
                rows={3}
                value={section.content.en}
                onChange={(e) => {
                  const updated = [...formData.sections];
                  updated[sIndex] = {
                    ...updated[sIndex],
                    content: { ...updated[sIndex].content, en: e.target.value },
                  };
                  setFormData({ ...formData, sections: updated });
                }}
                placeholder={
                  section.type === 'list'
                    ? t('form.sectionContentListPlaceholder')
                    : t('form.sectionContentTextPlaceholder')
                }
                dir="ltr"
                className="w-full px-3 py-2 rounded-lg border border-stroke bg-background focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Optional Product Details */}
      <div className="space-y-4 border-t border-stroke pt-4">
        <label className="block text-sm font-medium text-secondary">
          {t('form.optionalDetails')}
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t('form.verifyAr')}
            value={formData.verify_ar}
            onChange={(e) =>
              setFormData({ ...formData, verify_ar: e.target.value })
            }
            placeholder={t('form.verifyArPlaceholder')}
          />
          <Input
            label={t('form.verifyEn')}
            value={formData.verify_en}
            onChange={(e) =>
              setFormData({ ...formData, verify_en: e.target.value })
            }
            placeholder={t('form.verifyEnPlaceholder')}
            dir="ltr"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t('form.receivingAr')}
            value={formData.receiving_ar}
            onChange={(e) =>
              setFormData({ ...formData, receiving_ar: e.target.value })
            }
            placeholder={t('form.receivingArPlaceholder')}
          />
          <Input
            label={t('form.receivingEn')}
            value={formData.receiving_en}
            onChange={(e) =>
              setFormData({ ...formData, receiving_en: e.target.value })
            }
            placeholder={t('form.receivingEnPlaceholder')}
            dir="ltr"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t('form.implementationMechanismAr')}
            value={formData.implementationMechanism_ar}
            onChange={(e) =>
              setFormData({
                ...formData,
                implementationMechanism_ar: e.target.value,
              })
            }
            placeholder={t('form.implementationMechanismArPlaceholder')}
          />
          <Input
            label={t('form.implementationMechanismEn')}
            value={formData.implementationMechanism_en}
            onChange={(e) =>
              setFormData({
                ...formData,
                implementationMechanism_en: e.target.value,
              })
            }
            placeholder={t('form.implementationMechanismEnPlaceholder')}
            dir="ltr"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t('form.implementationPeriodAr')}
            value={formData.implementationPeriod_ar}
            onChange={(e) =>
              setFormData({
                ...formData,
                implementationPeriod_ar: e.target.value,
              })
            }
            placeholder={t('form.implementationPeriodArPlaceholder')}
          />
          <Input
            label={t('form.implementationPeriodEn')}
            value={formData.implementationPeriod_en}
            onChange={(e) =>
              setFormData({
                ...formData,
                implementationPeriod_en: e.target.value,
              })
            }
            placeholder={t('form.implementationPeriodEnPlaceholder')}
            dir="ltr"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t('form.implementationPlacesAr')}
            value={formData.implementationPlaces_ar}
            onChange={(e) =>
              setFormData({
                ...formData,
                implementationPlaces_ar: e.target.value,
              })
            }
            placeholder={t('form.implementationPlacesArPlaceholder')}
          />
          <Input
            label={t('form.implementationPlacesEn')}
            value={formData.implementationPlaces_en}
            onChange={(e) =>
              setFormData({
                ...formData,
                implementationPlaces_en: e.target.value,
              })
            }
            placeholder={t('form.implementationPlacesEnPlaceholder')}
            dir="ltr"
          />
        </div>
      </div>

      {/* Multi-Image Upload */}
      <MultiImageUpload
        images={formData.images}
        onChange={(images) => setFormData({ ...formData, images })}
      />

      {/* In Stock */}
      <Switch
        id="inStock"
        checked={formData.inStock}
        onChange={(checked) => setFormData({ ...formData, inStock: checked })}
        label={t('form.inStockLabel')}
      />

      {/* Buttons */}
      <div className="flex items-center gap-3 pt-4 border-t border-stroke">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 bg-background border border-stroke rounded-lg hover:bg-stroke/10 transition-colors font-medium"
        >
          {t('buttons.cancel')}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 bg-success text-white rounded-lg hover:bg-success/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? t('buttons.uploading')
            : product
              ? t('buttons.updateProduct')
              : t('buttons.addProduct')}
        </button>
      </div>
    </form>
  );
}
