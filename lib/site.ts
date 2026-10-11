// Single source of truth for the public site URL and indexability.
// Every canonical, hreflang, sitemap and JSON-LD URL is built from SITE_URL.

export const SITE_URL = (
  process.env.BASE_URL || 'https://www.manasik.net'
).replace(/\/$/, '');

// Preview/staging deployments must never be indexed: set SEO_NOINDEX=true,
// or rely on Vercel's VERCEL_ENV which is 'preview' outside production.
export const IS_INDEXABLE =
  process.env.SEO_NOINDEX !== 'true' &&
  (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'production');
