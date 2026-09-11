import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getSeoMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo.calcAqeqa' });

  return getSeoMetadata({
    locale,
    path: '/calc-aqeqa',
    title: t('title'),
    description: t('description'),
    keywords: [
      'حاسبة العقيقة',
      'عقيقة',
      'عقيقة الأولاد',
      'ذبيحة العقيقة',
      'عدد الذبائح',
      'مؤسسة مناسك',
      'aqiqah calculator',
      'aqiqah',
      'how many animals for aqiqah',
    ],
    openGraph: {
      title: t('title'),
      description: t('description'),
      siteName: 'Manasik',
      type: 'website',
    },
  });
}

export default function CalcAqeqaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
