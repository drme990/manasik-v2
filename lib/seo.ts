import { Metadata } from 'next';
import { routing } from '@/i18n/routing';

const SITE_NAME: Record<string, string> = {
  en: 'Manasik Foundation',
  ar: 'مؤسسة مناسك',
};

const DEFAULT_OG_IMAGE = '/og-default.png';
const DEFAULT_OG_IMAGE_WIDTH = 1200;
const DEFAULT_OG_IMAGE_HEIGHT = 630;

function absolutizeUrl(url: string | URL, baseUrl: string): string {
  const s = String(url);
  if (s.startsWith('http')) return s;
  return `${baseUrl}${s.startsWith('/') ? s : `/${s}`}`;
}

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
  const ogLocale = locale === 'ar' ? 'ar_SA' : 'en_US';
  const ogAlternateLocale = routing.locales
    .filter((loc) => loc !== locale)
    .map((loc) => (loc === 'ar' ? 'ar_SA' : 'en_US'));

  // In this Next.js version a page-level openGraph/twitter object replaces
  // the layout's entirely (fields do NOT merge), so every page must emit a
  // complete set here — siteName, images, twitter card — rather than relying
  // on inheritance from the root layout.
  const siteName = SITE_NAME[locale] || SITE_NAME.en;
  const ogImageAlt = String(openGraph?.title || title || siteName);

  const callerOgImages = openGraph?.images
    ? Array.isArray(openGraph.images)
      ? openGraph.images
      : [openGraph.images]
    : [];
  const ogImages = callerOgImages.length
    ? callerOgImages.map((img) =>
      typeof img === 'string' || img instanceof URL
        ? { url: absolutizeUrl(img, baseUrl), alt: ogImageAlt }
        : { ...img, url: absolutizeUrl(img.url ?? DEFAULT_OG_IMAGE, baseUrl) },
    )
    : [
      {
        url: `${baseUrl}${DEFAULT_OG_IMAGE}`,
        width: DEFAULT_OG_IMAGE_WIDTH,
        height: DEFAULT_OG_IMAGE_HEIGHT,
        alt: siteName,
      },
    ];

  const callerTwitterImages = twitter?.images
    ? Array.isArray(twitter.images)
      ? twitter.images
      : [twitter.images]
    : [];
  const twitterImages = callerTwitterImages.length
    ? callerTwitterImages.map((img) =>
      typeof img === 'string' || img instanceof URL
        ? absolutizeUrl(img, baseUrl)
        : { ...img, url: absolutizeUrl(img.url ?? DEFAULT_OG_IMAGE, baseUrl) },
    )
    : ogImages.map((img) =>
      img.alt ? { url: img.url, alt: img.alt } : { url: img.url },
    );

  return {
    // Use `absolute` to bypass the parent layout's title.template.
    // This prevents double-branding (e.g. "X | Manasik | Manasik Foundation")
    // and prevents the layout's title.default from rendering as a separate
    // <title> tag alongside the page's title.
    title: title ? { absolute: title } : undefined,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
    openGraph: {
      ...(openGraph || {}),
      // `type` is a discriminant of the OpenGraph union — only default it
      // when the caller omitted it, so typed variants (e.g. 'article')
      // keep their discriminant.
      ...(openGraph && 'type' in openGraph ? {} : { type: 'website' as const }),
      title: openGraph?.title || title,
      description: openGraph?.description || description,
      url: ogUrl,
      siteName: openGraph?.siteName || siteName,
      images: ogImages,
      locale: ogLocale,
      alternateLocale: ogAlternateLocale,
    },
    twitter: {
      ...(twitter || {}),
      // Same discriminant rule for `card`.
      ...(twitter && 'card' in twitter ? {} : { card: 'summary_large_image' as const }),
      title: twitter?.title || title,
      description: twitter?.description || openGraph?.description || description,
      images: twitterImages,
    },
  };
}

// ─── Schema Helper Functions ────────────────────────────────────────────────

const SCHEMA_CONTEXT = 'https://schema.org';

export function buildOrganizationSchema(locale: string, baseUrl: string) {
  const isAr = locale === 'ar';
  const name = isAr ? 'مؤسسة مناسك' : 'Manasik Foundation';
  const description = isAr
    ? 'مؤسسة مناسك - نُؤدي عنك بالوكالة الشرعية أداء العمرة، العقيقة، الأضاحي، النذر، الصدقة، وحفر الآبار.'
    : 'Manasik Foundation performs religious services on your behalf with legal proxy: Umrah Badal, Aqiqah, Qurbani, Sadaqah, and water wells.';

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Organization',
    name,
    alternateName: 'Manasik',
    url: baseUrl,
    logo: `${baseUrl}/logo-light.png`,
    description,
    sameAs: [
      'https://www.facebook.com/Manasik990',
      'https://www.tiktok.com/@manasik2990',
      'https://www.instagram.com/manasik990/',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: '+201027282396',
      email: 'info@manasik.net',
      availableLanguage: ['Arabic', 'English'],
    },
    serviceType: isAr
      ? ['عمرة البدل', 'العقيقة', 'الأضاحي', 'النذر', 'الصدقة', 'حفر الآبار']
      : ['Umrah by Proxy', 'Aqiqah', 'Qurbani', 'Nadhr', 'Sadaqah', 'Water Wells'],
  };
}

export function buildWebsiteSchema(locale: string, baseUrl: string) {
  const isAr = locale === 'ar';
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'WebSite',
    name: isAr ? 'مؤسسة مناسك' : 'Manasik Foundation',
    url: baseUrl,
    inLanguage: isAr ? 'ar' : 'en',
  };
}

export function buildBreadcrumbSchema(
  locale: string,
  trail: { name: string; path: string }[],
  baseUrl: string,
) {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: `${baseUrl}/${locale}${item.path === '/' ? '' : item.path}`,
    })),
  };
}

export function buildFaqSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function buildProductSchema(
  locale: string,
  product: {
    name: { ar: string; en: string };
    content?: { ar?: string; en?: string };
    slug: string;
    baseCurrency?: string;
    isActive?: boolean;
    sizes?: { resolvedPrices?: { amount: number }[] }[];
  },
  baseUrl: string,
  primaryImage?: string,
) {
  const isAr = locale === 'ar';
  const productName = product.name[locale as 'ar' | 'en'] || product.name.ar;
  const productDescription =
    product.content?.[locale as 'ar' | 'en']
      ?.replace(/<[^>]*>/g, '')
      .slice(0, 200)
      .trim() || productName;

  const lowestPrice = product.sizes?.length
    ? Math.min(
      ...product.sizes.map(
        (s) => s.resolvedPrices?.[0]?.amount ?? 0,
      ),
    )
    : 0;

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Product',
    name: productName,
    description: productDescription,
    image: primaryImage || `${baseUrl}/logo-light.png`,
    brand: {
      '@type': 'Organization',
      name: isAr ? 'مؤسسة مناسك' : 'Manasik Foundation',
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: product.baseCurrency || 'SAR',
      lowPrice: lowestPrice,
      offerCount: product.sizes?.length ?? 1,
      availability: product.isActive
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: isAr ? 'مؤسسة مناسك' : 'Manasik Foundation',
        url: baseUrl,
      },
    },
    url: `${baseUrl}/${locale}/products/${product.slug}`,
    sku: product.slug,
    category: isAr ? 'خدمات دينية' : 'Religious Services',
  };
}

export function buildServiceSchema(
  locale: string,
  service: {
    name: { ar: string; en: string };
    description: { ar: string; en: string };
    slug: string;
  },
  baseUrl: string,
) {
  const isAr = locale === 'ar';
  const name = service.name[locale as 'ar' | 'en'] || service.name.ar;
  const description =
    service.description[locale as 'ar' | 'en'] || service.description.ar;

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Service',
    name,
    description,
    provider: {
      '@type': 'Organization',
      name: isAr ? 'مؤسسة مناسك' : 'Manasik Foundation',
      url: baseUrl,
    },
    serviceType: name,
    url: `${baseUrl}/${locale}/services/${service.slug}`,
    areaServed: 'Worldwide',
  };
}

export function buildArticleSchema(
  locale: string,
  post: {
    title: { ar: string; en: string };
    description: { ar: string; en: string };
    slug: string;
    category: string;
    datePublished: string | Date;
    dateModified: string | Date;
    coverImage?: string;
  },
  author: { name: { ar: string; en: string }; slug: string } | null,
  baseUrl: string,
) {
  const isAr = locale === 'ar';
  const title = post.title[locale as 'ar' | 'en'] || post.title.ar;
  const description =
    post.description[locale as 'ar' | 'en'] || post.description.ar;
  const authorName = author
    ? author.name[locale as 'ar' | 'en'] || author.name.ar
    : isAr
      ? 'مؤسسة مناسك'
      : 'Manasik Foundation';

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Article',
    headline: title,
    description,
    image: post.coverImage || `${baseUrl}/logo-light.png`,
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    author: {
      '@type': 'Person',
      name: authorName,
      url: author
        ? `${baseUrl}/${locale}/authors/${author.slug}`
        : baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: isAr ? 'مؤسسة مناسك' : 'Manasik Foundation',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo-light.png`,
      },
    },
    url: `${baseUrl}/${locale}/blog/${post.category}/${post.slug}`,
    inLanguage: isAr ? 'ar' : 'en',
  };
}

export function buildAggregateRatingSchema(reviews: { rating: number }[]) {
  if (!reviews.length) return null;
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  const average = total / reviews.length;

  return {
    '@type': 'AggregateRating',
    ratingValue: Math.round(average * 10) / 10,
    reviewCount: reviews.length,
    ratingCount: reviews.length,
    bestRating: 5,
    worstRating: 1,
  };
}

export function buildLocalBusinessSchema(locale: string, baseUrl: string) {
  const isAr = locale === 'ar';
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'LocalBusiness',
    name: isAr ? 'مؤسسة مناسك' : 'Manasik Foundation',
    url: baseUrl,
    logo: `${baseUrl}/logo-light.png`,
    telephone: '+201027282396',
    email: 'info@manasik.net',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Dar Alsalam',
      addressCountry: 'TZ',
    },
    sameAs: [
      'https://www.facebook.com/Manasik990',
      'https://www.tiktok.com/@manasik2990',
      'https://www.instagram.com/manasik990/',
    ],
  };
}

export function buildPersonSchema(
  locale: string,
  author: {
    name: { ar: string; en: string };
    title: { ar: string; en: string };
    bio: { ar: string; en: string };
    slug: string;
    image?: string;
  },
  baseUrl: string,
) {
  const isAr = locale === 'ar';
  const name = author.name[locale as 'ar' | 'en'] || author.name.ar;
  const title = author.title[locale as 'ar' | 'en'] || author.title.ar;
  const bio = author.bio[locale as 'ar' | 'en'] || author.bio.ar;

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Person',
    name,
    description: bio,
    jobTitle: title,
    url: `${baseUrl}/${locale}/authors/${author.slug}`,
    image: author.image || undefined,
    worksFor: {
      '@type': 'Organization',
      name: isAr ? 'مؤسسة مناسك' : 'Manasik Foundation',
    },
  };
}
