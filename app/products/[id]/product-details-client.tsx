'use client';

import { useState } from 'react';
import { Product } from '@/types/Product';
import { usePriceInCurrency } from '@/hooks/currency-hook';
import { useTranslations, useLocale } from 'next-intl';
import Button from '@/components/ui/button';
import ProductImageGallery from '@/components/shared/product-image-gallery';
import { Minus, Plus } from 'lucide-react';

export default function ProductDetailsClient({
  product,
}: {
  product: Product;
}) {
  const [quantity, setQuantity] = useState(1);
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

  const content = isAr ? product.content?.ar : product.content?.en;

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
          {amount.toLocaleString()} {currency}
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

      {/* Quantity */}
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

      {/* CTA */}
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        href={`/checkout?product=${product._id}&qty=${quantity}`}
      >
        {t('payNow')}
      </Button>
    </div>
  );
}
