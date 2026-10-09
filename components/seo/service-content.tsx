import HtmlContent from './html-content';
import type { SeoService } from '@/lib/seo-content';
import { pick } from '@/lib/seo-content';

// Renders the ordered body sections of a service money page.
// Sections without content are skipped.
export default function ServiceContent({
  service,
  locale,
  labels,
}: {
  service: SeoService;
  locale: string;
  labels: {
    whoIsItFor: string;
    shariaConditions: string;
    process: string;
    documentation: string;
    timeline: string;
    pricing: string;
    whyChooseUs: string;
  };
}) {
  const sections: { label: string; html: string }[] = [
    {
      label: labels.whoIsItFor,
      html: pick(service.whoIsItFor, locale),
    },
    {
      label: labels.shariaConditions,
      html: pick(service.shariaConditions, locale),
    },
    { label: labels.process, html: pick(service.process, locale) },
    {
      label: labels.documentation,
      html: pick(service.documentation, locale),
    },
    { label: labels.timeline, html: pick(service.timeline, locale) },
    { label: labels.pricing, html: pick(service.pricing, locale) },
    {
      label: labels.whyChooseUs,
      html: pick(service.whyChooseUs, locale),
    },
  ].filter((s) => s.html);

  const intro = pick(service.intro, locale);

  return (
    <div className="space-y-8">
      {intro && (
        <HtmlContent html={intro} className="text-lg text-secondary" />
      )}
      {sections.map((section) => (
        <section key={section.label}>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            {section.label}
          </h2>
          <HtmlContent html={section.html} />
        </section>
      ))}
    </div>
  );
}
