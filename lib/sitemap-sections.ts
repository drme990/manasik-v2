// Which content sections (services, blog, authors, countries, seasonal,
// reviews) have at least one active item per language. Shared by the sitemap,
// the sitemap index and (via the pages' own data) the noindex rule for empty
// sections (SEO D5/D14, owner 2026-10-12).
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const PLATFORM = 'manasik';

type Loc = { ar?: string; en?: string };

async function fetchSeoJson<T>(path: string): Promise<T[]> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? (data.data as T[]) : [];
  } catch {
    return [];
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

export async function sectionsWithContent(locale: string): Promise<Set<string>> {
  const [services, posts, authors, hubs, seasonal, reviews] = await Promise.all([
    fetchSeoJson<{ isActive: boolean; name?: Loc }>(`/api/seo/services?platform=${PLATFORM}`),
    fetchSeoJson<{ isActive: boolean; title?: Loc }>(`/api/seo/blog?platform=${PLATFORM}`),
    fetchSeoJson<{ isActive: boolean; name?: Loc }>('/api/seo/authors'),
    fetchSeoJson<{ isActive: boolean; title?: Loc }>(`/api/seo/countries?platform=${PLATFORM}`),
    fetchSeoJson<{ isActive: boolean; name?: Loc }>(`/api/seo/seasonal?platform=${PLATFORM}`),
    fetchSeoJson<{ isActive: boolean }>(`/api/seo/reviews?platform=${PLATFORM}`),
  ]);
  const out = new Set<string>();
  if (services.some((s) => s.isActive && has(s.name, locale))) out.add('/services');
  if (posts.some((p) => p.isActive && has(p.title, locale))) out.add('/blog');
  if (authors.some((a) => a.isActive && has(a.name, locale))) out.add('/authors');
  if (hubs.some((h) => h.isActive && has(h.title, locale))) out.add('/countries');
  if (seasonal.some((x) => x.isActive && has(x.name, locale))) out.add('/seasonal');
  if (reviews.some((r) => r.isActive)) out.add('/reviews');
  return out;
}

/** True when the "<locale>-seo" child sitemap would list at least one URL. */
export function seoSitemapHasUrls(filled: Set<string>): boolean {
  return [...filled].some((p) => p !== '/reviews');
}
