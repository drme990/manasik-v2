import { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

const BASE_URL = 'https://www.manasik.net';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

type Product = {
  slug: string;
  updatedAt?: string;
  name?: { ar?: string; en?: string };
};

// ─── Sitemap ID helpers ─────────────────────────────────────────────────────

export async function generateSitemaps() {
  return [
    { id: 'ar-pages' },
    { id: 'ar-products' },
    { id: 'en-pages' },
    { id: 'en-products' },
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
    { path: '/calc-aqeqa', priority: 0.8, changeFrequency: 'monthly' as const },
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
    case 'en-pages':
      return buildStaticPagesSitemap('en');
    case 'en-products':
      return await buildProductsSitemap('en');
    default:
      return [];
  }
}
