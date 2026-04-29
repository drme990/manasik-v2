'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Product, getPrimaryProductImageUrl } from '@/types/Product';
import ProductPrice from '@/components/shared/product-price';
import Button from '@/components/ui/button';
import { Users } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  locale: string;
  variant?: 'carousel' | 'grid';
  revealDelayMs?: number;
}

export default function ProductCard({
  product,
  locale,
  variant = 'grid',
  revealDelayMs = 0,
}: ProductCardProps) {
  const t = useTranslations('products');
  const productName = locale === 'ar' ? product.name.ar : product.name.en;

  const showSizeSelector = product.sizes.length > 1;

  const cheapestSize = product.sizes.reduce((best, size) =>
    (size.price ?? 0) <= (best.price ?? 0) ? size : best,
  );

  const displayPrice = cheapestSize.price ?? 0;
  const displayPrices = cheapestSize.prices ?? [];
  const feedsUp = cheapestSize.feedsUp ?? 0;

  const productPath = product.slug || product._id;

  const isCarousel = variant === 'carousel';
  const isOutOfStock = !product.inStock;
  const isBestSeller = Boolean(product.isBestSeller);
  const productImage = getPrimaryProductImageUrl(product);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      style={{ transitionDelay: `${revealDelayMs}ms` }}
      className={[
        'transition-all duration-600 ease-out',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
      ].join(' ')}
    >
      <Link href={`/products/${productPath}`}>
        <div
          className={[
            'group flex flex-col overflow-hidden rounded-site border border-stroke bg-card-bg transition-all duration-300',
            isCarousel
              ? 'w-64 h-90 shrink-0 snap-normal hover:border-success/25 hover:shadow-[0_12px_28px_rgba(0,0,0,0.06)]'
              : 'h-full hover:-translate-y-1 hover:border-success/35 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)]',
          ].join(' ')}
        >
          {/* Image */}
          {productImage ? (
            <div className="relative h-44 w-full overflow-hidden">
              <Image
                src={productImage}
                alt={productName}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="256px"
                unoptimized
              />

              {isBestSeller && (
                <span className="absolute top-3 start-3 rounded-full bg-success px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  {t('bestSeller')}
                </span>
              )}

              {isOutOfStock && (
                <span className="absolute top-3 end-3 rounded-full bg-error px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  {t('outOfStock')}
                </span>
              )}
            </div>
          ) : (
            <div className="flex h-40 w-full items-center justify-center bg-stroke/10">
              <span className="text-sm text-secondary">{t('noImage')}</span>
            </div>
          )}

          {/* Content */}
          <div className="flex flex-1 flex-col justify-between gap-6 p-4">
            {/* Title + Feeds */}
            <div className="space-y-2">
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                {productName}
              </h3>

              {feedsUp > 0 && (
                <p className="flex items-center gap-1.5 text-xs text-secondary">
                  <Users size={14} className="shrink-0 text-primary" />
                  <span>{t('feedsUp', { count: feedsUp })}</span>
                </p>
              )}
            </div>

            {/* Price + Button */}
            <div className="space-y-2">
              <div>
                <ProductPrice
                  prices={displayPrices}
                  defaultPrice={displayPrice}
                  defaultCurrency={product.baseCurrency}
                  prefix={showSizeSelector ? t('startsFrom') : undefined}
                />
                <p className="mt-1 text-xs text-secondary">
                  {t('taxIncluded')}
                </p>
              </div>

              <Button variant="primary" size="sm" className="w-full">
                {t('orderNow')}
              </Button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
