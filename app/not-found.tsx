import Link from 'next/link';
import Container from '@/components/layout/container';
import { getTranslations, getLocale } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  const locale = await getLocale();
  const isRtl = locale === 'ar';

  return (
    <div
      className="grid-bg min-h-screen flex flex-col"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Not Found Content */}
      <main className="flex-1 flex items-center justify-center">
        <Container>
          <div className="max-w-lg mx-auto text-center py-16">
            {/* 404 Number */}
            <div className="relative mb-8">
              <span className="text-[10rem] leading-none font-black text-success/10 select-none">
                404
              </span>
            </div>

            {/* Message */}
            <h1 className="text-2xl md:text-3xl font-bold mb-4">
              {t('title')}
            </h1>
            <p className="text-secondary text-lg mb-10">{t('message')}</p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-success text-white font-medium rounded-site hover:bg-success/90 transition-colors"
              >
                {t('backHome')}
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border text-foreground font-medium rounded-site hover:bg-card-bg transition-colors"
              >
                {t('browseProducts')}
              </Link>
            </div>
          </div>
        </Container>
      </main>

      {/* Simple footer */}
      <footer className="py-6 text-center text-secondary text-sm">
        <Container>
          <p>
            © {new Date().getFullYear()} {t('copyright')}
          </p>
        </Container>
      </footer>
    </div>
  );
}
