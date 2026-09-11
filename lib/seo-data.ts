// Server-side data fetchers for SEO structured data.
// These fetch from the backend API so that JSON-LD can be
// server-rendered with real content (matching visible UI).

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

type Faq = {
  id: string;
  question: { ar: string; en: string };
  answer: { ar: string; en: string };
  platform: 'ghadaq' | 'manasik' | 'shared';
  showOnProductDetails: boolean;
};

type AppearanceData = {
  faqs?: Faq[];
};

/**
 * Fetch appearance FAQs from the backend and return them
 * in the locale the page is rendering.
 * Used for FAQPage JSON-LD on the home page.
 */
export async function getAppearanceFaqs(
  platform: 'manasik' | 'ghadaq',
  locale: string,
): Promise<{ question: string; answer: string }[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/appearance`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as AppearanceData;
    const faqs = data.faqs || [];

    return faqs
      .filter((faq) => faq.platform === platform || faq.platform === 'shared')
      .map((faq) => ({
        question: locale === 'ar' ? faq.question.ar : faq.question.en,
        answer: locale === 'ar' ? faq.answer.ar : faq.answer.en,
      }))
      .filter((faq) => faq.question && faq.answer);
  } catch {
    return [];
  }
}
