import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.manasik.net';

  // Fetch all products for dynamic sitemap entries
  let productUrls: MetadataRoute.Sitemap = [];

  try {
    const productsResponse = await fetch(`${baseUrl}/api/products`, {
      next: { revalidate: 3600 }, // Revalidate every hour
    });

    if (productsResponse.ok) {
      const productsData = await productsResponse.json();
      const products = productsData.success ? productsData.data.products : [];

      productUrls = products.map(
        (product: { _id: string; updatedAt?: string }) => ({
          url: `${baseUrl}/products/${product._id}`,
          lastModified: product.updatedAt || new Date().toISOString(),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        }),
      );
    }
  } catch (error) {
    // If fetch fails during build, return empty product URLs
    console.warn('Failed to fetch products for sitemap:', error);
  }

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/calc-aqeqa`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  return [...staticPages, ...productUrls];
}
