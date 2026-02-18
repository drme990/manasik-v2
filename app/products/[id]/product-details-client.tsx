'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/types/Product';
import { usePriceInCurrency } from '@/hooks/currency-hook';
import { useTranslations, useLocale } from 'next-intl';
import Button from '@/components/ui/button';
import ProductImageGallery from '@/components/shared/product-image-gallery';
import { Minus, Plus, Loader2, PackageX } from 'lucide-react';

export default function ProductDetailsClient({
  product,
}: {
  product: Product;
}) {
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'paymob' | 'easykash'>(
    'paymob',
  );
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const locale = useLocale();
  const t = useTranslations('productDetails');
  const tCommon = useTranslations('common');
  const getPrice = usePriceInCurrency();
  const isAr = locale === 'ar';

  const { amount, currency } = getPrice(
    product.prices,
    product.price,
    product.currency,
  );

  const hasSizes = product.sizes && product.sizes.length > 0;

  // Size-aware pricing: when a size is selected and has its own price, use it
  const getSizePrice = (sizeIndex: number) => {
    const size = product.sizes![sizeIndex];
    if (size.price && size.price > 0) {
      return getPrice(size.prices || [], size.price, product.currency);
    }
    return { amount, currency };
  };

  const activePrice =
    hasSizes && selectedSize !== null
      ? getSizePrice(selectedSize)
      : { amount, currency };

  const content = isAr ? product.content?.ar : product.content?.en;

  // Fetch current payment method
  useEffect(() => {
    fetch('/api/payment-method')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPaymentMethod(data.data.paymentMethod);
        }
      })
      .catch(() => {
        // Default to paymob on error
      })
      .finally(() => setPaymentLoading(false));
  }, []);

  // Get the Easy Kash links based on size selection or product-level
  const getEasykashLinks = () => {
    if (hasSizes && selectedSize !== null) {
      return product.sizes![selectedSize].easykashLinks;
    }
    if (!hasSizes) {
      return product.easykashLinks;
    }
    return null;
  };

  const easykashLinks = getEasykashLinks();

  return (
    <div
      className="flex flex-col gap-8 pb-20 max-w-2xl mx-auto"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Product Image Gallery */}
      <ProductImageGallery
        images={
          product.images && product.images.length > 0
            ? product.images
            : product.image
              ? [product.image]
              : []
        }
        alt={isAr ? product.name.ar : product.name.en}
        fallback={
          <span className="text-secondary">{tCommon('status.noImage')}</span>
        }
      />

      {/* Price & Name */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold leading-tight">
          {isAr ? product.name.ar : product.name.en}
        </h1>
        <span className="text-success font-bold text-xl md:text-2xl whitespace-nowrap">
          {activePrice.amount.toLocaleString()} {activePrice.currency}
        </span>
      </div>

      {/* Content */}
      {content && content !== '<p><br></p>' && (
        <div
          className="product-content"
          dangerouslySetInnerHTML={{
            __html: content.replace(/&nbsp;/g, ' '),
          }}
        />
      )}

      {/* Out of Stock */}
      {!product.inStock ? (
        <div className="flex flex-col items-center gap-3 py-8 px-6 bg-error/5 border border-error/20 rounded-site text-center">
          <PackageX className="text-error" size={40} />
          <p className="text-error font-bold text-lg">{t('outOfStock')}</p>
          <p className="text-secondary text-sm">{t('outOfStockMessage')}</p>
        </div>
      ) : paymentLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="animate-spin text-success" size={24} />
        </div>
      ) : paymentMethod === 'paymob' ? (
        <>
          {/* Size Selection (Paymob flow, if product has sizes with prices) */}
          {hasSizes && product.sizes!.some((s) => s.price && s.price > 0) && (
            <div className="flex flex-col gap-3">
              <h2 className="text-base font-bold">{t('selectSize')}</h2>
              <div className="flex flex-wrap gap-2">
                {product.sizes!.map((size, index) => {
                  const sizePrice =
                    size.price && size.price > 0 ? getSizePrice(index) : null;
                  return (
                    <Button
                      key={index}
                      type="button"
                      variant={selectedSize === index ? 'primary' : 'outline'}
                      onClick={() => setSelectedSize(index)}
                    >
                      {isAr ? size.name.ar : size.name.en}
                      {sizePrice && (
                        <span className="ms-1 text-xs opacity-80">
                          ({sizePrice.amount.toLocaleString()}{' '}
                          {sizePrice.currency})
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
              {selectedSize === null && (
                <p className="text-sm text-error">{t('selectSizeFirst')}</p>
              )}
            </div>
          )}

          {/* Quantity (Paymob flow) */}
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-bold">{t('quantity')}</h2>
            <div className="flex items-center justify-center gap-4">
              <Button
                type="button"
                size="custom"
                className="p-2"
                onClick={() => setQuantity((q) => q + 1)}
              >
                <Plus size={18} />
              </Button>
              <span className="bg-black dark:bg-white text-success rounded-site min-w-36 py-1 text-lg font-bold text-center tabular-nums">
                {quantity}
              </span>
              <Button
                type="button"
                size="custom"
                className="p-2"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Minus size={18} />
              </Button>
            </div>
          </div>

          {/* CTA (Paymob flow) */}
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            href={`/checkout?product=${product._id}&qty=${quantity}${selectedSize !== null ? `&size=${selectedSize}` : ''}`}
            disabled={
              hasSizes &&
              product.sizes!.some((s) => s.price && s.price > 0) &&
              selectedSize === null
            }
          >
            {t('payNow')}
          </Button>
        </>
      ) : (
        <>
          {/* Size Selection (Easy Kash flow, if product has sizes) */}
          {hasSizes && (
            <div className="flex flex-col gap-3">
              <h2 className="text-base font-bold">{t('selectSize')}</h2>
              <div className="flex flex-wrap gap-2">
                {product.sizes!.map((size, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant={selectedSize === index ? 'primary' : 'outline'}
                    onClick={() => setSelectedSize(index)}
                  >
                    {isAr ? size.name.ar : size.name.en}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Easy Kash Payment Options */}
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-bold">{t('choosePayment')}</h2>

            {hasSizes && selectedSize === null ? (
              <p className="text-sm text-error">{t('selectSizeFirst')}</p>
            ) : easykashLinks ? (
              <div className="flex flex-col gap-2">
                {easykashLinks.fullPayment && (
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    href={easykashLinks.fullPayment}
                    target="_blank"
                  >
                    {t('fullPayment')}
                  </Button>
                )}
                {easykashLinks.halfPayment && (
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    href={easykashLinks.halfPayment}
                    target="_blank"
                  >
                    {t('halfPayment')}
                  </Button>
                )}
                {easykashLinks.customPayment && (
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    href={easykashLinks.customPayment}
                    target="_blank"
                  >
                    {t('customPayment')}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-secondary">{t('noLinksAvailable')}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
