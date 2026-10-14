'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useAppearance } from '@/components/providers/appearance-provider';
import { useCurrency } from '@/hooks/currency-hook';
import { fetchProducts } from '@/lib/fetch-products';
import { reelsFor, type Reel } from '@/lib/reels';
import { useReelsGone } from '@/lib/reels-gone';
import type { Product } from '@/types/Product';

export interface ReelsData {
  /** The reels in their order — minus those whose video the server no longer has — for the home row, the product page and the viewer. */
  reels: Reel[];
  /** The catalogue's products by id, for the product card of a reel and the categories. */
  productsById: Map<string, Product>;
  /** The catalogue has not answered yet (the reels wait for it: a reel's product name and price come from it). */
  loading: boolean;
}

/**
 * The reels for this site, the way the app builds its own (lib/reels.ts): the
 * dashboard's list (the reviews) first, then the videos of the catalogue.
 * The catalogue is asked for once the visitor's country is known — the same
 * request the products row makes, shared through `fetchProducts`.
 */
export function useReels(): ReelsData {
  const locale = useLocale();
  const { appearance } = useAppearance();
  const { homeCountryCode, isLoading } = useCurrency();
  const gone = useReelsGone();
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    if (isLoading || !homeCountryCode) return;
    let cancelled = false;
    fetchProducts({ platform: 'manasik', viewerCountryCode: homeCountryCode })
      .then((list) => {
        if (!cancelled) setProducts(list);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoading, homeCountryCode]);

  const all = useMemo(() => {
    if (!products) return [];
    // The dashboard's own list as the owner arranged it, then the catalogue's videos (one per clip).
    return reelsFor({ reels: appearance.reels, products, locale: locale === 'ar' ? 'ar' : 'en' });
  }, [appearance.reels, products, locale]);
  // Without the reels whose video the server no longer has (a deleted file a product still points at).
  const reels = useMemo(() => (gone.size === 0 ? all : all.filter((reel) => !gone.has(reel.video))), [all, gone]);

  const productsById = useMemo(() => new Map((products ?? []).map((product) => [product._id, product])), [products]);

  return useMemo(() => ({ reels, productsById, loading: products === null }), [reels, productsById, products]);
}
