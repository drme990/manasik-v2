import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import BackButton from '@/components/shared/back-button';
import Button from '@/components/ui/button';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Construction } from 'lucide-react';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('landing.calcAqeqa');

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: 'https://www.manasik.net/calc-aqeqa',
    },
  };
}

export default async function CalcAqeqaPage() {
  const t = await getTranslations('landing.calcAqeqa');
  const tCommon = await getTranslations('common');

  return (
    <>
      <Header />
      <main className="grid-bg min-h-screen">
        <Container className="py-8">
          <BackButton className="mb-6" />

          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-card-bg border border-stroke rounded-site p-8 md:p-12 space-y-6">
              <Construction className="w-14 h-14 text-warning mx-auto" />

              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {t('title')}
                </h1>
                <p className="text-lg font-semibold text-success">
                  {t('comingSoon')} — {t('underConstruction')}
                </p>
              </div>

              <p className="text-secondary leading-relaxed">
                {t('underConstructionDesc')}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button variant="primary" size="lg" href="/">
                  {tCommon('buttons.backToHome')}
                </Button>
                <Button variant="outline" size="lg" href="/products">
                  {t('browseProducts')}
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
      <GoToTop />
      <WhatsAppButton />
    </>
  );
}
