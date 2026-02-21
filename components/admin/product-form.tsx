'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '@/types/Product';
import Input from '@/components/ui/input';
import Switch from '@/components/ui/switch';
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
import { Plus, X } from 'lucide-react';
import Loading from '../ui/loading';

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
    sizes: [] as {
      name: { ar: string; en: string };
      price: number;
      prices: CurrencyPrice[];
      feedsUp: number;
      easykashLinks: {
        fullPayment: string;
        halfPayment: string;
        customPayment: string;
      };
    }[],
    easykashLinks: {
      fullPayment: '',
      halfPayment: '',
      customPayment: '',
    },
    workAsSacrifice: false,
    sacrificeCount: 1,
    feedsUp: 0,
  });
  const [addedPricePercentage, setAddedPricePercentage] = useState<number>(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [isFormDataReady, setIsFormDataReady] = useState(false);
  const isInitialMount = useRef(true);
  const t = useTranslations('admin.products');
  const router = useRouter();

  // Initialize form data when product prop changes
  useEffect(() => {
    if (product) {
      // Set ready to false while updating
      setIsFormDataReady(false);

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
        sizes:
          product.sizes?.map((s) => ({
            name: { ar: s.name.ar || '', en: s.name.en || '' },
            price: s.price || 0,
            prices: s.prices || [],
            feedsUp: s.feedsUp ?? 0,
            easykashLinks: {
              fullPayment: s.easykashLinks?.fullPayment || '',
              halfPayment: s.easykashLinks?.halfPayment || '',
              customPayment: s.easykashLinks?.customPayment || '',
            },
          })) || [],
        easykashLinks: {
          fullPayment: product.easykashLinks?.fullPayment || '',
          halfPayment: product.easykashLinks?.halfPayment || '',
          customPayment: product.easykashLinks?.customPayment || '',
        },
        workAsSacrifice: product.workAsSacrifice || false,
        sacrificeCount: product.sacrificeCount ?? 1,
        feedsUp: product.feedsUp ?? 0,
      });

      // Use setTimeout to ensure state is updated before setting ready
      setTimeout(() => {
        setIsFormDataReady(true);
        setHasChanges(false);
        isInitialMount.current = true;
      }, 0);
    } else {
      setIsFormDataReady(true);
    }
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

  const addSize = () => {
    setFormData({
      ...formData,
      sizes: [
        ...formData.sizes,
        {
          name: { ar: '', en: '' },
          price: 0,
          prices: [],
          feedsUp: 0,
          easykashLinks: {
            fullPayment: '',
            halfPayment: '',
            customPayment: '',
          },
        },
      ],
    });
  };

  const removeSize = (index: number) => {
    setFormData({
      ...formData,
      sizes: formData.sizes.filter((_, i) => i !== index),
    });
  };

  const updateSize = (
    index: number,
    field: string,
    value: string | number | CurrencyPrice[],
  ) => {
    const updatedSizes = [...formData.sizes];
    const size = { ...updatedSizes[index] };

    if (field === 'name.ar') {
      size.name = { ...size.name, ar: value as string };
    } else if (field === 'name.en') {
      size.name = { ...size.name, en: value as string };
    } else if (field === 'price') {
      size.price = value as number;
    } else if (field === 'prices') {
      size.prices = value as CurrencyPrice[];
    } else if (field === 'easykashLinks.fullPayment') {
      size.easykashLinks = {
        ...size.easykashLinks,
        fullPayment: value as string,
      };
    } else if (field === 'easykashLinks.halfPayment') {
      size.easykashLinks = {
        ...size.easykashLinks,
        halfPayment: value as string,
      };
    } else if (field === 'easykashLinks.customPayment') {
      size.easykashLinks = {
        ...size.easykashLinks,
        customPayment: value as string,
      };
    } else if (field === 'feedsUp') {
      size.feedsUp = value as number;
    }

    updatedSizes[index] = size;
    setFormData({ ...formData, sizes: updatedSizes });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasSizes = formData.sizes.length > 0;

    const productData = {
      name: { ar: formData.name_ar, en: formData.name_en },
      content: {
        ar: formData.content_ar.replace(/&nbsp;/g, ' '),
        en: formData.content_en.replace(/&nbsp;/g, ' '),
      },
      // When sizes exist, product-level price is unused → store 0 / []
      price: hasSizes ? 0 : formData.price,
      currency: formData.currency,
      mainCurrency: formData.mainCurrency,
      prices: hasSizes ? [] : formData.prices,
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
      sizes: formData.sizes,
      easykashLinks: hasSizes
        ? { fullPayment: '', halfPayment: '', customPayment: '' }
        : formData.easykashLinks,
      workAsSacrifice: formData.workAsSacrifice,
      sacrificeCount: formData.workAsSacrifice ? formData.sacrificeCount : 1,
      feedsUp: hasSizes ? 0 : formData.feedsUp,
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

  // Don't render form until data is ready (prevents RichTextEditor from mounting with empty content)
  if (product && !isFormDataReady) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading />
      </div>
    );
  }

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
        key={`content_ar_${product?._id || 'new'}`}
        label={t('form.contentAr')}
        helperText={t('form.contentHelp')}
        value={formData.content_ar}
        onChange={(value) =>
          setFormData((prev) => ({ ...prev, content_ar: value }))
        }
        placeholder={t('form.contentPlaceholder')}
        dir="rtl"
      />

      {/* Content (English) */}
      <RichTextEditor
        key={`content_en_${product?._id || 'new'}`}
        label={t('form.contentEn')}
        helperText={t('form.contentHelp')}
        value={formData.content_en}
        onChange={(value) =>
          setFormData((prev) => ({ ...prev, content_en: value }))
        }
        placeholder={t('form.contentPlaceholder')}
        dir="ltr"
      />

      {/* Main Currency selector (always visible) */}
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
        // Hide price inputs when sizes exist (prices live on each size)
        hidePrice={formData.sizes.length > 0}
      />

      {/* Added Price Percentage — only when no sizes */}
      {formData.sizes.length === 0 && (
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
      )}

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

      {/* Product Sizes (Optional) */}
      <div className="border border-stroke rounded-lg p-4 bg-background space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">{t('form.sizes')}</h3>
            <p className="text-xs text-secondary mt-1">{t('form.sizesHelp')}</p>
          </div>
          <button
            type="button"
            onClick={addSize}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-success text-white rounded-lg hover:bg-success/90 transition-colors"
          >
            <Plus size={16} />
            {t('form.addSize')}
          </button>
        </div>

        {formData.sizes.length === 0 && (
          <p className="text-sm text-secondary italic">{t('form.noSizes')}</p>
        )}

        {formData.sizes.map((size, index) => (
          <div
            key={index}
            className="border border-stroke rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">
                {t('form.sizeNumber', { number: index + 1 })}
              </h4>
              <button
                type="button"
                onClick={() => removeSize(index)}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                title={t('form.removeSize')}
              >
                <X size={16} />
              </button>
            </div>

            {/* Size Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label={t('form.sizeNameAr')}
                type="text"
                value={size.name.ar}
                onChange={(e) => updateSize(index, 'name.ar', e.target.value)}
              />
              <Input
                label={t('form.sizeNameEn')}
                type="text"
                value={size.name.en}
                onChange={(e) => updateSize(index, 'name.en', e.target.value)}
              />
            </div>

            {/* Size Price */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-secondary">
                {t('form.sizePrice')}
              </label>
              <Input
                label={`${t('form.sizeBasePrice')} (${formData.mainCurrency})`}
                type="number"
                value={size.price || ''}
                onChange={(e) =>
                  updateSize(index, 'price', parseFloat(e.target.value) || 0)
                }
                min="0"
                step="0.01"
              />
              {size.price > 0 && (
                <MultiCurrencyPriceEditor
                  mainCurrency={formData.mainCurrency}
                  basePrice={size.price}
                  prices={size.prices}
                  onChange={(prices) => updateSize(index, 'prices', prices)}
                  onMainCurrencyChange={() => {}}
                  onBasePriceChange={() => {}}
                  compact
                />
              )}
            </div>

            {/* Easy Kash Links for this size */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-secondary">
                {t('form.easykashLinks')}
              </label>
              <Input
                label={t('form.fullPaymentLink')}
                type="url"
                value={size.easykashLinks.fullPayment}
                onChange={(e) =>
                  updateSize(index, 'easykashLinks.fullPayment', e.target.value)
                }
              />
              <Input
                label={t('form.halfPaymentLink')}
                type="url"
                value={size.easykashLinks.halfPayment}
                onChange={(e) =>
                  updateSize(index, 'easykashLinks.halfPayment', e.target.value)
                }
              />
              <Input
                label={t('form.customPaymentLink')}
                type="url"
                value={size.easykashLinks.customPayment}
                onChange={(e) =>
                  updateSize(
                    index,
                    'easykashLinks.customPayment',
                    e.target.value,
                  )
                }
              />
            </div>

            {/* Feeds up (per size) */}
            <Input
              label={t('form.feedsUpLabel')}
              type="number"
              value={size.feedsUp || ''}
              onChange={(e) =>
                updateSize(index, 'feedsUp', parseInt(e.target.value) || 0)
              }
              min="0"
              helperText={t('form.feedsUpHelp')}
            />
          </div>
        ))}
      </div>

      {/* Easy Kash Links (when no sizes) */}
      {formData.sizes.length === 0 && (
        <div className="border border-stroke rounded-lg p-4 bg-background space-y-3">
          <div>
            <h3 className="text-sm font-medium">{t('form.easykashLinks')}</h3>
            <p className="text-xs text-secondary mt-1">
              {t('form.easykashLinksHelp')}
            </p>
          </div>
          <Input
            label={t('form.fullPaymentLink')}
            type="url"
            value={formData.easykashLinks.fullPayment}
            onChange={(e) =>
              setFormData({
                ...formData,
                easykashLinks: {
                  ...formData.easykashLinks,
                  fullPayment: e.target.value,
                },
              })
            }
          />
          <Input
            label={t('form.halfPaymentLink')}
            type="url"
            value={formData.easykashLinks.halfPayment}
            onChange={(e) =>
              setFormData({
                ...formData,
                easykashLinks: {
                  ...formData.easykashLinks,
                  halfPayment: e.target.value,
                },
              })
            }
          />
          <Input
            label={t('form.customPaymentLink')}
            type="url"
            value={formData.easykashLinks.customPayment}
            onChange={(e) =>
              setFormData({
                ...formData,
                easykashLinks: {
                  ...formData.easykashLinks,
                  customPayment: e.target.value,
                },
              })
            }
          />
        </div>
      )}

      {/* Feeds Up (product level, only when no sizes) */}
      {formData.sizes.length === 0 && (
        <Input
          label={t('form.feedsUpLabel')}
          type="number"
          value={formData.feedsUp || ''}
          onChange={(e) =>
            setFormData({ ...formData, feedsUp: parseInt(e.target.value) || 0 })
          }
          min="0"
          helperText={t('form.feedsUpHelp')}
        />
      )}

      {/* Multi-Image Upload */}
      <MultiImageUpload
        images={formData.images}
        onChange={(images) => setFormData({ ...formData, images })}
      />

      {/* Sacrifice / Aqeqa Settings */}
      <div className="space-y-3 p-4 border border-stroke rounded-site">
        <p className="text-sm font-semibold text-foreground">
          {t('form.sacrificeSection')}
        </p>
        <Switch
          id="workAsSacrifice"
          checked={formData.workAsSacrifice}
          onChange={(checked) =>
            setFormData({ ...formData, workAsSacrifice: checked })
          }
          label={t('form.workAsSacrificeLabel')}
        />
        {formData.workAsSacrifice && (
          <Input
            label={t('form.sacrificeCountLabel')}
            type="number"
            min={1}
            value={formData.sacrificeCount}
            onChange={(e) =>
              setFormData({
                ...formData,
                sacrificeCount: Math.max(1, parseInt(e.target.value) || 1),
              })
            }
            helperText={t('form.sacrificeCountHelp')}
          />
        )}
      </div>

      {/* In Stock */}
      <Switch
        id="inStock"
        checked={formData.inStock}
        onChange={(checked) => setFormData({ ...formData, inStock: checked })}
        label={t('form.inStockLabel')}
      />

      {/* Buttons */}
      <div className="flex items-center gap-3 pt-4 border-t border-stroke">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.replace('/admin/products')}
          className="flex-1"
        >
          {t('buttons.cancel')}
        </Button>
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
