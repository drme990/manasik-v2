import { Metadata } from 'next';
import { routing } from '@/i18n/routing';

export function getSeoMetadata({
  locale,
  path,
  title,
  description,
  keywords,
  openGraph,
  twitter,
}: {
  locale: string;
  path: string;
  title?: string;
  description?: string;
  keywords?: string[];
  openGraph?: Metadata['openGraph'];
  twitter?: Metadata['twitter'];
}): Metadata {
  const baseUrl = (process.env.BASE_URL || 'https://www.manasik.net').replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Format locale prefix: root path for default locale should still have prefix because localePrefix is 'always'
  const canonicalUrl = `${baseUrl}/${locale}${cleanPath === '/' ? '' : cleanPath}`;
  
  const languages: Record<string, string> = {};
  routing.locales.forEach((loc) => {
    languages[loc] = `${baseUrl}/${loc}${cleanPath === '/' ? '' : cleanPath}`;
  });
  // Set x-default to the default locale
  languages['x-default'] = `${baseUrl}/${routing.defaultLocale}${cleanPath === '/' ? '' : cleanPath}`;

  const ogUrl = openGraph?.url || canonicalUrl;

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
    openGraph: openGraph
      ? {
          ...openGraph,
          url: ogUrl,
        }
      : undefined,
    twitter,
  };
}
