import { ChevronDown } from 'lucide-react';
import JsonLd from './json-ld';
import HtmlContent from './html-content';
import { buildFaqSchema } from '@/lib/seo';
import type { SeoFaq } from '@/lib/seo-content';
import { pick } from '@/lib/seo-content';

const toText = (html: string) =>
  html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// Visible FAQ accordion + FAQPage JSON-LD built from the same data, so the
// markup always matches what is on screen. <details> keeps answers in the
// HTML (crawlable) while collapsed. Render ONE FaqSection per page.
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
    <section className="mt-14">
      <h2 className="mb-6 text-2xl font-bold text-foreground">{heading}</h2>
      <JsonLd
        data={buildFaqSchema(
          items.map((f) => ({ question: f.question, answer: toText(f.answer) })),
        )}
      />
      <div className="space-y-3">
        {items.map((faq, i) => (
          <details
            key={i}
            className="group rounded-site border border-stroke bg-card-bg transition-colors open:border-success/40"
            open={i === 0}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
              <h3 className="text-base font-semibold text-foreground">
                {faq.question}
              </h3>
              <ChevronDown
                size={18}
                aria-hidden="true"
                className="shrink-0 text-secondary transition-transform duration-300 group-open:rotate-180 group-open:text-success"
              />
            </summary>
            <div className="px-5 pb-5">
              <HtmlContent html={faq.answer} className="text-sm text-secondary" />
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
