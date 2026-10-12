// Server-side fetchers for the dynamic SEO content API (Phase 2 backend).
// All responses are revalidated periodically; failed fetches return empty
// fallbacks so pages degrade gracefully instead of erroring.

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const PLATFORM = 'manasik';

export type SeoPlatform = 'manasik' | 'ghadaq' | 'shared';

export interface Localized {
  ar: string;
  en: string;
}

export interface SeoFaq {
  question: Localized;
  answer: Localized;
}

export interface SeoService {
  _id: string;
  updatedAt?: string;
  slug: string;
  platform: SeoPlatform;
  name: Localized;
  title: Localized;
  description: Localized;
  keywords: { ar: string[]; en: string[] };
  intro?: Localized;
  sections?: { title: Localized; content: Localized }[];
  faqs?: SeoFaq[];
  ctaText?: Localized;
  ctaLink?: Localized;
  ogImage?: string;
  heroImage?: string;
  displayOrder: number;
  isActive: boolean;
  linkedProductSlugs: string[];
}

export interface SeoBlogPost {
  _id: string;
  updatedAt?: string;
  slug: string;
  category: string;
  platform: SeoPlatform;
  title: Localized;
  description: Localized;
  keywords: { ar: string[]; en: string[] };
  content?: Localized;
  excerpt?: Localized;
  coverImage?: string;
  authorId?: string | null;
  datePublished?: string;
  dateModified?: string;
  faqs?: SeoFaq[];
  relatedServiceSlug?: string | null;
  isActive: boolean;
}

export interface SeoAuthor {
  _id: string;
  updatedAt?: string;
  slug: string;
  name: Localized;
  title?: Localized;
  bio?: Localized;
  qualifications?: Localized;
  image?: string;
  externalLinks: { label: string; url: string }[];
  isActive: boolean;
}

export interface SeoReview {
  _id: string;
  customerName: string;
  country: string;
  rating: number;
  text: Localized;
  serviceSlug?: string | null;
  date?: string;
  isVerified: boolean;
  isActive: boolean;
  platform: SeoPlatform;
  /** Set when it came from «شارك تجربتك»: a fully paid order is behind it. */
  experienceId?: string | null;
  avatarUrl?: string;
}

export interface SeoCountryHub {
  _id: string;
  updatedAt?: string;
  countryCode: string;
  slug: string;
  platform: SeoPlatform;
  title: Localized;
  description: Localized;
  keywords: { ar: string[]; en: string[] };
  intro?: Localized;
  paymentMethods?: Localized;
  pricingNote?: Localized;
  faqs?: SeoFaq[];
  testimonials?: { name: string; text: Localized; date: string }[];
  serviceSlugs: string[];
  ctaText?: Localized;
  ogImage?: string;
  isActive: boolean;
}

export interface SeoSeasonalPage {
  _id: string;
  updatedAt?: string;
  slug: string;
  platform: SeoPlatform;
  name: Localized;
  title: Localized;
  description: Localized;
  keywords: { ar: string[]; en: string[] };
  intro?: Localized;
  content?: Localized;
  seasonNote?: Localized;
  featuredServiceSlugs: string[];
  faqs?: SeoFaq[];
  ctaText?: Localized;
  ctaLink?: Localized;
  ogImage?: string;
  heroImage?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface SeoSettings {
  platform: 'manasik' | 'ghadaq';
  organizationName?: Localized;
  organizationLogo?: string;
  organizationSameAs?: string[];
  organizationContactPhone?: string;
  organizationContactEmail?: string;
  organizationKnowsAbout?: string[];
  organizationAlternateNames?: string[];
  organizationDescription?: Localized;
  organizationFounderName?: Localized;
  organizationFoundingDate?: string;
  organizationAddress?: { locality?: Localized; country?: string };
  defaultOgImage?: string;
  structuredDataDefaults?: {
    areaServed: string[];
    serviceType: string[];
  };
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? (data.data as T) : null;
  } catch {
    return null;
  }
}

export async function getSeoServices(): Promise<SeoService[]> {
  const data = await fetchJson<SeoService[]>(
    `/api/seo/services?platform=${PLATFORM}`,
  );
  return data || [];
}

export async function getSeoService(slug: string): Promise<SeoService | null> {
  return fetchJson<SeoService>(
    `/api/seo/services/${encodeURIComponent(slug)}?platform=${PLATFORM}`,
  );
}

export async function getSeoBlogPosts(): Promise<SeoBlogPost[]> {
  const data = await fetchJson<SeoBlogPost[]>(
    `/api/seo/blog?platform=${PLATFORM}`,
  );
  return data || [];
}

export async function getSeoBlogPost(
  category: string,
  slug: string,
): Promise<SeoBlogPost | null> {
  return fetchJson<SeoBlogPost>(
    `/api/seo/blog/${encodeURIComponent(category)}/${encodeURIComponent(slug)}?platform=${PLATFORM}`,
  );
}

export async function getSeoAuthors(): Promise<SeoAuthor[]> {
  const data = await fetchJson<SeoAuthor[]>(`/api/seo/authors`);
  return data || [];
}

export async function getSeoAuthor(slug: string): Promise<SeoAuthor | null> {
  return fetchJson<SeoAuthor>(
    `/api/seo/authors/${encodeURIComponent(slug)}`,
  );
}

export async function getSeoReviews(serviceSlug?: string): Promise<SeoReview[]> {
  const params = new URLSearchParams({ platform: PLATFORM });
  if (serviceSlug) params.set('serviceSlug', serviceSlug);
  const data = await fetchJson<SeoReview[]>(`/api/seo/reviews?${params}`);
  return data || [];
}

export async function getSeoCountries(): Promise<SeoCountryHub[]> {
  const data = await fetchJson<SeoCountryHub[]>(
    `/api/seo/countries?platform=${PLATFORM}`,
  );
  return data || [];
}

export async function getSeoCountry(
  slug: string,
): Promise<SeoCountryHub | null> {
  return fetchJson<SeoCountryHub>(
    `/api/seo/countries/${encodeURIComponent(slug)}?platform=${PLATFORM}`,
  );
}

export async function getSeasonalPages(): Promise<SeoSeasonalPage[]> {
  const data = await fetchJson<SeoSeasonalPage[]>(
    `/api/seo/seasonal?platform=${PLATFORM}`,
  );
  return data || [];
}

export async function getSeasonalPage(
  slug: string,
): Promise<SeoSeasonalPage | null> {
  return fetchJson<SeoSeasonalPage>(
    `/api/seo/seasonal/${encodeURIComponent(slug)}?platform=${PLATFORM}`,
  );
}

export async function getSeoSettings(): Promise<SeoSettings | null> {
  const data = await fetchJson<SeoSettings[]>(
    `/api/seo/settings?platform=${PLATFORM}`,
  );
  return data?.find((s) => s.platform === PLATFORM) || null;
}

/** Resolve a country hub from its slug or ISO code (active hubs only). */
export async function resolveCountryHub(
  param: string,
): Promise<SeoCountryHub | null> {
  const needle = param.toLowerCase();
  const hubs = await getSeoCountries();
  return (
    hubs.find(
      (h) =>
        h.isActive &&
        (h.slug === needle || h.countryCode.toLowerCase() === needle),
    ) || null
  );
}

export interface SeoProductSummary {
  slug: string;
  name: Localized;
}

async function getProductSummaries(): Promise<SeoProductSummary[]> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/products?platform=${PLATFORM}&limit=200`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const products: SeoProductSummary[] = data.success
      ? data.data.products
      : [];
    return products.filter((p) => p.slug);
  } catch {
    return [];
  }
}

/** Products referenced by slug, in the admin-defined order. */
export async function getLinkedProducts(
  slugs: string[],
): Promise<SeoProductSummary[]> {
  if (!slugs.length) return [];
  const bySlug = new Map(
    (await getProductSummaries()).map((p) => [p.slug, p]),
  );
  return slugs
    .map((s) => bySlug.get(s))
    .filter((p): p is SeoProductSummary => Boolean(p));
}

/** The active service whose `linkedProductSlugs` contains this product. */
export async function getServiceForProduct(
  productSlug: string,
): Promise<SeoService | null> {
  const services = await getSeoServices();
  return (
    services.find(
      (s) => s.isActive && s.linkedProductSlugs?.includes(productSlug),
    ) || null
  );
}

/**
 * Pick the localized string for the rendered locale. No cross-language
 * fallback: an /en/ page must never render Arabic copy (and vice versa).
 */
export function pick(value: Localized | undefined, locale: string): string {
  if (!value) return '';
  return value[locale as 'ar' | 'en'] || '';
}

/**
 * Like `pick`, but falls back to the other language. Only for verbatim
 * customer quotes (reviews, testimonials), which exist in one language.
 */
export function pickAny(value: Localized | undefined, locale: string): string {
  if (!value) return '';
  return value[locale as 'ar' | 'en'] || value.ar || value.en || '';
}

/** A dashboard «eye» preview (owner, 2026-10-12): never cached, never indexed. */
export interface SeoPreview {
  entity: 'blog';
  platform: SeoPlatform;
  doc: Record<string, unknown>;
  updatedAt?: string;
}

export async function getSeoPreview(token: string): Promise<SeoPreview | null> {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  try {
    const res = await fetch(`${BACKEND_URL}/api/seo/preview/${token}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.success ? (json.data as SeoPreview) : null;
  } catch {
    return null;
  }
}
