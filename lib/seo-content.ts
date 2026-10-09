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
  slug: string;
  platform: SeoPlatform;
  name: Localized;
  title: Localized;
  description: Localized;
  keywords: { ar: string[]; en: string[] };
  intro?: Localized;
  whoIsItFor?: Localized;
  shariaConditions?: Localized;
  process?: Localized;
  documentation?: Localized;
  timeline?: Localized;
  pricing?: Localized;
  whyChooseUs?: Localized;
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
}

export interface SeoSettings {
  platform: 'manasik' | 'ghadaq';
  organizationName?: Localized;
  organizationLogo?: string;
  organizationSameAs?: string[];
  organizationContactPhone?: string;
  organizationContactEmail?: string;
  organizationKnowsAbout?: string[];
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

export async function getSeoSettings(): Promise<SeoSettings | null> {
  const data = await fetchJson<SeoSettings[]>(
    `/api/seo/settings?platform=${PLATFORM}`,
  );
  return data?.find((s) => s.platform === PLATFORM) || null;
}

/** Pick the localized string for the rendered locale, Arabic fallback. */
export function pick(value: Localized | undefined, locale: string): string {
  if (!value) return '';
  return value[locale as 'ar' | 'en'] || value.ar || '';
}
