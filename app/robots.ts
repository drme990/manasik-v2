import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
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
    sitemap: 'https://www.manasik.net/sitemap.xml',
    host: 'https://www.manasik.net',
  };
}
