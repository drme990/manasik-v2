import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'حاسبة العقيقة',
  description:
    'احسب عدد الذبائح المطلوبة للعقيقة بسهولة - حاسبة مؤسسة مناسك لتحديد عدد الأضاحي حسب عدد الأولاد الذكور والإناث. خدمة عقيقة موثوقة بالوكالة الشرعية.',
  keywords: [
    'حاسبة العقيقة',
    'عقيقة',
    'عقيقة الأولاد',
    'ذبيحة العقيقة',
    'عدد الذبائح',
    'مؤسسة مناسك',
    'aqiqah calculator',
    'aqiqah',
  ],
  alternates: {
    canonical: 'https://www.manasik.net/calc-aqeqa',
  },
  openGraph: {
    title: 'حاسبة العقيقة | مؤسسة مناسك',
    description:
      'احسب عدد الذبائح المطلوبة للعقيقة بسهولة - خدمة عقيقة موثوقة بالوكالة الشرعية.',
    url: 'https://www.manasik.net/calc-aqeqa',
    type: 'website',
  },
};

export default function CalcAqeqaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
