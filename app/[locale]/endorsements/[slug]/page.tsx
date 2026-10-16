import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import Breadcrumb from '@/components/seo/breadcrumb';
import CtaBlock from '@/components/seo/cta-block';
import JsonLd from '@/components/seo/json-ld';
import PageHeader from '@/components/seo/page-header';
import PageShell from '@/components/seo/page-shell';
import { brandName, buildBreadcrumbSchema, getSeoMetadata } from '@/lib/seo';
import { ENDORSEMENT_SLUGS, getEndorsementVideos, type EndorsementVideo } from '@/lib/seo-content';
import { SITE_URL } from '@/lib/site';

/**
 * One page per sheikh's endorsement (owner, 2026-10-17): the video and every word of its approved transcript, so
 * the video can appear in Google's video results and AI assistants can cite it. Arabic only — the words are
 * Arabic. Kept out of search engines (noindex, not in the sitemap) until the owner approves its visible text.
 */
const INDEXABLE = false;

export const revalidate = 300;

export function generateStaticParams() {
  return ENDORSEMENT_SLUGS.map((slug) => ({ locale: 'ar', slug }));
}

async function find(locale: string, slug: string): Promise<{ item: EndorsementVideo; others: EndorsementVideo[] } | null> {
  if (locale !== 'ar') return null;
  const all = await getEndorsementVideos();
  const item = all.find((entry) => entry.slug === slug);
  return item ? { item, others: all.filter((entry) => entry.slug !== slug) } : null;
}

const titleOf = (item: EndorsementVideo) => `تزكية ${item.speaker}`;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const found = await find(locale, slug);
  if (!found) return { robots: { index: false, follow: false } };
  const { item } = found;
  const path = `/endorsements/${slug}`;
  const base = await getSeoMetadata({
    locale,
    path,
    title: `${titleOf(item)} | ${brandName(locale)}`,
    description: `${item.kind === 'audio' ? 'تزكية صوتية' : 'تزكية بالفيديو'} من ${item.speaker} لمناسك، مع النص كاملًا.`,
  });
  return {
    ...base,
    // Arabic only: no English twin to point to.
    alternates: { canonical: `${SITE_URL}/ar${path}`, languages: { ar: `${SITE_URL}/ar${path}`, 'x-default': `${SITE_URL}/ar${path}` } },
    robots: INDEXABLE ? base.robots : { index: false, follow: true },
  };
}

export default async function EndorsementPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const found = await find(locale, slug);
  if (!found) notFound();
  const { item, others } = found;
  const tc = await getTranslations('seoPages.common');
  const title = titleOf(item);
  const url = `${SITE_URL}/ar/endorsements/${slug}`;
  const paragraphs = item.transcript.split(/\n\s*\n|\n/).map((line) => line.trim()).filter(Boolean);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'VideoObject',
          name: `${title} لمناسك`,
          description: `${item.kind === 'audio' ? 'تزكية صوتية' : 'تزكية بالفيديو'} من ${item.speaker}: ${item.transcript.replace(/\s+/g, ' ').slice(0, 200)}…`,
          thumbnailUrl: [item.image],
          contentUrl: item.video,
          ...(item.uploadDate ? { uploadDate: item.uploadDate } : {}),
          inLanguage: 'ar',
          transcript: item.transcript,
          url,
          mainEntityOfPage: url,
          publisher: { '@id': `${SITE_URL}/#organization` },
          about: { '@id': `${SITE_URL}/#organization` },
        }}
      />
      <JsonLd
        data={buildBreadcrumbSchema(locale, [{ name: tc('home'), path: '/' }, { name: title, path: `/endorsements/${slug}` }], SITE_URL)}
      />
      <PageShell narrow>
        <Breadcrumb items={[{ label: tc('home'), href: '/' }, { label: title }]} />
        <PageHeader title={title} description={item.kind === 'audio' ? 'تزكية صوتية' : 'تزكية بالفيديو'} align="start" />

        <div className="mx-auto mb-10 w-full max-w-sm overflow-hidden rounded-site border border-stroke bg-black">
          <video
            src={item.video}
            poster={item.image}
            controls
            playsInline
            preload="metadata"
            className="aspect-[9/16] h-auto w-full object-contain"
            aria-label={title}
          />
        </div>

        <section className="rounded-site border border-stroke bg-card-bg p-6 md:p-8">
          <h2 className="mb-4 text-xl font-bold text-foreground md:text-2xl">نص التزكية</h2>
          <div dir="auto" className="space-y-4 leading-loose text-secondary">
            {paragraphs.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </section>

        {others.length > 0 ? (
          <nav aria-label="تزكيات أخرى" className="mt-10">
            <h2 className="mb-4 text-xl font-bold text-foreground">تزكيات أخرى</h2>
            <ul className="space-y-3">
              {others.map((other) => (
                <li key={other.slug}>
                  <Link href={`/endorsements/${other.slug}`} className="block rounded-site border border-stroke bg-card-bg p-4 font-bold text-foreground transition-colors hover:border-success">
                    {titleOf(other)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <CtaBlock title={tc('ctaTitle')} subtitle={tc('ctaSubtitle')} ctaLabel={tc('browseServices')} ctaHref="/products" />
      </PageShell>
    </>
  );
}
