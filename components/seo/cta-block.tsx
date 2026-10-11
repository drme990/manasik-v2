'use client';

import Button from '@/components/ui/button';
import { gtmEvent } from '@/lib/gtm';

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
    <section className="relative mt-14 overflow-hidden rounded-site border border-success/30 bg-success/5 px-6 py-10 text-center md:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 start-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-success/15 blur-3xl rtl:translate-x-1/2"
      />
      <h2 className="relative text-2xl font-bold text-foreground md:text-3xl">
        {title}
      </h2>
      {subtitle && (
        <p className="relative mx-auto mt-3 max-w-xl leading-relaxed text-secondary">
          {subtitle}
        </p>
      )}
      <Button
        href={ctaHref}
        size="lg"
        className="relative mx-auto mt-6 w-fit"
        onClick={() =>
          gtmEvent('cta_click', { cta_label: ctaLabel, cta_href: ctaHref })
        }
      >
        {ctaLabel}
      </Button>
    </section>
  );
}
