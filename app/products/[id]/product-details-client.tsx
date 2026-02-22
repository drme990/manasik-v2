'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Minus, Plus, Loader2, PackageX } from 'lucide-react';
import { Product } from '@/types/Product';
import { usePriceInCurrency } from '@/hooks/currency-hook';
import Button from '@/components/ui/button';
import ProductImageGallery from '@/components/shared/product-image-gallery';

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentMethod = 'paymob' | 'easykash';

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('paymob');
  const [paymentLoading, setPaymentLoading] = useState(true);

  // Fetch active payment method on mount
  useEffect(() => {
    fetch('/api/payment-method')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setPaymentMethod(data.data.paymentMethod);
      })
      .catch(() => {
        /* keep default: paymob */
      })
      .finally(() => setPaymentLoading(false));
  }, []);

  // ── Pricing ────────────────────────────────────────────────────────────────

  const getSizePrice = (index: number) => {
    const size = product.sizes[index];
    return getPrice(size.prices ?? [], size.price ?? 0, product.baseCurrency);
  };

  const activePrice = getSizePrice(selectedSize);

  // ── feedsUp ────────────────────────────────────────────────────────────────

  const feedsUp = product.sizes[selectedSize].feedsUp ?? 0;

  // ── Easy Kash links ────────────────────────────────────────────────────────

  const easykashLinks = product.sizes[selectedSize].easykashLinks;

  // ── Checkout URL (Paymob) ──────────────────────────────────────────────────

  const checkoutHref = `/checkout?product=${product._id}&qty=${quantity}&size=${selectedSize}`;

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
        <span className="text-success font-bold text-xl md:text-2xl whitespace-nowrap">
          {activePrice.amount.toLocaleString()} {activePrice.currency}
        </span>
      </div>

      {/* Size selector — shown early so the price above updates before the user reads content */}
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
      {product.inStock &&
        (paymentLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="animate-spin text-success" size={24} />
          </div>
        ) : paymentMethod === 'paymob' ? (
          <PaymobActions
            t={t}
            quantity={quantity}
            onQuantityChange={setQuantity}
            checkoutHref={checkoutHref}
            disabled={false}
          />
        ) : (
          <EasykashActions t={t} links={easykashLinks} sizeRequired={false} />
        ))}
    </div>
  );
}

// ─── Paymob sub-section ───────────────────────────────────────────────────────

function PaymobActions({
  t,
  quantity,
  onQuantityChange,
  checkoutHref,
  disabled,
}: {
  t: ReturnType<typeof useTranslations>;
  quantity: number;
  onQuantityChange: (q: number) => void;
  checkoutHref: string;
  disabled: boolean;
}) {
  return (
    <>
      {/* Quantity */}
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-bold">{t('quantity')}</h2>
        <div className="flex items-center justify-center gap-4">
          <Button
            type="button"
            size="custom"
            className="p-2"
            onClick={() => onQuantityChange(quantity + 1)}
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
            onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
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
        disabled={disabled}
      >
        {t('payNow')}
      </Button>
    </>
  );
}

// ─── Easy Kash sub-section ────────────────────────────────────────────────────

function EasykashActions({
  t,
  links,
  sizeRequired,
}: {
  t: ReturnType<typeof useTranslations>;
  links:
    | { fullPayment?: string; halfPayment?: string; customPayment?: string }
    | null
    | undefined;
  sizeRequired: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-bold">{t('choosePayment')}</h2>

      {sizeRequired ? (
        <p className="text-sm text-error">{t('selectSizeFirst')}</p>
      ) : links ? (
        <div className="flex flex-col gap-2">
          {links.fullPayment && (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              href={links.fullPayment}
              target="_blank"
            >
              {t('fullPayment')}
            </Button>
          )}
          {links.halfPayment && (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              href={links.halfPayment}
              target="_blank"
            >
              {t('halfPayment')}
            </Button>
          )}
          {links.customPayment && (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              href={links.customPayment}
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
  );
}
