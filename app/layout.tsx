import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import localFont from 'next/font/local';
import OurThemeProvider from '@/components/providers/theme-provider';
import { CurrencyProvider } from '@/components/providers/currency-provider';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';

// Roboto font for English
const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

// ExpoArabic font for Arabic
const expoArabic = localFont({
  src: [
    {
      path: '../public/fonts/ExpoArabic-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../public/fonts/ExpoArabic-Book.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/ExpoArabic-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/ExpoArabic-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/fonts/ExpoArabic-Bold.otf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-expo-arabic',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.manasik.net'),
  title: {
    default: 'مؤسسة مناسك | أداء الشعائر والنُسك بالوكالة الشرعية',
    template: '%s | مؤسسة مناسك',
  },
  description:
    'مؤسسة مناسك - نُؤدي عنك بالوكالة الشرعية: عمرة البدل، حج البدل، العقيقة، الأضاحي، النذر، الصدقة، حفر الآبار ووصلات المياه. التزام شرعي، جودة عالية، وتوثيق احترافي يطمئن القلب.',
  keywords: [
    'مناسك',
    'عمرة البدل',
    'حج البدل',
    'العقيقة',
    'الأضاحي',
    'النذر',
    'الصدقة',
    'حفر الآبار',
    'وكالة شرعية',
    'تنفيذ الشعائر',
    'manasik',
    'umrah by proxy',
    'hajj by proxy',
    'aqiqah',
    'sacrifice',
    'charity',
  ],
  authors: [{ name: 'مؤسسة مناسك' }],
  creator: 'مؤسسة مناسك',
  publisher: 'مؤسسة مناسك',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ar_SA',
    alternateLocale: ['en_US'],
    url: 'https://www.manasik.net',
    siteName: 'مؤسسة مناسك',
    title: 'مؤسسة مناسك | أداء الشعائر والنُسك بالوكالة الشرعية',
    description:
      'نُؤدي عنك بالوكالة الشرعية: عمرة البدل، حج البدل، العقيقة، الأضاحي، النذر، الصدقة، حفر الآبار. التزام شرعي وتوثيق احترافي.',
    images: [
      {
        url: '/logo-light.png',
        width: 1200,
        height: 630,
        alt: 'مؤسسة مناسك',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'مؤسسة مناسك | أداء الشعائر والنُسك بالوكالة الشرعية',
    description:
      'نُؤدي عنك بالوكالة الشرعية: عمرة البدل، حج البدل، العقيقة، الأضاحي، النذر، الصدقة، حفر الآبار. التزام شرعي وتوثيق احترافي.',
    images: ['/logo-light.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'android-chrome-192x192',
        url: '/android-chrome-192x192.png',
      },
      {
        rel: 'android-chrome-512x512',
        url: '/android-chrome-512x512.png',
      },
    ],
  },
  manifest: '/site.webmanifest',
  verification: {
    google: 'your-google-verification-code',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  const fontClass = locale === 'ar' ? expoArabic.variable : roboto.variable;

  return (
    <html
      data-scroll-behavior="smooth"
      lang={locale}
      dir={direction}
      suppressHydrationWarning
      className={fontClass}
    >
      <body
        className={`antialiased ${locale === 'ar' ? 'font-expo-arabic' : 'font-roboto'}`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <OurThemeProvider>
            <CurrencyProvider>{children}</CurrencyProvider>
          </OurThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
