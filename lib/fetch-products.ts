/**
 * Shared /api/products fetcher with in-memory dedupe + short TTL.
 *
 * Products list, landing grid, and calc pages all request the same
 * platform+viewerCountryCode combination. Navigating between pages used
 * to fire a fresh request every mount; now concurrent callers share one
 * in-flight request and repeat calls within 60s reuse the result.
 */

import type { Product } from '@/types/Product';

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; products: Product[] }>();
const inflight = new Map<string, Promise<Product[]>>();

export function fetchProducts(
  params: Record<string, string>,
): Promise<Product[]> {
  const key = new URLSearchParams(params).toString();

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return Promise.resolve(hit.products);
  }

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = fetch(`/api/products?${key}`)
    .then((res) => res.json())
    .then((data): Product[] =>
      data?.success ? (data.data?.products ?? []) : [],
    )
    .then((products) => {
      cache.set(key, { at: Date.now(), products });
      return products;
    })
    .catch(() => [] as Product[])
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}
