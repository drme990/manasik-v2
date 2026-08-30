'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Product } from '@/types/Product';
import { useCurrency } from '@/hooks/currency-hook';
import LandingProductsWithFilter from '@/components/landing/products-with-filter';
import Button from '@/components/ui/button';

interface LandingProductsClientProps {
  platform: string;
  locale: string;
}

function ProductCardSkeleton() {
  return (
    <div className="w-64 h-90 shrink-0 rounded-site border border-stroke bg-card-bg overflow-hidden">
      <div className="h-44 w-full bg-stroke/20 animate-pulse" />
      <div className="flex flex-col gap-6 p-4">
        <div className="space-y-2">
          <div className="h-4 w-3/4 rounded bg-stroke/20 animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-stroke/20 animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-6 w-24 rounded bg-primary/20 animate-pulse" />
          <div className="h-8 w-full rounded bg-primary/10 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function LandingProductsClient({
  platform,
  locale,
}: LandingProductsClientProps) {
  const t = useTranslations('landing.products');
  const tc = useTranslations('common');
  const { homeCountryCode, isLoading } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Only fetch products after the country code is fully resolved.
  // This ensures prices are correct from the very first render —
  // no flash of wrong prices followed by a correction.
  useEffect(() => {
    if (isLoading) return;
    if (!homeCountryCode) return;

    let cancelled = false;
    const params = new URLSearchParams({ platform });
    if (homeCountryCode) params.set('viewerCountryCode', homeCountryCode);

    fetch(`/api/products?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.success) {
          setProducts(data.data.products || []);
        }
      })
      .catch((e) => console.error('Error fetching products:', e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isLoading, homeCountryCode, platform]);

  // Show skeletons while the currency context is initializing or
  // products are being fetched.
  if (isLoading || loading) {
    return (
      <div className="relative">
        <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          <div className="flex gap-4 w-max">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-secondary text-base">
          {tc('messages.noProductsAvailable')}
        </p>
      </div>
    );
  }

  return (
    <>
      <LandingProductsWithFilter products={products} locale={locale} />
      <Button
        variant="primary"
        size="md"
        href="/products"
        className="w-fit mx-auto mt-6"
        data-ref-track-action="navigate_products"
        data-ref-track-button-label={t('buttons.viewAll')}
        data-ref-track-meta={JSON.stringify({
          source: 'landing_products',
        })}
      >
        {t('buttons.viewAll')}
      </Button>
    </>
  );
}
