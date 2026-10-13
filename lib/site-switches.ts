/**
 * On/off switches the owner controls from the restore points page in the
 * dashboard (owner, 2026-10-12). Read on the server from the backend's
 * /api/site-switches. When the backend cannot be reached, every switch reads
 * as OFF: the site then behaves exactly as it did before the switched change.
 */
import type { Product } from '@/types/Product';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export type SiteSwitchKey =
  | 'hide-prices-in-page-code'
  | 'static-pages-from-dashboard'
  | 'share-experience'
  | 'experience-reels'
  | 'experience-prompt'
  | 'usd-price-in-search-data';

export async function getSiteSwitch(key: SiteSwitchKey): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/site-switches`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.success === true && data.data?.[key] === true;
  } catch {
    return false;
  }
}

/**
 * The product as the browser first receives it when prices stay out of the
 * page code: no price of any country, no base currency, no per-currency
 * minimum payments. The product page asks the backend for the prices once
 * the visitor's country is confirmed (product-details-client.tsx), with the
 * same checks as before. Everything else (names, sizes, availability, media,
 * add-on names) is unchanged.
 */
export function withoutPrices(product: Product): Product {
  return {
    ...product,
    baseCurrency: '',
    sizes: (product.sizes ?? []).map((size) => {
      const { resolvedPrices: _resolvedPrices, ...rest } = size;
      void _resolvedPrices;
      return rest;
    }),
    ...(product.addOns
      ? {
        addOns: product.addOns.map((addOn) => {
          const { resolvedPrices: _resolvedPrices, ...rest } = addOn;
          void _resolvedPrices;
          return rest;
        }),
      }
      : {}),
    ...(product.partialPayment
      ? { partialPayment: { ...product.partialPayment, minimumPayments: [] } }
      : {}),
  };
}
