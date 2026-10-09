import JsonLd from './json-ld';
import HtmlContent from './html-content';
import { buildFaqSchema } from '@/lib/seo';
import type { SeoFaq } from '@/lib/seo-content';
import { pick } from '@/lib/seo-content';

// Visible FAQ list + FAQPage JSON-LD built from the same data,
// so markup always matches what is on screen.
export default function FaqSection({
  faqs,
  locale,
  heading,
}: {
  faqs: SeoFaq[] | undefined;
  locale: string;
  heading: string;
}) {
  const items = (faqs || [])
    .map((f) => ({
      question: pick(f.question, locale),
      answer: pick(f.answer, locale),
    }))
    .filter((f) => f.question && f.answer);

  if (!items.length) return null;

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-bold text-foreground mb-5">{heading}</h2>
      <JsonLd data={buildFaqSchema(items)} />
      <div className="space-y-4">
        {items.map((faq, i) => (
          <div
            key={i}
            className="bg-card-bg border border-stroke rounded-site p-5"
          >
            <h3 className="text-base font-bold text-foreground mb-2">
              {faq.question}
            </h3>
            <HtmlContent
              html={faq.answer}
              className="text-secondary text-sm"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
