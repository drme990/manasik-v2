// Which content sections (services, blog, authors, countries, seasonal,
// reviews) have at least one active item per language. Shared by the sitemap,
// the sitemap index and (via the pages' own data) the noindex rule for empty
// sections (SEO D5/D14, owner 2026-10-12).
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const PLATFORM = 'manasik';

type Loc = { ar?: string; en?: string };

/** The section's items, or null when the backend could not be read. */
async function fetchSeoJson<T>(path: string, revalidate = 3600): Promise<T[] | null> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? (data.data as T[]) : null;
  } catch {
    return null;
  }
}

const has = (value: Loc | undefined, locale: string) =>
  Boolean(value?.[locale as 'ar' | 'en']?.trim());

export const SECTION_PATHS = new Set([
  '/services',
  '/blog',
  '/authors',
  '/countries',
  '/seasonal',
  '/reviews',
]);

async function readSections(locale: string, revalidate?: number): Promise<Set<string> | null> {
  const lists = await Promise.all([
    fetchSeoJson<{ isActive: boolean; name?: Loc }>(`/api/seo/services?platform=${PLATFORM}`, revalidate),
    fetchSeoJson<{ isActive: boolean; title?: Loc }>(`/api/seo/blog?platform=${PLATFORM}`, revalidate),
    fetchSeoJson<{ isActive: boolean; name?: Loc }>('/api/seo/authors', revalidate),
    fetchSeoJson<{ isActive: boolean; title?: Loc }>(`/api/seo/countries?platform=${PLATFORM}`, revalidate),
    fetchSeoJson<{ isActive: boolean; name?: Loc }>(`/api/seo/seasonal?platform=${PLATFORM}`, revalidate),
    fetchSeoJson<{ isActive: boolean }>(`/api/seo/reviews?platform=${PLATFORM}`, revalidate),
  ]);
  if (lists.some((list) => list === null)) return null;
  const [services, posts, authors, hubs, seasonal, reviews] = lists as [
    { isActive: boolean; name?: Loc }[],
    { isActive: boolean; title?: Loc }[],
    { isActive: boolean; name?: Loc }[],
    { isActive: boolean; title?: Loc }[],
    { isActive: boolean; name?: Loc }[],
    { isActive: boolean }[],
  ];
  const out = new Set<string>();
  if (services.some((s) => s.isActive && has(s.name, locale))) out.add('/services');
  if (posts.some((p) => p.isActive && has(p.title, locale))) out.add('/blog');
  if (authors.some((a) => a.isActive && has(a.name, locale))) out.add('/authors');
  if (hubs.some((h) => h.isActive && has(h.title, locale))) out.add('/countries');
  if (seasonal.some((x) => x.isActive && has(x.name, locale))) out.add('/seasonal');
  if (reviews.some((r) => r.isActive)) out.add('/reviews');
  return out;
}

/** Sections with content; an unreadable backend counts as empty (sitemap, noindex). */
export async function sectionsWithContent(locale: string): Promise<Set<string>> {
  return (await readSections(locale)) ?? new Set();
}

/**
 * The section links the header, footer and page buttons may show (owner,
 * 2026-10-12): a section with nothing published is hidden, and its link
 * appears by itself once something is published there. When the backend
 * cannot be read the answer is null and every link shows, as before.
 */
export async function visibleSections(locale: string): Promise<string[] | null> {
  // Never hold the page up: past 1.5 s every link shows, as before.
  const filled = await Promise.race([
    readSections(locale, 300),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
  ]);
  return filled ? [...filled] : null;
}

/** True when the "<locale>-seo" child sitemap would list at least one URL. */
export function seoSitemapHasUrls(filled: Set<string>): boolean {
  return [...filled].some((p) => p !== '/reviews');
}
