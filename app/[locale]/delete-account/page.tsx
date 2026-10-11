import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import BackButton from '@/components/shared/back-button';
import WhatsAppButton from '@/components/shared/whats-app-button';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getSeoMetadata } from '@/lib/seo';
import DeleteAccountPanel from './_client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'deleteAccount' });
  const brandName = locale === 'ar' ? 'مناسك' : 'Manasik';

  return getSeoMetadata({
    locale,
    path: '/delete-account',
    title: `${t('pageTitle')} | ${brandName}`,
    description: t('intro'),
  });
}

/**
 * How a customer deletes his account (the web link Google Play asks for, and
 * the page the privacy policy names). Signed in, he deletes it here; signed
 * out, he signs in first or writes to us.
 */
export default async function DeleteAccountPage() {
  const t = await getTranslations('deleteAccount');

  return (
    <>
      <Header />
      <main className="grid-bg min-h-screen">
        <Container className="py-8">
          <BackButton className="mb-6" />
          <div className="mx-auto max-w-2xl space-y-6">
            <h1 className="text-4xl font-bold text-foreground">{t('pageTitle')}</h1>
            <p className="text-foreground leading-relaxed">{t('intro')}</p>
            <div>
              <h2 className="text-xl font-semibold text-success mb-3">{t('whatTitle')}</h2>
              <p className="text-foreground leading-relaxed">{t('what')}</p>
            </div>
            <DeleteAccountPanel />
          </div>
        </Container>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
