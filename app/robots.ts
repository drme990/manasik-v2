import { MetadataRoute } from 'next';
import { IS_INDEXABLE, SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  // Preview/staging deployments block all crawling.
  if (!IS_INDEXABLE) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Only disallow truly non-public infrastructure routes.
        // Checkout, auth, user, and payment pages are allowed in robots.txt
        // but have page-level `noindex` metadata to prevent indexing
        // while still allowing Google to crawl and see the noindex directive.
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap-index.xml`,
    host: SITE_URL,
  };
}
