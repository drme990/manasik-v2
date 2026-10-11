import { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { SITE_URL } from '@/lib/site';
import { SITEMAP_IDS } from '@/lib/sitemap-ids';

const BASE_URL = SITE_URL;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const PLATFORM = 'manasik';

type Loc = { ar?: string; en?: string };
type Product = { slug: string; updatedAt?: string };
type SeoService = { slug: string; isActive: boolean; name?: Loc; updatedAt?: string };
type SeoBlogPost = {
  slug: string;
  category: string;
  isActive: boolean;
  title?: Loc;
  dateModified?: string;
  datePublished?: string;
  updatedAt?: string;
};
type SeoAuthor = { slug: string; isActive: boolean; name?: Loc; updatedAt?: string };
type SeoCountryHub = {
  slug: string;
  isActive: boolean;
  title?: Loc;
  serviceSlugs?: string[];
  updatedAt?: string;
};
type SeoSeasonalPage = { slug: string; isActive: boolean; name?: Loc; updatedAt?: string };

// ─── Sitemap ID helpers ─────────────────────────────────────────────────────

export async function generateSitemaps() {
  return SITEMAP_IDS.map((id) => ({ id }));
}

// ─── Data fetchers ───────────────────────────────────────────────────────────

async function fetchProducts(): Promise<Product[]> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/products?platform=${PLATFORM}&limit=200`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.data.products : [];
  } catch {
    return [];
  }
}

async function fetchSeoJson<T>(path: string): Promise<T[]> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? (data.data as T[]) : [];
  } catch {
    return [];
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildAlternates(path: string) {
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = `${BASE_URL}/${loc}${path === '/' ? '' : path}`;
  }
  languages['x-default'] = `${BASE_URL}/${routing.defaultLocale}${path === '/' ? '' : path}`;
  return { languages };
}

/** One sitemap entry. `lastModified` is only emitted when it is real data. */
function entry(
  locale: string,
  path: string,
  priority: number,
  changeFrequency: 'daily' | 'weekly' | 'monthly',
  lastModified?: string,
): MetadataRoute.Sitemap[number] {
  return {
    url: `${BASE_URL}/${locale}${path === '/' ? '' : path}`,
    ...(lastModified ? { lastModified } : {}),
    changeFrequency,
    priority,
    alternates: buildAlternates(path),
  };
}

/** Only list a localized URL when the page has content in that language. */
const has = (value: Loc | undefined, locale: string) =>
  Boolean(value?.[locale as 'ar' | 'en']?.trim());

// ─── Static pages ────────────────────────────────────────────────────────────

function buildStaticPagesSitemap(locale: string): MetadataRoute.Sitemap {
  const pages: [string, number, 'daily' | 'weekly' | 'monthly'][] = [
    ['/', 1, 'daily'],
    ['/products', 0.9, 'daily'],
    ['/services', 0.9, 'weekly'],
    ['/blog', 0.8, 'weekly'],
    ['/reviews', 0.7, 'weekly'],
    ['/authors', 0.6, 'monthly'],
    ['/countries', 0.7, 'weekly'],
    ['/seasonal', 0.7, 'weekly'],
    ['/calc-aqeqa', 0.8, 'monthly'],
    ['/about', 0.6, 'monthly'],
    ['/how-it-works', 0.6, 'monthly'],
    ['/documentation', 0.6, 'monthly'],
    ['/sharia-compliance', 0.6, 'monthly'],
    ['/payment-from-europe', 0.6, 'monthly'],
    ['/contact', 0.5, 'monthly'],
    ['/terms', 0.4, 'monthly'],
    ['/privacy', 0.4, 'monthly'],
  ];
  return pages.map(([path, priority, freq]) => entry(locale, path, priority, freq));
}

// ─── Products ────────────────────────────────────────────────────────────────

async function buildProductsSitemap(locale: string): Promise<MetadataRoute.Sitemap> {
  const products = await fetchProducts();
  return products
    .filter((p) => Boolean(p.slug))
    .map((p) => entry(locale, `/products/${p.slug}`, 0.8, 'weekly', p.updatedAt));
}

// ─── Dynamic SEO content (services, blog, authors, countries, seasonal) ─────

async function buildSeoSitemap(locale: string): Promise<MetadataRoute.Sitemap> {
  const [services, posts, authors, hubs, seasonal] = await Promise.all([
    fetchSeoJson<SeoService>(`/api/seo/services?platform=${PLATFORM}`),
    fetchSeoJson<SeoBlogPost>(`/api/seo/blog?platform=${PLATFORM}`),
    fetchSeoJson<SeoAuthor>('/api/seo/authors'),
    fetchSeoJson<SeoCountryHub>(`/api/seo/countries?platform=${PLATFORM}`),
    fetchSeoJson<SeoSeasonalPage>(`/api/seo/seasonal?platform=${PLATFORM}`),
  ]);

  const entries: MetadataRoute.Sitemap = [];
  const activeServices = services.filter((s) => s.isActive && has(s.name, locale));
  const activeServiceSlugs = new Set(activeServices.map((s) => s.slug));

  for (const s of activeServices) {
    entries.push(entry(locale, `/services/${s.slug}`, 0.85, 'weekly', s.updatedAt));
  }

  for (const p of posts.filter((x) => x.isActive && has(x.title, locale))) {
    entries.push(
      entry(
        locale,
        `/blog/${p.category}/${p.slug}`,
        0.7,
        'monthly',
        p.dateModified || p.datePublished || p.updatedAt,
      ),
    );
  }

  for (const a of authors.filter((x) => x.isActive && has(x.name, locale))) {
    entries.push(entry(locale, `/authors/${a.slug}`, 0.5, 'monthly', a.updatedAt));
  }

  for (const h of hubs.filter((x) => x.isActive && has(x.title, locale))) {
    entries.push(entry(locale, `/countries/${h.slug}`, 0.8, 'weekly', h.updatedAt));
    for (const serviceSlug of (h.serviceSlugs || []).filter((slug) =>
      activeServiceSlugs.has(slug),
    )) {
      entries.push(
        entry(locale, `/countries/${h.slug}/${serviceSlug}`, 0.75, 'weekly', h.updatedAt),
      );
    }
  }

  for (const s of seasonal.filter((x) => x.isActive && has(x.name, locale))) {
    entries.push(entry(locale, `/seasonal/${s.slug}`, 0.8, 'weekly', s.updatedAt));
  }

  return entries;
}

// ─── Main sitemap entry ──────────────────────────────────────────────────────

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = await props.id;

  switch (id) {
    case 'ar-pages':
      return buildStaticPagesSitemap('ar');
    case 'ar-products':
      return await buildProductsSitemap('ar');
    case 'ar-seo':
      return await buildSeoSitemap('ar');
    case 'en-pages':
      return buildStaticPagesSitemap('en');
    case 'en-products':
      return await buildProductsSitemap('en');
    case 'en-seo':
      return await buildSeoSitemap('en');
    default:
      return [];
  }
}
