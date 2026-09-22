/**
 * Shared client-side session fetcher.
 *
 * Multiple components need the session user (header, currency provider,
 * referral provider, ref tracker, blocked-account notice, checkout).
 * Each used to fire its own `/api/auth/{app}/session` request on mount —
 * 4+ identical requests per page load. This module dedupes them: all
 * callers share one in-flight promise, so the endpoint is hit at most
 * once per load.
 *
 * Guests never trigger a request — `hasClientAuthCookie()` is checked
 * first.
 */

import { hasClientAuthCookie } from '@/lib/client-auth-cookie';

export interface SessionUser {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  country?: string;
  detectedCountry?: string;
  ref?: string;
  isBanned?: boolean;
  [key: string]: unknown;
}

export interface SessionResult {
  /**
   * HTTP status from the endpoint.
   *   0  — network/parse error (request was sent, no usable response)
   *   -1 — skipped (no auth cookie — no request was made)
   */
  status: number;
  user: SessionUser | null;
}

const NO_COOKIE: SessionResult = { status: -1, user: null };

let inflight: Promise<SessionResult> | null = null;

function fetchSession(): Promise<SessionResult> {
  return fetch('/api/auth/manasik/session', { cache: 'no-store' })
    .then(async (res): Promise<SessionResult> => {
      if (!res.ok) return { status: res.status, user: null };
      const payload = (await res.json().catch(() => null)) as {
        data?: SessionUser;
      } | null;
      return { status: res.status, user: payload?.data ?? null };
    })
    .catch((): SessionResult => ({ status: 0, user: null }));
}

/**
 * Returns the current session user, deduped across all callers.
 * - No auth cookie → resolves `{ status: -1, user: null }` immediately,
 *   no request is made.
 * - Concurrent callers share the same in-flight request.
 */
export function getSession(): Promise<SessionResult> {
  if (!hasClientAuthCookie()) return Promise.resolve(NO_COOKIE);
  inflight ??= fetchSession().finally(() => {
    inflight = null;
  });
  return inflight;
}
