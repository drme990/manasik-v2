/**
 * The order of the reels on each visit (owner, 2026-10-16).
 *
 * - First: one of the reels the dashboard marked «يتصدّر الريلز». They take turns from one visit to the next
 *   (a new visitor starts at a random one), so the opening reel keeps changing.
 * - Then the rest of the dashboard's reels, most liked and most viewed more likely to come early, but drawn by
 *   chance each visit (a weighted shuffle), so nobody gets the same order every time.
 * - The catalogue's own clips after them, as before.
 *
 * Decided once per page load and shared by every reels row of the page and the viewer, so they agree.
 */
import { reelKey, type Reel } from '@/lib/reels';

export interface OrderCounts {
  likes: number;
  views: number;
}

/** Where this browser keeps its turn among the leading reels. */
const TURN_KEY = 'manasik.reelLeadTurn';

/** The weight of a reel in the draw: grows with likes and views, slowly, so chance still plays (sqrt). */
export function reelWeight(counts: OrderCounts | undefined): number {
  const likes = counts?.likes ?? 0;
  const views = counts?.views ?? 0;
  return 1 + Math.sqrt(likes + views / 10);
}

/** This visit's turn among `count` leading reels: the next one after the last visit's, a random one the first time. */
export function leadTurn(count: number, random: () => number = Math.random): number {
  if (count <= 1) return 0;
  let turn = Math.floor(random() * count);
  try {
    const raw = window.localStorage.getItem(TURN_KEY);
    const last = raw === null ? NaN : Number(raw);
    if (Number.isInteger(last) && last >= 0) turn = (last + 1) % count;
    window.localStorage.setItem(TURN_KEY, String(turn));
  } catch {
    // Storage off (private mode): a random one each visit.
  }
  return turn;
}

export function orderReels(reels: readonly Reel[], counts: ReadonlyMap<string, OrderCounts>, turn: number, random: () => number = Math.random): Reel[] {
  const dashboard = reels.filter((reel) => reel.source === 'dashboard');
  const catalogue = reels.filter((reel) => reel.source !== 'dashboard');
  const leads = dashboard.filter((reel) => reel.lead);
  const first = leads.length > 0 ? leads[turn % leads.length] : null;
  // Weighted shuffle (Efraimidis–Spirakis): each reel draws -ln(u)/weight; the smallest comes first.
  const rest = dashboard
    .filter((reel) => reel !== first)
    .map((reel) => ({ reel, draw: -Math.log(1 - random()) / reelWeight(counts.get(reelKey(reel.video))) }))
    .sort((a, b) => a.draw - b.draw)
    .map((item) => item.reel);
  return [...(first ? [first] : []), ...rest, ...catalogue];
}
