/**
 * The fixed pages' texts from the dashboard's SEO section (owner, 2026-10-12):
 * About, How it works, Sharia commitment, Documentation, Paying from Europe,
 * Contact, and the homepage's Google title and description.
 *
 * Behind the switch «static-pages-from-dashboard» (restore points page). With
 * it off, or when the backend cannot be reached, or when a text is empty, the
 * page shows the text written in messages/*.json exactly as before.
 */
import { getSiteSwitch } from '@/lib/site-switches';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const PLATFORM = 'manasik';

export type StaticPageKey =
  | 'home'
  | 'about'
  | 'howItWorks'
  | 'shariaCompliance'
  | 'documentation'
  | 'paymentFromEurope'
  | 'contact'
  | 'services'
  | 'blog'
  | 'authors'
  | 'countries'
  | 'seasonal'
  | 'reviews';

type Localized = { ar?: string; en?: string };
interface StaticPageDoc {
  key: StaticPageKey;
  pageTitle?: Localized;
  pageDescription?: Localized;
  items?: Array<{ h?: Localized; p?: Localized }>;
}

export interface StaticPageText {
  title?: string;
  description?: string;
  /** Only when every item has both a heading and a text in this language. */
  items?: { h: string; p: string }[];
}

export async function getStaticPageText(key: StaticPageKey, locale: string): Promise<StaticPageText> {
  try {
    if (!(await getSiteSwitch('static-pages-from-dashboard'))) return {};
    const res = await fetch(`${BACKEND_URL}/api/seo/static-pages?platform=${PLATFORM}&key=${key}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return {};
    const data = await res.json();
    const doc = (data?.success ? (data.data as StaticPageDoc[])?.[0] : null) || null;
    if (!doc) return {};
    const lang = locale === 'ar' ? 'ar' : 'en';
    const items = (doc.items || []).map((i) => ({ h: (i.h?.[lang] || '').trim(), p: (i.p?.[lang] || '').trim() }));
    return {
      title: doc.pageTitle?.[lang]?.trim() || undefined,
      description: doc.pageDescription?.[lang]?.trim() || undefined,
      items: items.length && items.every((i) => i.h && i.p) ? items : undefined,
    };
  } catch {
    return {};
  }
}
