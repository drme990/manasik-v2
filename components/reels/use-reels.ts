'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useAppearance } from '@/components/providers/appearance-provider';
import { useCurrency } from '@/hooks/currency-hook';
import { fetchProducts } from '@/lib/fetch-products';
import { reelKey, reelsFor, type Reel, type ReelReview } from '@/lib/reels';
import { leadTurn, orderReels, type OrderCounts } from '@/lib/reels-order';
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
  /** The customers' video experiences by video address: the reviewer's details and the transcript of a review reel. */
  const [reviews, setReviews] = useState<ReadonlyMap<string, ReelReview>>(() => new Map());

  useEffect(() => {
    let cancelled = false;
    fetch('/api/experiences/videos?platform=manasik&all=1&type=video', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json: { success?: boolean; data?: Array<{ name?: string; avatarUrl?: string; rating?: number; country?: string; date?: string; video?: string; transcript?: string; productSlugs?: unknown }> }) => {
        if (cancelled || !json?.success || !Array.isArray(json.data)) return;
        const map = new Map<string, ReelReview>();
        for (const e of json.data) {
          if (!e?.video || !e.name) continue;
          map.set(e.video.trim(), { name: e.name, avatarUrl: e.avatarUrl || undefined, rating: e.rating, country: e.country || undefined, date: e.date, transcript: e.transcript?.trim() || undefined, productSlugs: Array.isArray(e.productSlugs) ? e.productSlugs.filter((slug): slug is string => typeof slug === 'string' && slug.length > 0) : undefined });
        }
        setReviews(map);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

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
    return reelsFor({ reels: appearance.reels, products, locale: locale === 'ar' ? 'ar' : 'en', reviews });
  }, [appearance.reels, products, locale, reviews]);
  // Without the reels whose video the server no longer has (a deleted file a product still points at).
  const present = useMemo(() => (gone.size === 0 ? all : all.filter((reel) => !gone.has(reel.video))), [all, gone]);

  // This visit's order (lib/reels-order.ts): the likes and views are read once, then the order is drawn once per page.
  const counts = useOrderCounts(all);
  const reels = useMemo(() => (counts === null ? [] : visitOrder(present, counts)), [present, counts]);

  const productsById = useMemo(() => new Map((products ?? []).map((product) => [product._id, product])), [products]);

  return useMemo(() => ({ reels, productsById, loading: products === null || counts === null }), [reels, productsById, products, counts]);
}

/** How long the reels wait for the likes and views before they show in the plain draw. */
const COUNTS_WAIT_MS = 1500;

let countsRead: Promise<Map<string, OrderCounts>> | null = null;

/** The dashboard reels' likes and views, read once per page (the public stats route); empty when it is not there. */
function readCounts(keys: string[]): Promise<Map<string, OrderCounts>> {
  if (!countsRead) {
    const ask = fetch(`/api/reels/stats?keys=${encodeURIComponent(keys.slice(0, 100).join(','))}`, { headers: { Accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { success?: boolean; data?: { stats?: Record<string, { likes?: unknown; views?: unknown }> } } | null) => {
        const map = new Map<string, OrderCounts>();
        for (const [key, value] of Object.entries(json?.success ? (json.data?.stats ?? {}) : {})) {
          const likes = typeof value?.likes === 'number' ? value.likes : 0;
          const views = typeof value?.views === 'number' ? value.views : 0;
          map.set(key, { likes, views });
        }
        return map;
      })
      .catch(() => new Map<string, OrderCounts>());
    const wait = new Promise<Map<string, OrderCounts>>((resolve) => setTimeout(() => resolve(new Map()), COUNTS_WAIT_MS));
    countsRead = Promise.race([ask, wait]);
  }
  return countsRead;
}

function useOrderCounts(all: readonly Reel[]): ReadonlyMap<string, OrderCounts> | null {
  const [counts, setCounts] = useState<ReadonlyMap<string, OrderCounts> | null>(null);
  const keys = useMemo(() => all.filter((reel) => reel.source === 'dashboard').map((reel) => reelKey(reel.video)), [all]);
  const ready = all.length > 0;
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void readCounts(keys).then((map) => {
      if (!cancelled) setCounts(map);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, keys]);
  return counts;
}

/** The order drawn for this page: every reels row and the viewer get the same one. */
let drawn: { turn: number; rank: Map<string, number> } | null = null;

function visitOrder(reels: readonly Reel[], counts: ReadonlyMap<string, OrderCounts>): Reel[] {
  if (!drawn) {
    const leads = reels.filter((reel) => reel.lead).length;
    const turn = leadTurn(leads);
    const ordered = orderReels(reels, counts, turn);
    drawn = { turn, rank: new Map(ordered.map((reel, index) => [reel.id, index])) };
  }
  const rank = drawn.rank;
  // A reel the first draw did not know (a later answer) goes after the known ones, in its own place.
  return [...reels].sort((a, b) => (rank.get(a.id) ?? 1e6 + reels.indexOf(a)) - (rank.get(b.id) ?? 1e6 + reels.indexOf(b)));
}
