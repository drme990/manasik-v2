'use client';

import { useState, useEffect, useRef } from 'react';
import { Product } from '@/types/Product';
import Input from '@/components/ui/input';
import Switch from '@/components/ui/switch';
import BackButton from '@/components/shared/back-button';
import Button from '@/components/ui/button';
import MultiCurrencyPriceEditor, {
  CurrencyPrice,
} from '@/components/admin/multi-currency-price-editor';
import MultiCurrencyMinimumPaymentEditor, {
  CurrencyMinimumPayment,
} from '@/components/admin/multi-currency-minimum-payment-editor';
import MultiImageUpload from '@/components/admin/multi-image-upload';
import RichTextEditor from '@/components/ui/rich-text-editor';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';

interface ProductFormProps {
  product?: Product | null;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  loading?: boolean;
}

export default function ProductForm({
  product,
  onSubmit,
  loading = false,
}: ProductFormProps) {
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    content_ar: '',
    content_en: '',
    price: 0,
    currency: 'SAR',
    mainCurrency: 'SAR',
    prices: [] as CurrencyPrice[],
    inStock: true,
    images: [] as string[],
    allowPartialPayment: false,
    minimumPaymentType: 'percentage' as 'percentage' | 'fixed',
    minimumPaymentValue: 50,
    minimumPayments: [] as CurrencyMinimumPayment[],
  });
  const [addedPricePercentage, setAddedPricePercentage] = useState<number>(0);
  const [hasChanges, setHasChanges] = useState(false);
  const isInitialMount = useRef(true);
  const t = useTranslations('admin.products');

  // Initialize form data when product prop changes
  useEffect(() => {
    if (product) {
      setFormData({
        name_ar: product.name.ar,
        name_en: product.name.en,
        content_ar: product.content?.ar || '',
        content_en: product.content?.en || '',
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
        minimumPaymentType:
          product.minimumPaymentType ||
          product.minimumPayment?.type ||
          'percentage',
        minimumPaymentValue: product.minimumPayment?.value ?? 50,
        minimumPayments: product.minimumPayments || [],
      });
    }
    // Reset change tracking after loading product data
    setHasChanges(false);
    isInitialMount.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?._id]);

  // Track form changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setHasChanges(true);
  }, [formData]);

  // Block Ctrl+R and Ctrl+Shift+R
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        toast.info(
          t('messages.refreshDisabled') || 'Refresh is disabled while editing',
        );
        return false;
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        toast.info(
          t('messages.refreshDisabled') || 'Refresh is disabled while editing',
        );
        return false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [t]);

  // Show warning before leaving if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

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

    const productData = {
      name: { ar: formData.name_ar, en: formData.name_en },
      content: { ar: formData.content_ar, en: formData.content_en },
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
      minimumPaymentType: formData.minimumPaymentType,
      minimumPayments: formData.minimumPayments,
    };

    try {
      await onSubmit(productData);
      // Reset change tracking after successful submission
      setHasChanges(false);
    } catch (error) {
      // If submission fails, keep hasChanges as true
      console.error('Form submission error:', error);
    }
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

      {/* Content (Arabic) */}
      <RichTextEditor
        label={t('form.contentAr')}
        helperText={t('form.contentHelp')}
        value={formData.content_ar}
        onChange={(value) => setFormData({ ...formData, content_ar: value })}
        placeholder={t('form.contentPlaceholder')}
        dir="rtl"
      />

      {/* Content (English) */}
      <RichTextEditor
        label={t('form.contentEn')}
        helperText={t('form.contentHelp')}
        value={formData.content_en}
        onChange={(value) => setFormData({ ...formData, content_en: value })}
        placeholder={t('form.contentPlaceholder')}
        dir="ltr"
      />

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
          <div className="pt-2">
            <MultiCurrencyMinimumPaymentEditor
              mainCurrency={formData.mainCurrency}
              minimumPaymentType={formData.minimumPaymentType}
              baseMinimumValue={formData.minimumPaymentValue}
              minimumPayments={formData.minimumPayments}
              prices={formData.prices}
              onChange={(minimumPayments) =>
                setFormData({ ...formData, minimumPayments })
              }
              onTypeChange={(type) =>
                setFormData({ ...formData, minimumPaymentType: type })
              }
              onBaseValueChange={(value) =>
                setFormData({ ...formData, minimumPaymentValue: value })
              }
            />
          </div>
        )}
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
        <BackButton className="w-auto! px-4!" />
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          className="flex-1"
        >
          {loading
            ? t('buttons.uploading')
            : product
              ? t('buttons.updateProduct')
              : t('buttons.addProduct')}
        </Button>
      </div>
    </form>
  );
}
