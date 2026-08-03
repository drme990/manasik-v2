/**
 * Client-side utility for fetching and caching the default WhatsApp phone
 * numbers from the backend.
 *
 * The backend exposes `GET /api/settings/default-phones` which returns
 * `{ manasik, ghadaq }`. This module caches the result in memory and in
 * localStorage (with a TTL) so repeated calls don't hit the network.
 *
 * There are NO hardcoded fallback numbers — if the backend has no setting
 * and the fetch fails, the phone is `null` and callers should hide the
 * WhatsApp button.
 */

const CACHE_KEY = 'default-phones';
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

export type AppKey = 'manasik' | 'ghadaq';

interface DefaultPhones {
  manasik: string;
  ghadaq: string;
}

let inMemoryCache: DefaultPhones | null = null;
let fetchPromise: Promise<DefaultPhones | null> | null = null;

function readLocalStorageCache(): DefaultPhones | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      value: DefaultPhones;
      expiresAt: number;
    };
    if (Date.now() > parsed.expiresAt) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

function writeLocalStorageCache(value: DefaultPhones): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ value, expiresAt: Date.now() + CACHE_TTL_MS }),
    );
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Fetch the default phones from the backend. Caches the result in memory
 * and localStorage. Concurrent calls share a single network request.
 * Returns `null` if the fetch fails or the backend has no setting.
 */
export async function fetchDefaultPhones(): Promise<DefaultPhones | null> {
  if (inMemoryCache) return inMemoryCache;

  const local = readLocalStorageCache();
  if (local) {
    inMemoryCache = local;
    return local;
  }

  if (!fetchPromise) {
    fetchPromise = (async () => {
      try {
        const response = await fetch('/api/settings/default-phones', {
          cache: 'no-store',
        });
        if (!response.ok) return null;
        const payload = await response.json();
        if (!payload?.data?.manasik || !payload?.data?.ghadaq) return null;
        const value: DefaultPhones = {
          manasik: payload.data.manasik,
          ghadaq: payload.data.ghadaq,
        };
        inMemoryCache = value;
        writeLocalStorageCache(value);
        return value;
      } catch {
        return null;
      } finally {
        fetchPromise = null;
      }
    })();
  }

  return fetchPromise;
}

/**
 * Synchronously return the cached default phone for an app, or `null`
 * if nothing is cached yet. Use this only for immediate rendering — pair
 * with `fetchDefaultPhones()` to populate the cache for the next render.
 */
export function getCachedDefaultPhone(app: AppKey): string | null {
  if (inMemoryCache) return inMemoryCache[app];
  const local = readLocalStorageCache();
  if (local) {
    inMemoryCache = local;
    return local[app];
  }
  return null;
}
