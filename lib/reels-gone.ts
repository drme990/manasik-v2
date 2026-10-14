/**
 * Videos that are no longer on the server (the file was deleted but a product
 * or a reel still points at it) — the app's `components/reels/session.ts`.
 * The home row and the viewer leave these out, so the customer is never shown
 * a clip that can never play. The storage answers the website's origin with
 * CORS headers, so the question can be asked from the browser: one byte of
 * the file, never the video itself.
 */
import { useSyncExternalStore } from 'react';

type Verdict = 'there' | 'gone' | 'unknown';

const NONE: ReadonlySet<string> = new Set();
let gone: ReadonlySet<string> = NONE;
const listeners = new Set<() => void>();
const verdicts = new Map<string, Verdict>();
const asking = new Map<string, Promise<Verdict>>();
const CHECK_TIMEOUT_MS = 8000;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function markGone(url: string): void {
  if (gone.has(url)) return;
  gone = new Set([...gone, url]);
  for (const listener of [...listeners]) listener();
}

/** The addresses of videos the server has said it does not have. */
export function useReelsGone(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, () => gone, () => NONE);
}

export function isReelGone(url: string): boolean {
  return gone.has(url);
}

async function ask(url: string): Promise<Verdict> {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), CHECK_TIMEOUT_MS);
  try {
    // One byte is enough to hear whether the file exists; the video itself is not downloaded.
    const response = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' }, signal: controller?.signal, cache: 'no-store' });
    // Only "there is no such file" counts. Anything else (a busy server, a refusal) may pass.
    if (response.status === 404 || response.status === 410) return 'gone';
    return response.ok ? 'there' : 'unknown';
  } catch {
    // No connection, a timeout, or a server that does not let a page read its answer.
    return 'unknown';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Asks the server, once per address and visit, whether a video is still
 * there. A video that is gone joins the set. "Could not find out" is
 * forgotten, so the question can be asked again later.
 */
export function checkReelVideo(url: string): Promise<Verdict> {
  const known = verdicts.get(url);
  if (known) return Promise.resolve(known);
  const running = asking.get(url);
  if (running) return running;
  const request = ask(url).then((verdict) => {
    asking.delete(url);
    if (verdict !== 'unknown') verdicts.set(url, verdict);
    if (verdict === 'gone') markGone(url);
    return verdict;
  });
  asking.set(url, request);
  return request;
}

/** Asks about several videos, a few at a time, so the questions never crowd the connection. */
export function checkReelVideos(urls: readonly string[], atOnce: number = 3): void {
  const queue = urls.filter((url) => !verdicts.has(url) && !asking.has(url));
  const next = (): void => {
    const url = queue.shift();
    if (url) void checkReelVideo(url).then(next);
  };
  const lanes = Math.min(Math.max(1, atOnce), queue.length);
  for (let i = 0; i < lanes; i += 1) next();
}
