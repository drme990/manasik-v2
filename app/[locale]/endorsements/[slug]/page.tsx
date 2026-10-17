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
import { getEndorsementVideos, type EndorsementVideo } from '@/lib/seo-content';
import { SITE_URL } from '@/lib/site';

/**
 * One page per sheikh's endorsement (owner, 2026-10-17): the video and every word of its approved transcript, so
 * the video can appear in Google's video results and AI assistants can cite it. Managed from the dashboard's SEO
 * section («التزكيات»): a language's page exists only once it is published there with its words approved. The
 * Arabic page's visible text was approved by the owner on 2026-10-17 (06:40).
 */
export const revalidate = 300;
export const dynamicParams = true;

type Loc = 'ar' | 'en';

const TEXT = {
  ar: { audio: 'تزكية صوتية', video: 'تزكية بالفيديو', transcript: 'نص التزكية', others: 'تزكيات أخرى', title: (s: string) => `تزكية ${s}`, translated: '' },
  en: {
    audio: 'Audio endorsement',
    video: 'Video endorsement',
    transcript: 'What he says',
    others: 'Other endorsements',
    title: (s: string) => `Endorsement by ${s}`,
    translated: 'Translated from Arabic; the recording is in Arabic.',
  },
} as const;

async function find(locale: string, slug: string) {
  if (locale !== 'ar' && locale !== 'en') return null;
  const all = await getEndorsementVideos();
  const item = all.find((entry) => entry.slug === slug);
  const words = item?.locales[locale as Loc];
  if (!item || !words) return null;
  const others = all.filter((entry) => entry.slug !== slug && entry.locales[locale as Loc]);
  return { item, words, others };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const found = await find(locale, slug);
  if (!found) return { robots: { index: false, follow: false } };
  const { item, words } = found;
  const t = TEXT[locale as Loc];
  const path = `/endorsements/${slug}`;
  const base = await getSeoMetadata({
    locale,
    path,
    title: `${t.title(words.speaker)} | ${brandName(locale)}`,
    description:
      locale === 'ar'
        ? `${item.kind === 'audio' ? t.audio : t.video} من ${words.speaker} لمناسك، مع النص كاملًا.`
        : `${item.kind === 'audio' ? t.audio : t.video} of Manasik by ${words.speaker}, with what he says in full.`,
  });
  // Only the languages that are published point to each other.
  const languages: Record<string, string> = {};
  for (const loc of ['ar', 'en'] as const) if (item.locales[loc]) languages[loc] = `${SITE_URL}/${loc}${path}`;
  languages['x-default'] = languages.ar ?? languages.en;
  return { ...base, alternates: { canonical: `${SITE_URL}/${locale}${path}`, languages } };
}

export default async function EndorsementPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const found = await find(locale, slug);
  if (!found) notFound();
  const { item, words, others } = found;
  const t = TEXT[locale as Loc];
  const tc = await getTranslations('seoPages.common');
  const title = t.title(words.speaker);
  const url = `${SITE_URL}/${locale}/endorsements/${slug}`;
  const paragraphs = words.transcript.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const kindLabel = item.kind === 'audio' ? t.audio : t.video;

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'VideoObject',
          name: locale === 'ar' ? `${title} لمناسك` : `${title} for Manasik`,
          description: `${kindLabel} — ${words.transcript.replace(/\s+/g, ' ').slice(0, 200)}…`,
          ...(item.image ? { thumbnailUrl: [item.image] } : {}),
          contentUrl: item.video,
          ...(item.uploadDate ? { uploadDate: item.uploadDate } : {}),
          inLanguage: 'ar',
          transcript: words.transcript,
          url,
          mainEntityOfPage: url,
          publisher: { '@id': `${SITE_URL}/#organization` },
          about: { '@id': `${SITE_URL}/#organization` },
        }}
      />
      <JsonLd data={buildBreadcrumbSchema(locale, [{ name: tc('home'), path: '/' }, { name: title, path: `/endorsements/${slug}` }], SITE_URL)} />
      <PageShell narrow>
        <Breadcrumb items={[{ label: tc('home'), href: '/' }, { label: title }]} />
        <PageHeader title={title} description={kindLabel} align="start" />

        <div className="mx-auto mb-10 w-full max-w-sm overflow-hidden rounded-site border border-stroke bg-black">
          <video
            src={item.video}
            {...(item.image ? { poster: item.image } : {})}
            controls
            playsInline
            preload="metadata"
            className="aspect-[9/16] h-auto w-full object-contain"
            aria-label={title}
          />
        </div>

        <section className="rounded-site border border-stroke bg-card-bg p-6 md:p-8">
          <h2 className="mb-4 text-xl font-bold text-foreground md:text-2xl">{t.transcript}</h2>
          {words.translated && t.translated ? <p className="mb-4 text-sm text-secondary">{t.translated}</p> : null}
          <div dir="auto" className="space-y-4 leading-loose text-secondary">
            {paragraphs.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </section>

        {others.length > 0 ? (
          <nav aria-label={t.others} className="mt-10">
            <h2 className="mb-4 text-xl font-bold text-foreground">{t.others}</h2>
            <ul className="space-y-3">
              {others.map((other) => (
                <li key={other.slug}>
                  <Link href={`/endorsements/${other.slug}`} className="block rounded-site border border-stroke bg-card-bg p-4 font-bold text-foreground transition-colors hover:border-success">
                    {t.title(other.locales[locale as Loc]!.speaker)}
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
