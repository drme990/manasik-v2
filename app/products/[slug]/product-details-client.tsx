'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Minus, Plus, PackageX, Users } from 'lucide-react';
import { Product, getProductMediaUrls } from '@/types/Product';
import { usePriceInCurrency } from '@/hooks/currency-hook';
import Button from '@/components/ui/button';
import Modal from '@/components/ui/modal';
import ProductMediaGallery from '@/components/shared/product-media-gallery';
import AudioCommentsPlayer from '@/components/shared/audio-comments-player';
import { trackEvent } from '@/lib/fb-pixel';
import { getStoredReferral } from '@/components/providers/referral-provider';
import { useAppearance } from '@/components/providers/appearance-provider';

function getProductMedia(product: Product): string[] {
  return getProductMediaUrls(product);
}

export default function ProductDetailsClient({
  product,
}: {
  product: Product;
}) {
  const t = useTranslations('productDetails');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const getPrice = usePriceInCurrency();
  const { appearance } = useAppearance();

  const isAr = locale === 'ar';
  const showSizeSelector = product.sizes.length > 1;
  const content = isAr ? product.content?.ar : product.content?.en;

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<number>(0);
  const [isDocumentationModalOpen, setIsDocumentationModalOpen] =
    useState(false);
  const viewTracked = useRef(false);

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

  const getSizePrice = (index: number) => {
    const size = product.sizes[index];
    return getPrice(size.prices ?? [], size.price ?? 0, product.baseCurrency);
  };

  const activePrice = getSizePrice(selectedSize);
  const feedsUp = product.sizes[selectedSize].feedsUp ?? 0;

  const ref = getStoredReferral(null);
  const checkoutHref = `/checkout?prod=${product.slug}&qty=${quantity}&size=${selectedSize}${ref ? `&ref=${ref}` : ''}`;

  return (
    <div
      className="flex flex-col gap-8 pb-20 max-w-2xl mx-auto"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <ProductMediaGallery
        media={getProductMedia(product)}
        alt={isAr ? product.name.ar : product.name.en}
        fallback={
          <span className="text-secondary">{tCommon('status.noImage')}</span>
        }
      />

      <AudioCommentsPlayer audioReviews={appearance.audioReviews} />

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

      {showSizeSelector && (
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-bold">{t('selectSize')}</h2>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((size, index) => (
              <Button
                key={index}
                type="button"
                variant={selectedSize === index ? 'primary' : 'secondary'}
                onClick={() => setSelectedSize(index)}
              >
                {isAr ? size.name.ar : size.name.en}
              </Button>
            ))}
          </div>
        </div>
      )}

      {feedsUp > 0 && (
        <div className="flex items-center gap-2">
          <Users size={18} className="text-primary" />
          <p className="text-sm text-secondary">
            {t.rich('feedsUp', {
              count: feedsUp,
              strong: (chunks) => (
                <span className="font-bold text-foreground">{chunks}</span>
              ),
            })}
          </p>
        </div>
      )}

      {content && content !== '<p><br></p>' && (
        <div
          className="product-content"
          dangerouslySetInnerHTML={{ __html: content.replace(/&nbsp;/g, ' ') }}
        />
      )}

      {!product.inStock && (
        <div className="flex flex-col items-center gap-3 py-8 px-6 bg-error/5 border border-error/20 rounded-site text-center">
          <PackageX className="text-error" size={40} />
          <p className="text-error font-bold text-lg">{t('outOfStock')}</p>
          <p className="text-secondary text-sm">{t('outOfStockMessage')}</p>
        </div>
      )}

      {product.inStock && (
        <>
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

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            href={checkoutHref}
          >
            {t('payNow')}
          </Button>

          <button
            type="button"
            onClick={() => setIsDocumentationModalOpen(true)}
            className="w-full text-sm font-semibold text-success underline underline-offset-4 transition-colors hover:text-success/80"
          >
            {t('documentationQuestion')}
          </button>
        </>
      )}

      <Modal
        isOpen={isDocumentationModalOpen}
        onClose={() => setIsDocumentationModalOpen(false)}
        title={t('documentationQuestion')}
        size="md"
      >
        <p className="text-sm leading-7 text-foreground whitespace-pre-line">
          {t('documentationAnswer')}
        </p>
      </Modal>
    </div>
  );
}
