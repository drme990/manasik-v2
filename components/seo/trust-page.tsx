import { getTranslations } from 'next-intl/server';
import {
  Camera,
  Euro,
  Info,
  ListChecks,
  Mail,
  ShieldCheck,
  Star,
} from 'lucide-react';
import Breadcrumb from './breadcrumb';
import CtaBlock from './cta-block';
import JsonLd from './json-ld';
import LinkTile from './link-tile';
import PageHeader from './page-header';
import PageShell from './page-shell';
import { buildBreadcrumbSchema } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';

// Trust / E-E-A-T pages share one layout: H1, content blocks (or numbered
// steps), a CTA, and cross-links to the other trust pages for internal
// linking.
const TRUST_PAGES = [
  { path: '/about', ns: 'about', icon: Info },
  { path: '/how-it-works', ns: 'howItWorks', icon: ListChecks },
  { path: '/documentation', ns: 'documentation', icon: Camera },
  { path: '/sharia-compliance', ns: 'shariaCompliance', icon: ShieldCheck },
  { path: '/payment-from-europe', ns: 'paymentFromEurope', icon: Euro },
  { path: '/reviews', ns: 'reviews', icon: Star },
  { path: '/contact', ns: 'contact', icon: Mail },
] as const;

export default async function TrustPage({
  locale,
  path,
  title,
  description,
  items,
  numbered = false,
  jsonLd,
}: {
  locale: string;
  path: string;
  title: string;
  description?: string;
  items: { h: string; p: string }[];
  numbered?: boolean;
  jsonLd?: object;
}) {
  const [tc, tp] = await Promise.all([
    getTranslations('seoPages.common'),
    getTranslations('seoPages'),
  ]);
  const related = TRUST_PAGES.filter((p) => p.path !== path);

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: title, path },
          ],
          SITE_URL,
        )}
      />
      <PageShell narrow>
        <Breadcrumb items={[{ label: tc('home'), href: '/' }, { label: title }]} />
        <PageHeader title={title} description={description} align="start" />

        {numbered ? (
          <ol className="relative space-y-4">
            {items.map((step, i) => (
              <li
                key={i}
                className="flex gap-5 rounded-site border border-stroke bg-card-bg p-6"
              >
                <span className="gradient-site flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h2 className="mb-2 text-xl font-bold text-foreground">
                    {step.h}
                  </h2>
                  <p className="leading-relaxed text-secondary">{step.p}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="space-y-4">
            {items.map((s, i) => (
              <section
                key={i}
                className="rounded-site border border-stroke bg-card-bg p-6 md:p-8"
              >
                <h2 className="mb-3 text-xl font-bold text-foreground md:text-2xl">
                  {s.h}
                </h2>
                <p className="leading-relaxed text-secondary">{s.p}</p>
              </section>
            ))}
          </div>
        )}

        <CtaBlock
          title={tc('ctaTitle')}
          subtitle={tc('ctaSubtitle')}
          ctaLabel={tc('browseServices')}
          ctaHref="/services"
        />

        <nav aria-label={tc('exploreMore')} className="mt-14">
          <h2 className="mb-5 text-xl font-bold text-foreground">
            {tc('exploreMore')}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {related.map(({ path: href, ns, icon: Icon }) => (
              <LinkTile
                key={href}
                href={href}
                label={tp(`${ns}.pageTitle`)}
                icon={<Icon size={20} aria-hidden="true" />}
              />
            ))}
          </div>
        </nav>
      </PageShell>
    </>
  );
}
