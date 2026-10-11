import HtmlContent from './html-content';
import type { SeoService } from '@/lib/seo-content';
import { pick } from '@/lib/seo-content';

// Renders the admin-managed page sections of a service, in saved order.
// Sections without content are skipped.
export default function ServiceContent({
  service,
  locale,
}: {
  service: SeoService;
  locale: string;
}) {
  const intro = pick(service.intro, locale);
  const sections = (service.sections || [])
    .map((section) => ({
      title: pick(section.title, locale),
      html: pick(section.content, locale),
    }))
    .filter((section) => section.html);

  if (!intro && !sections.length) return null;

  return (
    <div className="space-y-10">
      {intro && (
        <HtmlContent html={intro} className="text-lg text-secondary" />
      )}
      {sections.map((section, i) => (
        <section
          key={i}
          className={section.title ? 'border-t border-stroke/30 pt-8' : undefined}
        >
          {section.title && (
            <h2 className="mb-4 text-2xl font-bold text-foreground">
              {section.title}
            </h2>
          )}
          <HtmlContent html={section.html} />
        </section>
      ))}
    </div>
  );
}
