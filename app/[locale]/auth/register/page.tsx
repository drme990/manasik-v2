import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import RegisterPage from './_client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo.register' });

  return {
    title: { absolute: t('title') },
    description: t('description'),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function Page() {
  return <RegisterPage />;
}
