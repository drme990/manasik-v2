import { Link } from '@/i18n/routing';
import type { SeoService } from '@/lib/seo-content';
import { pick } from '@/lib/seo-content';

export default function ServiceCard({
  service,
  locale,
  ctaLabel,
}: {
  service: SeoService;
  locale: string;
  ctaLabel: string;
}) {
  const name = pick(service.name, locale);
  const intro = pick(service.intro, locale) || pick(service.description, locale);

  return (
    <Link
      href={`/services/${service.slug}`}
      className="group block bg-card-bg border border-stroke rounded-site p-6 hover:border-success transition-colors"
    >
      <h2 className="text-xl font-bold text-foreground group-hover:text-success transition-colors mb-2">
        {name}
      </h2>
      {intro && (
        <p className="text-secondary text-sm leading-relaxed line-clamp-3 mb-4">
          {intro.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}
        </p>
      )}
      <span className="text-success text-sm font-medium">
        {ctaLabel} {locale === 'ar' ? '←' : '→'}
      </span>
    </Link>
  );
}
