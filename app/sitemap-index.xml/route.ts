import { SITEMAP_IDS } from '@/lib/sitemap-ids';
import { SITE_URL } from '@/lib/site';
import { sectionsWithContent, seoSitemapHasUrls } from '@/lib/sitemap-sections';

// Sitemap index (/sitemap-index.xml; /sitemap.xml redirects here).
// `generateSitemaps` only emits the child sitemaps at
// /sitemap/{id}.xml — it does not create an index — so robots.txt and
// Search Console point here. It cannot live at app/sitemap.xml because that
// path is reserved for the app/sitemap.ts metadata route.
export const revalidate = 3600;

export async function GET() {
  // The "seo" child sitemaps are listed only when they have at least one URL
  // (SEO D14, owner 2026-10-12): an empty sitemap file is a signal of neglect.
  const [ar, en] = await Promise.all([sectionsWithContent('ar'), sectionsWithContent('en')]);
  const ids = SITEMAP_IDS.filter((id) => {
    if (id === 'ar-seo') return seoSitemapHasUrls(ar);
    if (id === 'en-seo') return seoSitemapHasUrls(en);
    return true;
  });
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ids
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
