import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getStaticPageText } from '@/lib/static-pages';
import { Mail, MessageCircle } from 'lucide-react';
import Breadcrumb from '@/components/seo/breadcrumb';
import JsonLd from '@/components/seo/json-ld';
import PageHeader from '@/components/seo/page-header';
import PageShell from '@/components/seo/page-shell';
import { brandName, buildBreadcrumbSchema, getSeoMetadata } from '@/lib/seo';
import { getSeoSettings } from '@/lib/seo-content';
import { SITE_URL } from '@/lib/site';

const NS = 'seoPages.contact';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [t, db] = await Promise.all([
    getTranslations({ locale, namespace: NS }),
    getStaticPageText('contact', locale),
  ]);

  return getSeoMetadata({
    locale,
    path: '/contact',
    title: `${db.title ?? t('pageTitle')} | ${brandName(locale)}`,
    description: db.description ?? t('pageDescription'),
  });
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, tc, settings, db] = await Promise.all([
    getTranslations({ locale, namespace: NS }),
    getTranslations({ locale, namespace: 'seoPages.common' }),
    getSeoSettings(),
    getStaticPageText('contact', locale),
  ]);
  const pageTitle = db.title ?? t('pageTitle');
  const pageDescription = db.description ?? t('pageDescription');

  const email = settings?.organizationContactEmail || 'manasiksales@gmail.com';
  // No phone number shown anywhere on the site (owner, 2026-10-12): the WhatsApp
  // card opens the chat without printing the number.
  const whatsapp = (settings?.organizationContactPhone || '+201027282396').replace(/[^0-9]/g, '');
  const orgName =
    settings?.organizationName?.[locale as 'ar' | 'en'] || brandName(locale);

  const contactJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: pageTitle,
    url: `${SITE_URL}/${locale}/contact`,
    mainEntity: {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: orgName,
      email,
      url: SITE_URL,
    },
  };

  const channels = [
    { label: t('email'), value: email, href: `mailto:${email}`, icon: Mail },
    {
      label: t('whatsapp'),
      value: t('whatsappCta'),
      href: `https://wa.me/${whatsapp}`,
      icon: MessageCircle,
      external: true,
    },
  ];

  return (
    <>
      <JsonLd data={contactJsonLd} />
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: pageTitle, path: '/contact' },
          ],
          SITE_URL,
        )}
      />
      <PageShell narrow>
        <Breadcrumb items={[{ label: tc('home'), href: '/' }, { label: pageTitle }]} />
        <PageHeader
          title={pageTitle}
          description={pageDescription}
          align="start"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {channels.map(({ label, value, href, icon: Icon, external }) => (
            <a
              key={label}
              href={href}
              {...(external
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
              className="group flex flex-col items-center gap-3 rounded-site border border-stroke bg-card-bg p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-success/40 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)]"
            >
              <span className="gradient-site flex h-14 w-14 items-center justify-center rounded-full text-white">
                <Icon size={24} aria-hidden="true" />
              </span>
              <h2 className="font-bold text-foreground">{label}</h2>
              <span
                className="break-all text-sm font-medium text-success"
                dir="ltr"
              >
                {value}
              </span>
            </a>
          ))}
        </div>
      </PageShell>
    </>
  );
}
