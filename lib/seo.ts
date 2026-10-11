import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { IS_INDEXABLE, SITE_URL } from '@/lib/site';
import { getSeoSettings, type SeoSettings } from '@/lib/seo-content';

const SITE_NAME: Record<string, string> = {
  en: 'Manasik',
  ar: 'مناسك',
};

export const brandName = (locale: string) =>
  SITE_NAME[locale] || SITE_NAME.en;

const hasBrand = (title: string) =>
  Object.values(SITE_NAME).some((b) => title.includes(b));

/** Meta title with the brand exactly once (admin titles may or may not include it). */
export function withBrand(title: string, locale: string): string {
  if (!title) return brandName(locale);
  return hasBrand(title) ? title : `${title} | ${brandName(locale)}`;
}

/** Visible heading without a trailing " | Brand" suffix. */
export function stripBrand(title: string): string {
  return title
    .replace(new RegExp(`\\s*[|\\-–—]\\s*(${Object.values(SITE_NAME).join('|')})\\s*$`), '')
    .trim();
}

/** Metadata for static SEO pages whose copy lives in `seoPages.<ns>`. */
export async function pageMetadata(
  locale: string,
  ns: string,
  path: string,
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: `seoPages.${ns}` });
  return getSeoMetadata({
    locale,
    path,
    title: withBrand(t('pageTitle'), locale),
    description: t('pageDescription'),
  });
}

const DEFAULT_OG_IMAGE = '/og-default.png';
const DEFAULT_OG_IMAGE_WIDTH = 1200;
const DEFAULT_OG_IMAGE_HEIGHT = 630;

function absolutizeUrl(url: string | URL, baseUrl: string): string {
  const s = String(url);
  if (s.startsWith('http')) return s;
  return `${baseUrl}${s.startsWith('/') ? s : `/${s}`}`;
}

export async function getSeoMetadata({
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
}): Promise<Metadata> {
  const baseUrl = SITE_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const settings = await getSeoSettings();

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
  const siteName = brandName(locale);
  const ogImageAlt = String(openGraph?.title || title || siteName);
  const defaultOgImage = settings?.defaultOgImage || DEFAULT_OG_IMAGE;

  const callerOgImages = openGraph?.images
    ? Array.isArray(openGraph.images)
      ? openGraph.images
      : [openGraph.images]
    : [];
  const ogImages = callerOgImages.length
    ? callerOgImages.map((img) =>
      typeof img === 'string' || img instanceof URL
        ? { url: absolutizeUrl(img, baseUrl), alt: ogImageAlt }
        : { ...img, url: absolutizeUrl(img.url ?? defaultOgImage, baseUrl) },
    )
    : [
      {
        url: absolutizeUrl(defaultOgImage, baseUrl),
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
        : { ...img, url: absolutizeUrl(img.url ?? defaultOgImage, baseUrl) },
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
    ...(IS_INDEXABLE ? {} : { robots: { index: false, follow: false } }),
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

const DEFAULT_SAME_AS = [
  'https://www.facebook.com/Manasik990',
  'https://www.tiktok.com/@manasik2990',
  'https://www.instagram.com/manasik990/',
];
const DEFAULT_PHONE = '+201027282396';
const DEFAULT_EMAIL = 'info@manasik.net';

/** Localized country name from an ISO 3166-1 alpha-2 code. */
export function countryName(code: string, locale: string): string {
  try {
    const names = new Intl.DisplayNames([locale === 'ar' ? 'ar' : 'en'], {
      type: 'region',
    });
    return names.of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

/** `areaServed` value from admin SEO settings (falls back to Worldwide). */
export function settingsAreaServed(settings: SeoSettings | null) {
  const areas = settings?.structuredDataDefaults?.areaServed?.filter(Boolean);
  if (!areas?.length) return 'Worldwide';
  return areas.length === 1 ? areas[0] : areas;
}

export function buildOrganizationSchema(
  locale: string,
  baseUrl: string,
  settings?: SeoSettings | null,
) {
  const isAr = locale === 'ar';
  const name =
    settings?.organizationName?.[locale as 'ar' | 'en'] || brandName(locale);
  const description = isAr
    ? 'مناسك - نُؤدي عنك بالوكالة الشرعية أداء العمرة، العقيقة، الأضاحي، النذر، الصدقة، وحفر الآبار.'
    : 'Manasik performs religious services on your behalf with legal proxy: Umrah Badal, Aqiqah, Qurbani, Sadaqah, and water wells.';
  const sameAs = settings?.organizationSameAs?.length
    ? settings.organizationSameAs
    : DEFAULT_SAME_AS;
  const telephone = settings?.organizationContactPhone || DEFAULT_PHONE;
  const email = settings?.organizationContactEmail || DEFAULT_EMAIL;
  const serviceType = settings?.structuredDataDefaults?.serviceType?.length
    ? settings.structuredDataDefaults.serviceType
    : isAr
      ? ['عمرة البدل', 'العقيقة', 'الأضاحي', 'النذر', 'الصدقة', 'حفر الآبار']
      : ['Umrah by Proxy', 'Aqiqah', 'Qurbani', 'Nadhr', 'Sadaqah', 'Water Wells'];

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Organization',
    '@id': `${baseUrl}/#organization`,
    name,
    alternateName: ['Manasik'],
    url: baseUrl,
    logo: settings?.organizationLogo || `${baseUrl}/logo-light.png`,
    description,
    sameAs,
    ...(settings?.organizationKnowsAbout?.length
      ? { knowsAbout: settings.organizationKnowsAbout }
      : {}),
    areaServed: settingsAreaServed(settings ?? null),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone,
      email,
      availableLanguage: ['Arabic', 'English'],
    },
    serviceType,
  };
}

export function buildWebsiteSchema(locale: string, baseUrl: string) {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'WebSite',
    '@id': `${baseUrl}/#website`,
    name: brandName(locale),
    url: `${baseUrl}/${locale}`,
    inLanguage: locale === 'ar' ? 'ar' : 'en',
    publisher: { '@id': `${baseUrl}/#organization` },
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
      item: `${baseUrl}/${locale}${item.path === '/' ? '' : item.path}`,
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
    sizes?: {
      resolvedPrices?: { amount: number; currencyCode?: string }[];
    }[];
  },
  baseUrl: string,
  primaryImage?: string,
) {
  const isAr = locale === 'ar';
  const productName = product.name[locale as 'ar' | 'en'] || product.name.ar;
  const productDescription =
    product.content?.[locale as 'ar' | 'en']
      ?.replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 200)
      .trim() || productName;

  const brand = { '@type': 'Organization', name: brandName(locale) };
  const url = `${baseUrl}/${locale}/products/${product.slug}`;

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Product',
    name: productName,
    description: productDescription,
    image: primaryImage || `${baseUrl}/logo-light.png`,
    brand,
    // No price in structured data (owner, 2026-10-12): the price depends on
    // the visitor's confirmed country and must not be read by crawlers.
    offers: {
      '@type': 'Offer',
      availability: product.isActive
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url,
      seller: { ...brand, url: baseUrl },
    },
    url,
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
    heroImage?: string;
    ogImage?: string;
  },
  baseUrl: string,
  options: {
    url?: string;
    name?: string;
    areaServed?: unknown;
  } = {},
) {
  const name =
    options.name || service.name[locale as 'ar' | 'en'] || service.name.ar;
  const description =
    service.description[locale as 'ar' | 'en'] || service.description.ar;
  const image = service.heroImage || service.ogImage;

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Service',
    name,
    description,
    ...(image ? { image } : {}),
    provider: {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: brandName(locale),
      url: baseUrl,
    },
    serviceType: service.name[locale as 'ar' | 'en'] || service.name.ar,
    url: options.url || `${baseUrl}/${locale}/services/${service.slug}`,
    areaServed: options.areaServed ?? 'Worldwide',
    inLanguage: locale === 'ar' ? 'ar' : 'en',
  };
}

export function buildArticleSchema(
  locale: string,
  post: {
    title: { ar: string; en: string };
    description: { ar: string; en: string };
    slug: string;
    category: string;
    datePublished?: string;
    dateModified?: string;
    coverImage?: string;
  },
  author: { name: { ar: string; en: string }; slug: string } | null,
  baseUrl: string,
) {
  const isAr = locale === 'ar';
  const title = post.title[locale as 'ar' | 'en'] || post.title.ar;
  const description =
    post.description[locale as 'ar' | 'en'] || post.description.ar;
  const url = `${baseUrl}/${locale}/blog/${post.category}/${post.slug}`;

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Article',
    headline: title,
    description,
    image: post.coverImage || `${baseUrl}/og-default.png`,
    ...(post.datePublished ? { datePublished: post.datePublished } : {}),
    ...(post.dateModified || post.datePublished
      ? { dateModified: post.dateModified || post.datePublished }
      : {}),
    author: author
      ? {
        '@type': 'Person',
        name: author.name[locale as 'ar' | 'en'] || author.name.ar,
        url: `${baseUrl}/${locale}/authors/${author.slug}`,
      }
      : {
        '@type': 'Organization',
        name: brandName(locale),
        url: baseUrl,
      },
    publisher: {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: brandName(locale),
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo-light.png`,
      },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    inLanguage: isAr ? 'ar' : 'en',
  };
}

export function buildPersonSchema(
  locale: string,
  author: {
    name: { ar: string; en: string };
    title?: { ar: string; en: string };
    bio?: { ar: string; en: string };
    slug: string;
    image?: string;
    externalLinks?: { url: string }[];
  },
  baseUrl: string,
) {
  const loc = locale as 'ar' | 'en';
  const name = author.name[loc] || author.name.ar;
  const jobTitle = author.title?.[loc];
  const bio = author.bio?.[loc]?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const sameAs = (author.externalLinks || [])
    .map((l) => l.url)
    .filter((u) => /^https?:\/\//.test(u));

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Person',
    name,
    ...(bio ? { description: bio } : {}),
    ...(jobTitle ? { jobTitle } : {}),
    url: `${baseUrl}/${locale}/authors/${author.slug}`,
    ...(author.image ? { image: author.image } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    worksFor: {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: brandName(locale),
    },
  };
}


// ─── Product title and description (SEO, owner 2026-10-12) ───────────────────

const MAKKAH_SLUGS = new Set([
  'umrah-al-badal',
  'umrah-al-badal-on-friday',
  'al-haram-water-distribution',
]);
const SACRIFICE_SLUGS = new Set([
  'ram-with-food',
  'ewe-with-food',
  'large-sheep-exceptional-size',
  'goat',
  'male-goat',
  'calf',
]);

/**
 * `<title>` for a product page: the product name, where it is carried out,
 * and the brand once. No price, ever. If the name already says where
 * (e.g. "توزيع مصاحف في أفريقيا"), the place is not repeated.
 */
export function productSeoTitle(name: string, slug: string, locale: string): string {
  const isAr = locale === 'ar';
  const brand = brandName(locale);
  const lower = name.toLowerCase();
  let suffix = '';
  if (MAKKAH_SLUGS.has(slug)) {
    if (!/مكة|makkah|mecca/i.test(lower)) suffix = isAr ? ' في مكة المكرمة' : ' in Makkah';
  } else if (SACRIFICE_SLUGS.has(slug)) {
    suffix = isAr ? ' للعقيقة والصدقة في أفريقيا' : ' for Aqiqah and Sadaqah in Africa';
  } else if (!/أفريقيا|افريقيا|africa/i.test(lower)) {
    suffix = isAr ? ' في أفريقيا صدقة جارية' : ' in Africa, Sadaqah Jariyah';
  } else {
    suffix = isAr ? ' صدقة جارية' : ', Sadaqah Jariyah';
  }
  return `${name}${suffix} | ${brand}`;
}

/**
 * Meta description from stored HTML: tags become spaces, whitespace collapses,
 * a leading "الوصف:" / "Description:" label is dropped, and the text is cut
 * at the last whole word before 155 characters.
 */
export function seoDescriptionFromHtml(html: string | undefined, fallback: string): string {
  const text = (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .replace(/^\s*(description|الوصف)\s*:\s*/i, '')
    .trim();
  if (!text) return fallback;
  if (text.length <= 155) return text;
  const cut = text.slice(0, 155);
  const atWord = cut.lastIndexOf(' ');
  return `${(atWord > 80 ? cut.slice(0, atWord) : cut).replace(/[،,;:\-–—]+$/, '').trim()}…`;
}
