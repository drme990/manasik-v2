/**
 * Reels on the website: the same short full-screen videos the mobile app shows
 * (manasik-app `src/core/reels.ts`, `src/core/products.ts`), with the same rules,
 * so the two look alike (owner, 2026-10-14).
 *
 * Where they come from (owner, 2026-10-14 evening): the dashboard's list first
 * (`appearance.reels`: the reels the owner arranged, the customer videos marked
 * «featured» included — «المراجعات»), then the videos the catalogue already
 * holds, one reel per product video, in-stock products first, as later items.
 * Both read live from the API: a video added to a product or a review featured
 * in the dashboard shows up on the next load.
 *
 * Nothing here reads the network: it takes the appearance and the products the
 * page already has.
 */
import type { Reel as DashboardReel } from '@/types/Appearance';
import type { Product } from '@/types/Product';
import { normalizeProductMedia } from '@/types/Product';

export interface Reel {
  /** Unique within the list; safe as a list key. */
  id: string;
  video: string;
  poster: string | null;
  /** In the current language; may be empty. */
  caption: string;
  /** The product to book from this reel, as the dashboard set it. */
  productId: string | null;
  /** Set only when that product is in the catalogue given — "book" is shown only then. */
  productSlug: string | null;
  productName: string | null;
  /** The dashboard's own list («المراجعات»), or a video of the catalogue. */
  source: 'dashboard' | 'catalogue';
  /** The customer behind a review reel, as the reviews page shows him (name, photo, stars, flag, month, transcript). */
  review?: ReelReview;
  /** Marked «يتصدّر الريلز» in the dashboard: one of these opens the reels (owner, 2026-10-16). */
  lead: boolean;
  /**
   * A review reel's other products (the customer's order had several): «احجز الآن» then offers each (owner,
   * 2026-10-16). The first product is productSlug/productName.
   */
  moreProducts?: { slug: string; name: string }[];
}

/** A customer's video experience, matched to its reel by the video's address. */
export interface ReelReview {
  name: string;
  avatarUrl?: string;
  rating?: number;
  country?: string;
  date?: string;
  /** What the customer says, word for word, once the owner approved the transcript. */
  transcript?: string;
  /** The products of the customer's paid orders, for «احجز الآن» on his reel. */
  productSlugs?: string[];
}

/** The id of the reviews category in the viewer's chips: the dashboard's reels. */
export const REVIEWS_CATEGORY = 'reviews';

export type Locale = 'ar' | 'en';

/** Most reels built from the catalogue. The dashboard's own list is not cut. */
export const MAX_CATALOGUE_REELS = 40;

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|qt)(\?.*)?$/i.test(url) || url.includes('/videos/');
}

/** A product's media as the app reads it: pictures and videos, in the dashboard's order. */
export function mediaOf(product: Pick<Product, 'media'>): { url: string; isVideo: boolean }[] {
  return normalizeProductMedia(product.media).map((item) => ({ url: item.url, isVideo: isVideoUrl(item.url) }));
}

/** The product's first picture (never a video), or null. */
export function primaryImage(product: Pick<Product, 'media'>): string | null {
  return mediaOf(product).find((item) => !item.isVideo)?.url ?? null;
}

/** A product the customer can book: in stock, with at least one size on sale. */
export function isPurchasable(product: Product): boolean {
  return Boolean(product.inStock) && (product.sizes ?? []).some((size) => size.isAvailable !== false);
}

export function productName(product: Pick<Product, 'name'>, locale: Locale): string {
  return product.name?.[locale] || product.name?.ar || product.name?.en || '';
}

function uniqueId(wanted: string, seen: Set<string>): string {
  let id = wanted;
  for (let n = 2; seen.has(id); n += 1) id = `${wanted}-${n}`;
  seen.add(id);
  return id;
}

/** The dashboard's reels for this site, in the dashboard's order. `total` counts the usable reels. */
function fromDashboard(list: readonly DashboardReel[], products: readonly Product[], locale: Locale, reviews: ReadonlyMap<string, ReelReview>): { reels: Reel[]; total: number } {
  const byId = new Map(products.map((product) => [product._id, product]));
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const seen = new Set<string>();
  const reels: Reel[] = [];
  let total = 0;

  list.forEach((raw, index) => {
    // The public route already returns only this project's reels; one written for the other brand is still not ours.
    if (raw.platform !== 'shared' && raw.platform !== 'manasik') return;
    total += 1;
    const caption = raw.caption[locale] || raw.caption[locale === 'ar' ? 'en' : 'ar'] || '';
    const review = reviews.get(raw.video.trim());
    // The product the dashboard set; for a customer's reel without one, the products he ordered (owner, 2026-10-16).
    const ordered = raw.productId ? [] : (review?.productSlugs ?? []).map((slug) => bySlug.get(slug)).filter((p): p is Product => Boolean(p));
    const product = raw.productId ? byId.get(raw.productId) : ordered[0];
    const more = ordered.slice(1).map((p) => ({ slug: p.slug, name: productName(p, locale) })).filter((p) => p.slug && p.name);
    reels.push({
      id: uniqueId(raw.id || `reel-${index + 1}`, seen),
      video: raw.video,
      poster: raw.poster,
      caption,
      productId: raw.productId ?? product?._id ?? null,
      productSlug: product?.slug || null,
      productName: product ? productName(product, locale) || null : null,
      source: 'dashboard',
      lead: raw.lead === true,
      ...(review ? { review } : {}),
      ...(more.length ? { moreProducts: more } : {}),
    });
  });

  return { reels, total };
}

/** One reel per product video: in-stock products first, catalogue order inside each group. */
function fromCatalogue(products: readonly Product[], locale: Locale): Reel[] {
  const ordered = [...products.filter(isPurchasable), ...products.filter((product) => !isPurchasable(product))];
  const seenVideos = new Set<string>();
  const seenIds = new Set<string>();
  const reels: Reel[] = [];

  for (const product of ordered) {
    if (!product.slug) continue;
    const media = mediaOf(product);
    const poster = media.find((item) => !item.isVideo)?.url ?? null;
    const name = productName(product, locale);
    let position = 0;

    for (const item of media) {
      if (!item.isVideo) continue;
      position += 1;
      if (seenVideos.has(item.url)) continue;
      seenVideos.add(item.url);
      reels.push({
        id: uniqueId(`${product._id}-${position}`, seenIds),
        video: item.url,
        poster,
        caption: name,
        productId: product._id,
        productSlug: product.slug,
        productName: name || null,
        source: 'catalogue',
        lead: false,
      });
      if (reels.length >= MAX_CATALOGUE_REELS) return reels;
    }
  }
  return reels;
}

/**
 * The reels to show on this site: the dashboard's list first (the reviews), then
 * the catalogue's videos after them — a clip the dashboard already shows is not
 * shown again from the catalogue (owner, 2026-10-14).
 */
export function reelsFor(input: { reels: readonly DashboardReel[] | null | undefined; products: readonly Product[] | null | undefined; locale: Locale; reviews?: ReadonlyMap<string, ReelReview> }): Reel[] {
  const products = Array.isArray(input.products) ? input.products : [];
  const dashboard = fromDashboard(Array.isArray(input.reels) ? input.reels : [], products, locale(input.locale), input.reviews ?? new Map());
  const shown = new Set(dashboard.reels.map((reel) => reel.video));
  const ids = new Set(dashboard.reels.map((reel) => reel.id));
  const catalogue = withoutRepeats(fromCatalogue(products, locale(input.locale)))
    .filter((reel) => !shown.has(reel.video))
    .map((reel) => (ids.has(reel.id) ? { ...reel, id: `catalogue-${reel.id}` } : reel));
  return [...dashboard.reels, ...catalogue];
}

function locale(value: string): Locale {
  return value === 'ar' ? 'ar' : 'en';
}

/**
 * Reels built from the catalogue lose the clips that several products share
 * (the same file under two products would otherwise play twice in a row).
 */
export function withoutRepeats(reels: readonly Reel[]): Reel[] {
  const seen = new Set<string>();
  return reels.filter((reel) => {
    if (seen.has(reel.video)) return false;
    seen.add(reel.video);
    return true;
  });
}

/**
 * True when a reel's poster is simply its product's photo (reels built from
 * the catalogue) rather than a frame of the video: such a poster is shown as a
 * soft backdrop, so the video does not seem to "change picture" when it starts.
 */
export function posterIsProductPhoto(reel: Reel, product: Product | null | undefined): boolean {
  return Boolean(reel.poster && product && primaryImage(product) === reel.poster);
}

// ── Categories (the app's own: merged and ordered as the owner set, 2026-10-09) ──

export interface ProductCategory {
  id: string;
  /** Name without its leading emoji. */
  name: string;
  /** The emoji the dashboard put in front of the name, or '' when there is none. */
  emoji: string;
  count: number;
}

/** A letter or digit in any of the scripts the dashboard writes in. */
const HAS_TEXT = /[A-Za-z0-9À-ɏ؀-ۿݐ-ݿ]/;

/** "🐏 خراف" → { emoji: "🐏", name: "خراف" }. The first word counts as the emoji when it holds no letter or digit. */
export function splitCategoryName(raw: string): { emoji: string; name: string } {
  const text = raw.trim();
  const space = text.search(/\s/);
  if (space <= 0) return { emoji: '', name: text };
  const first = text.slice(0, space);
  const name = text.slice(space).trim();
  return !HAS_TEXT.test(first) && name ? { emoji: first, name } : { emoji: '', name: text };
}

/** A category name as compared here: no emoji, no diacritics or tatweel, alef forms folded. */
function plainName(name: string): string {
  return name
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[\u0622\u0623\u0625]/g, '\u0627')
    .replace(/\s+/g, ' ')
    .trim();
}

/** «وصلة» (water connections) is shown inside «سقيا وآبار». */
const MERGED_INTO: ReadonlyArray<readonly [RegExp, RegExp]> = [[/^وصل/, /سقيا/]];
/** Umrah, water and wells, sheep, goats, calves, pregnant ewes — then the rest as the catalogue lists them. */
const CATEGORY_ORDER: readonly RegExp[] = [/^عمر/, /سقيا/, /^خراف/, /^ماعز/, /^عجول/, /^شاه/];

type Categorized = Pick<Product, '_id'> & { categoryId?: string | null; categoryName?: string | null };

/** Category id → the id it is shown under (only for merged categories). */
function mergedCategories(products: readonly Categorized[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const p of products) {
    const id = p.categoryId?.trim();
    const raw = p.categoryName?.trim();
    if (id && raw && !names.has(id)) names.set(id, plainName(splitCategoryName(raw).name));
  }
  const merged = new Map<string, string>();
  for (const [from, into] of MERGED_INTO) {
    const target = [...names].find(([, name]) => into.test(name))?.[0];
    if (!target) continue;
    for (const [id, name] of names) if (id !== target && from.test(name)) merged.set(id, target);
  }
  return merged;
}

function shownCategory(p: Categorized, merged: Map<string, string>): string | null {
  const id = p.categoryId?.trim();
  if (!id) return null;
  return merged.get(id) ?? id;
}

/** The dashboard categories that have products here, merged and ordered as the owner set. */
export function categoriesOf(products: readonly Categorized[]): ProductCategory[] {
  const merged = mergedCategories(products);
  const byId = new Map<string, ProductCategory>();
  for (const p of products) {
    const id = p.categoryId?.trim();
    const raw = p.categoryName?.trim();
    if (!id || !raw) continue;
    const shown = merged.get(id) ?? id;
    const existing = byId.get(shown);
    if (existing) {
      existing.count += 1;
      // A merged category seen before its target held the place: the target's own name takes it.
      if (shown === id && !existing.name) Object.assign(existing, splitCategoryName(raw));
    } else {
      byId.set(shown, shown === id ? { id, ...splitCategoryName(raw), count: 1 } : { id: shown, emoji: '', name: '', count: 1 });
    }
  }
  const rank = (category: ProductCategory) => {
    const at = CATEGORY_ORDER.findIndex((pattern) => pattern.test(plainName(category.name)));
    return at < 0 ? CATEGORY_ORDER.length : at;
  };
  return [...byId.values()]
    .filter((category) => category.name)
    .map((category, index) => ({ category, index }))
    .sort((a, b) => rank(a.category) - rank(b.category) || a.index - b.index)
    .map(({ category }) => category);
}

/** The ids of the products shown under a category (a merged category's products included). */
export function productIdsInCategory(products: readonly Categorized[], categoryId: string): Set<string> {
  const merged = mergedCategories(products);
  const shown = merged.get(categoryId) ?? categoryId;
  return new Set(products.filter((p) => shownCategory(p, merged) === shown).map((p) => p._id));
}

// ── The engagement key (docs/contracts-v2.md §10.2 in the app) ──────────────

/** `'v1-' + hex8(FNV-1a 32 of the UTF-8 bytes of the trimmed video address)`: the same key the app and the server use. */
export function reelKey(video: string): string {
  let h = 0x811c9dc5;
  const mix = (byte: number) => {
    h ^= byte;
    h = Math.imul(h, 0x01000193) >>> 0;
  };
  for (const ch of video.trim()) {
    const c = ch.codePointAt(0) ?? 0;
    if (c < 0x80) mix(c);
    else if (c < 0x800) {
      mix(0xc0 | (c >> 6));
      mix(0x80 | (c & 63));
    } else if (c < 0x10000) {
      mix(0xe0 | (c >> 12));
      mix(0x80 | ((c >> 6) & 63));
      mix(0x80 | (c & 63));
    } else {
      mix(0xf0 | (c >> 18));
      mix(0x80 | ((c >> 12) & 63));
      mix(0x80 | ((c >> 6) & 63));
      mix(0x80 | (c & 63));
    }
  }
  return 'v1-' + h.toString(16).padStart(8, '0');
}

/** U+200F, the right-to-left mark (built from its code so no invisible character sits in this file). */
const RLM = String.fromCharCode(0x200f);

const UNITS: readonly [number, string, string][] = [
  [1_000_000_000, 'B', 'مليار'],
  [1_000_000, 'M', 'مليون'],
  [1_000, 'K', 'ألف'],
];

/**
 * A count under its key, exactly as the app shows it: exact below a thousand, then 1.2K / "1.2 ألف" — always cut
 * down, never rounded up, one decimal under a hundred of the unit. Latin digits in both languages.
 */
export function formatReelCount(n: number, locale: string): string {
  const value = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  for (const [size, en, ar] of UNITS) {
    if (value < size) continue;
    const tenths = Math.floor((value * 10) / size);
    const text = tenths < 1000 ? (tenths % 10 === 0 ? String(tenths / 10) : `${Math.floor(tenths / 10)}.${tenths % 10}`) : String(Math.floor(value / size));
    // Arabic: a right-to-left mark first, so "1.2 ألف" reads number-then-word from the right.
    return locale === 'ar' ? `${RLM}${text} ${ar}` : `${text}${en}`;
  }
  return String(value);
}
