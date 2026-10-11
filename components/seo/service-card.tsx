import { HandHeart } from 'lucide-react';
import ContentCard from './content-card';
import type { SeoService } from '@/lib/seo-content';
import { pick } from '@/lib/seo-content';

export default function ServiceCard({
  service,
  locale,
  ctaLabel,
  href,
  as = 'h2',
}: {
  service: SeoService;
  locale: string;
  ctaLabel: string;
  href?: string;
  as?: 'h2' | 'h3';
}) {
  return (
    <ContentCard
      href={href || `/services/${service.slug}`}
      title={pick(service.name, locale)}
      description={pick(service.description, locale) || pick(service.intro, locale)}
      image={service.heroImage || service.ogImage}
      fallback={<HandHeart size={44} strokeWidth={1.5} aria-hidden="true" />}
      ctaLabel={ctaLabel}
      as={as}
    />
  );
}
