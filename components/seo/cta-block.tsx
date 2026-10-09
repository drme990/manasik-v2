import { Link } from '@/i18n/routing';
import Button from '@/components/ui/button';

export default function CtaBlock({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  subtitle?: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <section className="mt-10 bg-card-bg border border-stroke rounded-site p-8 text-center">
      <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
      {subtitle && (
        <p className="text-secondary mb-5 max-w-xl mx-auto">{subtitle}</p>
      )}
      <Link href={ctaHref}>
        <Button size="lg">{ctaLabel}</Button>
      </Link>
    </section>
  );
}
