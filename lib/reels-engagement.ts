/**
 * The reels' likes and shares on the website — the same real numbers the app
 * shows (backend routes POST /api/reels/:key/like, POST /api/reels/:key/share,
 * GET /api/reels/stats; the app's `src/core/reels-engagement.ts` is the model).
 *
 * Nothing here invents a number. A count is shown only when the server says it
 * may be (`showCounts`, from the threshold the owner set in the dashboard);
 * below it the keys carry no number at all. An optimistic +1 / −1 moves a
 * number only when that number is already shown.
 *
 * Kept outside React: a reel's keys listen to their own reel only, so a like
 * re-renders one small component and never the pager.
 */
import { useEffect, useSyncExternalStore } from 'react';

/** The server lists this in `appearance.features` when it keeps likes and shares. */
export const REEL_ENGAGEMENT_FEATURE = 'reelEngagement';
/** The signed install id travels in this header. */
const INSTALL_HEADER = 'x-app-install-id';
/** Where this browser keeps the install id the server gave it (it belongs to the browser, not to an account). */
const INSTALL_KEY = 'manasik.reelInstall';
/** The customer's last choice is sent this long after he stops toggling. */
const LIKE_DEBOUNCE_MS = 400;
/** The counts are read again on opening the reels only when the last read is older than this (the server caches 30 s). */
const FRESH_MS = 30_000;

export interface ReelStat {
  likes: number;
  shares: number;
  showCounts: { likes: boolean; shares: boolean };
  /** This browser's own like. */
  liked: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

function isReelKey(value: unknown): value is string {
  return typeof value === 'string' && /^v1-[0-9a-f]{8}$/.test(value);
}

/** `i1.<22>.<22>`: made and signed by the server, never by the browser. Anything else is not stored. */
function isInstallId(value: unknown): value is string {
  return typeof value === 'string' && /^i1\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{22}$/.test(value);
}

/** One reel's numbers as the server sent them; null when they cannot be trusted. */
function cleanReelStat(raw: unknown): ReelStat | null {
  if (!isRecord(raw)) return null;
  const likes = count(raw.likes);
  const shares = count(raw.shares);
  if (likes === null || shares === null) return null;
  const show = isRecord(raw.showCounts) ? raw.showCounts : {};
  return { likes, shares, showCounts: { likes: show.likes === true, shares: show.shares === true }, liked: raw.liked === true };
}

function untouchedStat(): ReelStat {
  return { likes: 0, shares: 0, showCounts: { likes: false, shares: false }, liked: false };
}

/** The customer's choice laid over the server's truth: the number moves only when it is already shown. */
function optimisticLike(base: ReelStat, liked: boolean): ReelStat {
  if (base.liked === liked) return base;
  const likes = Math.max(0, base.likes + (liked ? 1 : -1));
  return { ...base, liked, likes: base.showCounts.likes ? likes : base.likes };
}

// ── The install id ──────────────────────────────────────────────────────────

let installId: string | null | undefined;

function readInstall(): string | null {
  if (installId !== undefined) return installId;
  try {
    const raw = window.localStorage.getItem(INSTALL_KEY);
    installId = isInstallId(raw) ? raw : null;
  } catch {
    installId = null;
  }
  return installId;
}

function keepInstall(id: string): void {
  if (!isInstallId(id) || id === installId) return;
  installId = id;
  try {
    window.localStorage.setItem(INSTALL_KEY, id);
  } catch {
    // Private mode or storage off: the id lives for this page only.
  }
}

function headers(): Record<string, string> {
  const id = readInstall();
  return id ? { Accept: 'application/json', [INSTALL_HEADER]: id } : { Accept: 'application/json' };
}

class EngagementOff extends Error {}

async function call(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(path, { ...init, headers: { ...headers(), ...(init?.headers as Record<string, string> | undefined) }, cache: 'no-store' });
  // The feature is switched off on the server: answered like a route that does not exist.
  if (res.status === 404) {
    const body = (await res.json().catch(() => null)) as { code?: unknown } | null;
    if (body?.code === 'NOT_FOUND') throw new EngagementOff();
  }
  if (!res.ok) throw new Error(`reels ${res.status}`);
  const json = (await res.json()) as { success?: unknown; data?: unknown };
  if (json?.success !== true) throw new Error('reels: bad answer');
  return json.data;
}

// ── The store ───────────────────────────────────────────────────────────────

let on = false;
/** The last truth from the server, per reel. */
const server = new Map<string, ReelStat>();
/** When a reel's truth last came from a like or a share (fresher than a cached read asked before it). */
const answeredAt = new Map<string, number>();
/** The like the customer chose and the server has not confirmed yet. */
const wanted = new Map<string, boolean>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const sending = new Set<string>();
const views = new Map<string, ReelStat>();
const listeners = new Map<string, Set<() => void>>();
const onListeners = new Set<() => void>();
/** Switched off for this visit by the server itself (it answered that the feature is not there). */
let refused = false;
let lastRead = 0;
let reading: Promise<void> | null = null;

function tell(key: string): void {
  views.delete(key);
  const set = listeners.get(key);
  if (set) for (const listener of [...set]) listener();
}

function tellAll(): void {
  views.clear();
  for (const set of [...listeners.values()]) for (const listener of [...set]) listener();
}

function stat(key: string): ReelStat {
  const kept = views.get(key);
  if (kept) return kept;
  const base = server.get(key) ?? untouchedStat();
  const want = wanted.get(key);
  const view = want === undefined ? base : optimisticLike(base, want);
  views.set(key, view);
  return view;
}

function forget(key: string): void {
  const timer = timers.get(key);
  if (timer !== undefined) clearTimeout(timer);
  timers.delete(key);
  wanted.delete(key);
}

function setOn(next: boolean): void {
  if (on === next) return;
  on = next;
  if (!on) for (const key of [...wanted.keys()]) forget(key);
  tellAll();
  for (const listener of [...onListeners]) listener();
}

function turnOff(): void {
  refused = true;
  setOn(false);
}

async function flush(key: string): Promise<void> {
  timers.delete(key);
  if (sending.has(key)) return; // asked again when the call in flight comes back
  const want = wanted.get(key);
  if (want === undefined) return;
  const confirmed = server.get(key)?.liked ?? false;
  if (want === confirmed) {
    wanted.delete(key);
    tell(key);
    return;
  }
  sending.add(key);
  try {
    const data = (await call(`/api/reels/${key}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ liked: want }),
    })) as { installId?: unknown } & Record<string, unknown>;
    const next = cleanReelStat(data);
    if (!next) throw new Error('reels: bad stat');
    server.set(key, next);
    answeredAt.set(key, Date.now());
    if (isInstallId(data.installId)) keepInstall(data.installId);
    sending.delete(key);
    const latest = wanted.get(key);
    if (latest === undefined || latest === next.liked) wanted.delete(key);
    else if (!timers.has(key)) timers.set(key, setTimeout(() => void flush(key), LIKE_DEBOUNCE_MS)); // changed his mind meanwhile
    tell(key);
  } catch (error) {
    sending.delete(key);
    // Back to what the server last said, quietly.
    forget(key);
    if (error instanceof EngagementOff) turnOff();
    else tell(key);
  }
}

function setLike(key: string, liked: boolean): void {
  if (!on || !isReelKey(key)) return;
  // Already showing it (a double tap on a reel already liked): nothing to change, nothing to send.
  if (stat(key).liked === liked) return;
  wanted.set(key, liked);
  const timer = timers.get(key);
  if (timer !== undefined) clearTimeout(timer);
  timers.set(key, setTimeout(() => void flush(key), LIKE_DEBOUNCE_MS));
  tell(key);
}

/** The owner's feature flag says the server keeps likes and shares: engagement is on unless the server refused. */
function setListed(listed: boolean): void {
  if (!listed || refused) return;
  readInstall();
  setOn(true);
}

/** Reads the counts (and this browser's likes) for these reels, unless that was done a moment ago. Never throws. */
export function refreshEngagement(keys: readonly string[]): Promise<void> {
  const wantedKeys = keys.filter(isReelKey).slice(0, 100);
  if (!on || reading || wantedKeys.length === 0 || Date.now() - lastRead < FRESH_MS) return reading ?? Promise.resolve();
  reading = (async () => {
    try {
      const askedAt = Date.now();
      const data = (await call(`/api/reels/stats?keys=${encodeURIComponent(wantedKeys.join(','))}`)) as { stats?: unknown };
      lastRead = Date.now();
      if (isRecord(data.stats)) {
        for (const [key, value] of Object.entries(data.stats)) {
          if (!isReelKey(key)) continue;
          const next = cleanReelStat(value);
          if (!next) continue;
          if ((answeredAt.get(key) ?? -Infinity) > askedAt) continue;
          server.set(key, next);
        }
        tellAll();
      }
    } catch (error) {
      if (error instanceof EngagementOff) turnOff();
      // Otherwise no numbers this time; the keys still work.
    } finally {
      reading = null;
    }
  })();
  return reading;
}

/** Tells the server the reel was shared (once the share sheet was used). Never throws. */
export async function reelShared(key: string): Promise<void> {
  if (!on || !isReelKey(key)) return;
  try {
    const data = (await call(`/api/reels/${key}/share`, { method: 'POST' })) as { counted?: unknown } & Record<string, unknown>;
    if (data.counted !== true) return;
    const next = cleanReelStat(data);
    if (!next) return;
    // The like may be on its way; the share answer carries the like the server had before it.
    const before = server.get(key);
    server.set(key, sending.has(key) && before ? { ...next, liked: before.liked, likes: before.likes, showCounts: { ...next.showCounts, likes: before.showCounts.likes } } : next);
    answeredAt.set(key, Date.now());
    tell(key);
  } catch (error) {
    if (error instanceof EngagementOff) turnOff();
  }
}

/** One reel's numbers right now (outside React). */
export function reelStat(key: string): ReelStat {
  return stat(key);
}

/** Told whenever one reel's numbers or this browser's like of it change. */
export function onReelStat(key: string, listener: () => void): () => void {
  return subscribe(key, listener);
}

function subscribe(key: string, listener: () => void): () => void {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(key);
  };
}

function subscribeOn(listener: () => void): () => void {
  onListeners.add(listener);
  return () => {
    onListeners.delete(listener);
  };
}

const isOn = () => on;

// ── "The customer just liked this": the heart pops only for his own like, never for a count that arrives ──

let poked: { key: string; at: number } | null = null;

/** A like the customer made himself (a tap on the heart or a double tap on the video). */
export function likeByCustomer(key: string, liked: boolean): void {
  if (liked) poked = { key, at: Date.now() };
  setLike(key, liked);
}

export function toggleLikeByCustomer(key: string): void {
  likeByCustomer(key, !stat(key).liked);
}

/** True for a moment after the customer liked this reel himself. */
export function justLiked(key: string): boolean {
  return poked !== null && poked.key === key && Date.now() - poked.at < 1200;
}

// ── React ───────────────────────────────────────────────────────────────────

/** Engagement is on only for a server that lists it, and stays off for the visit once the server said it is not there. */
export function useEngagementSetup(features: readonly string[] | null | undefined): void {
  const listed = Array.isArray(features) && features.includes(REEL_ENGAGEMENT_FEATURE);
  useEffect(() => setListed(listed), [listed]);
}

export function useEngagementOn(): boolean {
  return useSyncExternalStore(subscribeOn, isOn, () => false);
}

const OFF_STAT = untouchedStat();

/** One reel's numbers and this browser's like, as they should be shown right now. */
export function useReelStat(key: string): ReelStat {
  return useSyncExternalStore(
    (listener) => subscribe(key, listener),
    () => stat(key),
    () => OFF_STAT,
  );
}
