import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import BackButton from '@/components/shared/back-button';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('privacy');

  return {
    title: t('pageTitle'),
    description: `${t('pageTitle')} - ${t('companyName')}`,
    alternates: {
      canonical: 'https://www.manasik.net/privacy',
    },
  };
}

function PrivacyCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xl font-semibold text-success mb-3">{title}</h3>
      <p className="text-foreground leading-relaxed">{children}</p>
    </div>
  );
}

export default async function PrivacyPolicy() {
  const t = await getTranslations('privacy');

  return (
    <>
      <Header />
      <main className="grid-bg min-h-screen">
        <Container className="py-8">
          <BackButton className="mb-6" />
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              {t('pageTitle')}
            </h1>
            <h2 className="text-2xl font-semibold text-success">
              {t('companyName')}
            </h2>
          </div>

          <div className="space-y-6">
            {Array.from({ length: 10 }, (_, i) => (
              <PrivacyCard key={i} title={t(`sections.${i}.title`)}>
                {t(`sections.${i}.content`)}
              </PrivacyCard>
            ))}
          </div>
        </Container>
      </main>
      <Footer />
      <GoToTop />
      <WhatsAppButton />
    </>
  );
}
