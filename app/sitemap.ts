import { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

const BASE_URL = 'https://www.manasik.net';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

type Product = {
  slug: string;
  updatedAt?: string;
  name?: { ar?: string; en?: string };
};

type SeoService = { slug: string; isActive: boolean; updatedAt?: string };
type SeoBlogPost = {
  slug: string;
  category: string;
  isActive: boolean;
  dateModified?: string;
  datePublished?: string;
};
type SeoAuthor = { slug: string; isActive: boolean };
type SeoCountryHub = {
  slug: string;
  isActive: boolean;
  serviceSlugs?: string[];
};
type SeoSeasonalPage = { slug: string; isActive: boolean };

// ─── Sitemap ID helpers ─────────────────────────────────────────────────────

export async function generateSitemaps() {
  return [
    { id: 'ar-pages' },
    { id: 'ar-products' },
    { id: 'ar-seo' },
    { id: 'en-pages' },
    { id: 'en-products' },
    { id: 'en-seo' },
  ];
}

// ─── Data fetchers ───────────────────────────────────────────────────────────

async function fetchProducts(): Promise<Product[]> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/products?platform=manasik&limit=200`,
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

// ─── Hreflang helper ─────────────────────────────────────────────────────────

function buildAlternates(path: string) {
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = `${BASE_URL}/${loc}${path === '/' ? '' : path}`;
  }
  languages['x-default'] = `${BASE_URL}/${routing.defaultLocale}${path === '/' ? '' : path}`;
  return { languages };
}

// ─── Static page builders ────────────────────────────────────────────────────

function buildStaticPagesSitemap(locale: string): MetadataRoute.Sitemap {
  const now = new Date().toISOString();
  const pages = [
    { path: '/', priority: 1, changeFrequency: 'daily' as const },
    { path: '/products', priority: 0.9, changeFrequency: 'daily' as const },
    { path: '/services', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/blog', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/reviews', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/authors', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/countries', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/seasonal', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/calc-aqeqa', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/about', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/how-it-works', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/documentation', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/sharia-compliance', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/payment-from-europe', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/contact', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/terms', priority: 0.4, changeFrequency: 'monthly' as const },
    { path: '/privacy', priority: 0.4, changeFrequency: 'monthly' as const },
  ];

  return pages.map((page) => ({
    url: `${BASE_URL}/${locale}${page.path === '/' ? '' : page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
    alternates: buildAlternates(page.path),
  }));
}

// ─── Product sitemap builder ─────────────────────────────────────────────────

async function buildProductsSitemap(locale: string): Promise<MetadataRoute.Sitemap> {
  const products = await fetchProducts();
  const productsWithSlug = products.filter((p) => Boolean(p.slug));

  return productsWithSlug.map((product) => ({
    url: `${BASE_URL}/${locale}/products/${product.slug}`,
    lastModified: product.updatedAt || new Date().toISOString(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
    alternates: buildAlternates(`/products/${product.slug}`),
  }));
}

// ─── Dynamic SEO content sitemap (services, blog, authors) ──────────────────

async function buildSeoSitemap(locale: string): Promise<MetadataRoute.Sitemap> {
  const [services, posts, authors, hubs, seasonal] = await Promise.all([
    fetchSeoJson<SeoService>('/api/seo/services?platform=manasik'),
    fetchSeoJson<SeoBlogPost>('/api/seo/blog?platform=manasik'),
    fetchSeoJson<SeoAuthor>('/api/seo/authors'),
    fetchSeoJson<SeoCountryHub>('/api/seo/countries?platform=manasik'),
    fetchSeoJson<SeoSeasonalPage>('/api/seo/seasonal?platform=manasik'),
  ]);

  const entries: MetadataRoute.Sitemap = [];

  for (const s of services.filter((x) => x.isActive)) {
    entries.push({
      url: `${BASE_URL}/${locale}/services/${s.slug}`,
      lastModified: s.updatedAt || new Date().toISOString(),
      changeFrequency: 'weekly',
      priority: 0.85,
      alternates: buildAlternates(`/services/${s.slug}`),
    });
  }

  for (const p of posts.filter((x) => x.isActive)) {
    const path = `/blog/${p.category}/${p.slug}`;
    entries.push({
      url: `${BASE_URL}/${locale}${path}`,
      lastModified:
        p.dateModified || p.datePublished || new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: buildAlternates(path),
    });
  }

  for (const a of authors.filter((x) => x.isActive)) {
    entries.push({
      url: `${BASE_URL}/${locale}/authors/${a.slug}`,
      changeFrequency: 'monthly',
      priority: 0.5,
      alternates: buildAlternates(`/authors/${a.slug}`),
    });
  }

  const activeServiceSlugs = new Set(
    services.filter((s) => s.isActive).map((s) => s.slug),
  );

  for (const h of hubs.filter((x) => x.isActive)) {
    entries.push({
      url: `${BASE_URL}/${locale}/countries/${h.slug}`,
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: buildAlternates(`/countries/${h.slug}`),
    });
    for (const serviceSlug of (h.serviceSlugs || []).filter((slug) =>
      activeServiceSlugs.has(slug),
    )) {
      const path = `/countries/${h.slug}/${serviceSlug}`;
      entries.push({
        url: `${BASE_URL}/${locale}${path}`,
        changeFrequency: 'weekly',
        priority: 0.75,
        alternates: buildAlternates(path),
      });
    }
  }

  for (const s of seasonal.filter((x) => x.isActive)) {
    entries.push({
      url: `${BASE_URL}/${locale}/seasonal/${s.slug}`,
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: buildAlternates(`/seasonal/${s.slug}`),
    });
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
