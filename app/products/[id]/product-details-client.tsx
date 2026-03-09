'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Minus, Plus, PackageX } from 'lucide-react';
import { Product } from '@/types/Product';
import { usePriceInCurrency } from '@/hooks/currency-hook';
import Button from '@/components/ui/button';
import ProductImageGallery from '@/components/shared/product-image-gallery';
import { trackEvent } from '@/lib/fb-pixel';
import { getStoredReferral } from '@/components/providers/referral-provider';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getProductImages(product: Product): string[] {
  if (product.images && product.images.length > 0) return product.images;
  return [];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductDetailsClient({
  product,
}: {
  product: Product;
}) {
  const t = useTranslations('productDetails');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const getPrice = usePriceInCurrency();

  const isAr = locale === 'ar';
  const showSizeSelector = product.sizes.length > 1;
  const content = isAr ? product.content?.ar : product.content?.en;

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<number>(0);
  const viewTracked = useRef(false);

  // ── FB Pixel: ViewContent (fire once on mount) ─────────────────────────────
  useEffect(() => {
    if (viewTracked.current) return;
    viewTracked.current = true;

    const price = product.sizes?.[0]?.price ?? 0;
    trackEvent('ViewContent', {
      content_ids: [product._id],
      content_type: 'product',
      content_name: isAr ? product.name.ar : product.name.en,
      value: price,
      currency: product.baseCurrency || 'SAR',
    });
  }, [product, isAr]);

  // ── Pricing ────────────────────────────────────────────────────────────────

  const getSizePrice = (index: number) => {
    const size = product.sizes[index];
    return getPrice(size.prices ?? [], size.price ?? 0, product.baseCurrency);
  };

  const activePrice = getSizePrice(selectedSize);

  // ── feedsUp ────────────────────────────────────────────────────────────────

  const feedsUp = product.sizes[selectedSize].feedsUp ?? 0;

  // ── Checkout URL ───────────────────────────────────────────────────────────

  const [ref, setRef] = useState<string | undefined>(undefined);
  useEffect(() => {
    setRef(getStoredReferral(null));
  }, []);
  const checkoutHref = `/checkout?prod=${product._id}&qty=${quantity}&size=${selectedSize}${ref ? `&ref=${ref}` : ''}`;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col gap-8 pb-20 max-w-2xl mx-auto"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Gallery */}
      <ProductImageGallery
        images={getProductImages(product)}
        alt={isAr ? product.name.ar : product.name.en}
        fallback={
          <span className="text-secondary">{tCommon('status.noImage')}</span>
        }
      />

      {/* Name + live price */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold leading-tight">
          {isAr ? product.name.ar : product.name.en}
        </h1>
        <div className="text-end">
          <span className="text-success font-bold text-xl md:text-2xl whitespace-nowrap block">
            {activePrice.amount.toLocaleString()} {activePrice.currency}
          </span>
          <p className="text-xs text-secondary mt-1">{t('taxIncluded')}</p>
        </div>
      </div>

      {/* Size selector */}
      {showSizeSelector && (
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-bold">{t('selectSize')}</h2>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((size, index) => (
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

      {/* Feeds up to N people */}
      {feedsUp > 0 && (
        <p className="text-sm text-secondary">
          {t.rich('feedsUp', {
            count: feedsUp,
            strong: (chunks) => (
              <span className="font-bold text-foreground">{chunks}</span>
            ),
          })}
        </p>
      )}

      {/* Product content */}
      {content && content !== '<p><br></p>' && (
        <div
          className="product-content"
          dangerouslySetInnerHTML={{ __html: content.replace(/&nbsp;/g, ' ') }}
        />
      )}

      {/* ── Action area ── */}

      {/* Out of stock */}
      {!product.inStock && (
        <div className="flex flex-col items-center gap-3 py-8 px-6 bg-error/5 border border-error/20 rounded-site text-center">
          <PackageX className="text-error" size={40} />
          <p className="text-error font-bold text-lg">{t('outOfStock')}</p>
          <p className="text-secondary text-sm">{t('outOfStockMessage')}</p>
        </div>
      )}

      {/* Payment area (only when in stock) */}
      {product.inStock && (
        <>
          {/* Quantity */}
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-bold">{t('quantity')}</h2>
            <div className="flex items-center justify-center gap-4">
              <Button
                type="button"
                size="custom"
                className="p-2"
                onClick={() => setQuantity(quantity + 1)}
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
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
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
            href={checkoutHref}
          >
            {t('payNow')}
          </Button>
        </>
      )}
    </div>
  );
}
