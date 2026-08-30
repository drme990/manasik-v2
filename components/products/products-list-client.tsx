'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Product } from '@/types/Product';
import { useCurrency } from '@/hooks/currency-hook';
import ProductsWithLabelFilter from '@/components/products/products-with-label-filter';
import CalcAqeqa from '@/components/landing/calc-aqeqa';

interface ProductsListClientProps {
  platform: string;
  locale: string;
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-site border border-stroke bg-card-bg overflow-hidden"
        >
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
      ))}
    </div>
  );
}

export default function ProductsListClient({
  platform,
  locale,
}: ProductsListClientProps) {
  const t = useTranslations('products');
  const { homeCountryCode, isLoading } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Only fetch products after the country code is fully resolved
  // to ensure correct prices from the very first render.
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

  const productsWithSlug = products.filter((product) => product.slug);

  if (isLoading || loading) {
    return (
      <>
        <ProductGridSkeleton />
        <CalcAqeqa />
      </>
    );
  }

  if (productsWithSlug.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-secondary text-lg mb-2">{t('noProducts')}</p>
          <p className="text-secondary/70 text-sm">{t('comingSoon')}</p>
        </div>
        <CalcAqeqa />
      </>
    );
  }

  return (
    <>
      <ProductsWithLabelFilter products={productsWithSlug} locale={locale} />
      <CalcAqeqa />
    </>
  );
}
