import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Suspense } from 'react';
import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';

import MetaPixel from '@/components/shared/meta-pixel';
import GoogleTag from '@/components/shared/google-tag';
import TiktokPixel from '@/components/shared/tiktok-pixel';
import OpenAIPixel from '@/components/shared/openai-pixel';
import ConsentBanner from '@/components/shared/consent-banner';
import ReferralProvider from '@/components/providers/referral-provider';
import RefTrackerProvider from '@/components/providers/ref-tracker-provider';
import OurThemeProvider from '@/components/providers/theme-provider';
import BlockedAccountNotice from '@/components/shared/blocked-account-notice';
import OutstandingBalanceWarning from '@/components/shared/outstanding-balance-warning';
import { AppearanceProvider } from '@/components/providers/appearance-provider';
import { CurrencyProvider } from '@/components/providers/currency-provider';
import { AudioPlayerProvider } from '@/components/providers/audio-player-provider';
import SmoothScrollProvider from '@/components/providers/scroll-provider';

import './globals.css';

// Satoshi font for English
const satoshi = localFont({
  src: [
    {
      path: '../../public/fonts/Satoshi/Satoshi-Light.otf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Satoshi/Satoshi-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Satoshi/Satoshi-Medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Satoshi/Satoshi-Bold.otf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Satoshi/Satoshi-Black.otf',
      weight: '900',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Satoshi/Satoshi-LightItalic.otf',
      weight: '300',
      style: 'italic',
    },
    {
      path: '../../public/fonts/Satoshi/Satoshi-Italic.otf',
      weight: '400',
      style: 'italic',
    },
    {
      path: '../../public/fonts/Satoshi/Satoshi-MediumItalic.otf',
      weight: '500',
      style: 'italic',
    },
    {
      path: '../../public/fonts/Satoshi/Satoshi-BoldItalic.otf',
      weight: '700',
      style: 'italic',
    },
    {
      path: '../../public/fonts/Satoshi/Satoshi-BlackItalic.otf',
      weight: '900',
      style: 'italic',
    },
  ],
  variable: '--font-satoshi',
  display: 'swap',
});

// ExpoArabic font for Arabic
const expoArabic = localFont({
  src: [
    {
      path: '../../public/fonts/ExpoArabic/ExpoArabic-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/fonts/ExpoArabic/ExpoArabic-Book.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/ExpoArabic/ExpoArabic-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/ExpoArabic/ExpoArabic-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../public/fonts/ExpoArabic/ExpoArabic-Bold.otf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-expo-arabic',
  display: 'swap',
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  const t = await getTranslations({ locale, namespace: 'seo.organization' });
  const orgName = t('name');

  const titleDefault = isAr
    ? 'مؤسسة مناسك | أداء الشعائر والنُسك بالوكالة الشرعية'
    : 'Manasik Foundation | Religious Services by Proxy — Umrah, Aqiqah, Qurbani';
  const description = isAr
    ? 'مؤسسة مناسك - نُؤدي عنك بالوكالة الشرعية: عمرة البدل، العقيقة، الأضاحي، النذر، الصدقة، حفر الآبار ووصلات المياه. التزام شرعي، جودة عالية، وتوثيق احترافي يطمئن القلب.'
    : 'Manasik Foundation — We perform religious services on your behalf with legal proxy: Umrah Badal, Aqiqah, Qurbani, Sadaqah, and water wells. Trusted service with professional documentation.';
  const ogLocale = isAr ? 'ar_SA' : 'en_US';
  const ogAlternateLocale = isAr ? ['en_US'] : ['ar_SA'];

  return {
    metadataBase: new URL('https://www.manasik.net'),
    title: {
      default: titleDefault,
      template: isAr ? '%s | مؤسسة مناسك' : '%s | Manasik Foundation',
    },
    description,
    keywords: isAr
      ? [
        'مناسك',
        'عمرة البدل',
        'العقيقة',
        'الأضاحي',
        'النذر',
        'الصدقة',
        'حفر الآبار',
        'وكالة شرعية',
        'تنفيذ الشعائر',
        'manasik',
        'umrah by proxy',
        'aqiqah',
        'sacrifice',
        'charity',
      ]
      : [
        'manasik',
        'umrah by proxy',
        'aqiqah service',
        'qurbani online',
        'charity sacrifice',
        'water well donation',
        'religious services',
        'proxy umrah',
        'aqiqah by proxy',
        'مناسك',
        'عمرة البدل',
        'عقيقة',
      ],
    authors: [{ name: orgName }],
    creator: orgName,
    publisher: orgName,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      type: 'website',
      locale: ogLocale,
      alternateLocale: ogAlternateLocale,
      url: 'https://www.manasik.net',
      siteName: orgName,
      title: titleDefault,
      description: isAr
        ? 'نُؤدي عنك بالوكالة الشرعية: عمرة البدل، العقيقة، الأضاحي، النذر، الصدقة، حفر الآبار. التزام شرعي وتوثيق احترافي.'
        : 'We perform religious services on your behalf with legal proxy: Umrah Badal, Aqiqah, Qurbani, Sadaqah, and water wells.',
      images: [
        {
          url: '/logo-light.png',
          width: 1200,
          height: 630,
          alt: orgName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: titleDefault,
      description: isAr
        ? 'نُؤدي عنك بالوكالة الشرعية: عمرة البدل، العقيقة، الأضاحي، النذر، الصدقة، حفر الآبار. التزام شرعي وتوثيق احترافي.'
        : 'We perform religious services on your behalf with legal proxy: Umrah, Aqiqah, Qurbani, Sadaqah, and water wells.',
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
      google: '6NzLYlbnkzfK1uEZnWsfxkwWbVWL_vNEAiZUmJtw7uc',
      other: {
        'facebook-domain-verification': 'khkmm50dlj6cn4m12epc5kjmn21td8',
      },
    },
  };
}

const VERCEL_COUNTRY_HEADER = 'x-vercel-ip-country';
const BACKEND_URL = (
  process.env.BACKEND_URL || 'http://localhost:3000'
).replace(/\/$/, '');
const GEO_DETECT_URL = `${BACKEND_URL}/api/geo/detect`;

function normalizeCountryCode(raw: string | null): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  if (code === 'XX' || code === 'ZZ') return null;
  // Map Israel → Palestine everywhere in the app.
  return code === 'IL' ? 'PS' : code;
}

async function getIpCountryFromGeoRoute(): Promise<string | null> {
  const headerList = await headers();
  const requestHeaders: Record<string, string> = {};

  const countryHeader = headerList.get(VERCEL_COUNTRY_HEADER);
  const ipHeader = headerList.get('x-vercel-ip-address');
  const forwardedFor = headerList.get('x-forwarded-for');

  if (countryHeader) requestHeaders[VERCEL_COUNTRY_HEADER] = countryHeader;
  if (ipHeader) requestHeaders['x-vercel-ip-address'] = ipHeader;
  if (forwardedFor) requestHeaders['x-forwarded-for'] = forwardedFor;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

    const response = await fetch(GEO_DETECT_URL, {
      method: 'GET',
      headers: requestHeaders,
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      success?: boolean;
      data?: { countryCode?: string | null };
    };

    if (!payload.success) return null;

    return normalizeCountryCode(payload.data?.countryCode ?? null);
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  const fontClass = locale === 'ar' ? expoArabic.variable : satoshi.variable;

  // Non-blocking: start geo detect but don't await it
  // Pass the promise to the provider which will handle it
  const ipCountryCodePromise = getIpCountryFromGeoRoute();
  let ipCountryCode: string | null = null;

  try {
    // Try to get the result with a very short timeout
    ipCountryCode = await Promise.race([
      ipCountryCodePromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 100)),
    ]);
  } catch {
    // If it fails, we'll let the client-side handle it
    ipCountryCode = null;
  }

  return (
    <html
      lang={locale}
      dir={direction}
      suppressHydrationWarning
      className={fontClass}
    >
      <head>
        <MetaPixel />
        <GoogleTag />
        <TiktokPixel />
        <OpenAIPixel />
      </head>
      <body
        className={`antialiased ${locale === 'ar' ? 'font-expo-arabic' : 'font-satoshi'}`}
        suppressHydrationWarning
      >
        <SmoothScrollProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <OurThemeProvider>
              <CurrencyProvider initialCountryCode={ipCountryCode}>
                <AppearanceProvider>
                  <AudioPlayerProvider locale={locale as 'ar' | 'en'}>
                    <Suspense>
                      <ReferralProvider>
                        <RefTrackerProvider>
                          <BlockedAccountNotice />
                          <OutstandingBalanceWarning />
                          {children}
                          <ConsentBanner
                            initialCountryCode={ipCountryCode}
                          />
                        </RefTrackerProvider>
                      </ReferralProvider>
                    </Suspense>
                  </AudioPlayerProvider>
                </AppearanceProvider>
              </CurrencyProvider>
            </OurThemeProvider>
          </NextIntlClientProvider>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
