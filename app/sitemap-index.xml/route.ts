import { SITEMAP_IDS } from '@/lib/sitemap-ids';
import { SITE_URL } from '@/lib/site';

// Sitemap index (/sitemap-index.xml; /sitemap.xml redirects here).
// `generateSitemaps` only emits the child sitemaps at
// /sitemap/{id}.xml — it does not create an index — so robots.txt and
// Search Console point here. It cannot live at app/sitemap.xml because that
// path is reserved for the app/sitemap.ts metadata route.
export const revalidate = 3600;

export async function GET() {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SITEMAP_IDS
  .map(
    (id) =>
      `  <sitemap><loc>${SITE_URL}/sitemap/${id}.xml</loc></sitemap>`,
  )
  .join('\n')}
</sitemapindex>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
