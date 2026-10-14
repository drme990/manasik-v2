import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Suspense } from 'react';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';

import MetaPixel from '@/components/shared/meta-pixel';
import GoogleTag from '@/components/shared/google-tag';
import TiktokPixel from '@/components/shared/tiktok-pixel';
import OpenAIPixel from '@/components/shared/openai-pixel';
import GTM, { GTMNoScript } from '@/components/shared/gtm';
import ConsentBanner from '@/components/shared/consent-banner';
import ReferralProvider from '@/components/providers/referral-provider';
import OurThemeProvider from '@/components/providers/theme-provider';
import MarqueePause from '@/components/shared/marquee-pause';
import BlockedAccountNotice from '@/components/shared/blocked-account-notice';
import OutstandingBalanceWarning from '@/components/shared/outstanding-balance-warning';
import { AppearanceProvider } from '@/components/providers/appearance-provider';
import { CurrencyProvider } from '@/components/providers/currency-provider';
import { AudioPlayerProvider } from '@/components/providers/audio-player-provider';
import SmoothScrollProvider from '@/components/providers/scroll-provider';
import { SectionsProvider } from '@/components/providers/sections-provider';
import { visibleSections } from '@/lib/sitemap-sections';
import { ShareExperienceProvider } from '@/components/experience/share-experience-provider';
import { getSiteSwitch } from '@/lib/site-switches';
import { CONSENT_COOKIE_NAME, initialMetaConsent } from '@/lib/meta-consent';

import { IS_INDEXABLE, SITE_URL } from '@/lib/site';

import './globals.css';
import './motion.css';
import { HOME_MOTION_BOOT } from '@/components/motion/home-motion-boot';
import { CLICK_ID_KEEPER } from '@/lib/click-id-keeper';

// Satoshi font for English
const satoshi = localFont({
  src: [
    {
      path: '../../public/fonts/Satoshi/Satoshi-Light.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Satoshi/Satoshi-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Satoshi/Satoshi-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Satoshi/Satoshi-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Satoshi/Satoshi-Black.woff2',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-satoshi',
  display: 'swap',
  // Only the English pages use it: the Arabic pages must not spend their first moments downloading it.
  preload: false,
});

// ExpoArabic font for Arabic
const expoArabic = localFont({
  src: [
    {
      path: '../../public/fonts/ExpoArabic/ExpoArabic-Light.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/fonts/ExpoArabic/ExpoArabic-Book.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/ExpoArabic/ExpoArabic-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/ExpoArabic/ExpoArabic-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../public/fonts/ExpoArabic/ExpoArabic-Bold.woff2',
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
  // A path like /foo.txt used to render the English home with 200 (soft 404);
  // anything that is not a real locale is a 404 now (SEO D13, owner 2026-10-12).
  if (!hasLocale(routing.locales, locale)) notFound();
  const isAr = locale === 'ar';
  const t = await getTranslations({ locale, namespace: 'seo.organization' });
  const orgName = t('name');

  const titleDefault = isAr
    ? 'مناسك | أداء الشعائر والنُسك بالوكالة الشرعية'
    : 'Manasik | Religious Services by Proxy — Umrah, Aqiqah, Qurbani';
  const description = isAr
    ? 'مناسك تؤدي عنك بالوكالة الشرعية: عمرة البدل، العقيقة، الأضاحي، والصدقة. التزام شرعي كامل وتوثيق احترافي يطمئن القلب.'
    : 'Manasik performs Umrah Badal, Aqiqah, Qurbani, and Sadaqah on your behalf with legal proxy. Trusted service with professional documentation.';
  const ogLocale = isAr ? 'ar_SA' : 'en_US';
  const ogAlternateLocale = isAr ? ['en_US'] : ['ar_SA'];

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: titleDefault,
      template: isAr ? '%s | مناسك' : '%s | Manasik',
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
      url: `${SITE_URL}/${locale}`,
      siteName: orgName,
      title: titleDefault,
      description: isAr
        ? 'مناسك تؤدي عنك بالوكالة الشرعية: عمرة البدل، العقيقة، الأضاحي، والصدقة. التزام شرعي كامل وتوثيق احترافي يطمئن القلب.'
        : 'Manasik performs Umrah Badal, Aqiqah, Qurbani, and Sadaqah on your behalf with legal proxy. Trusted service with professional documentation.',
      images: [
        {
          url: '/og-default.png',
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
        ? 'مناسك تؤدي عنك بالوكالة الشرعية: عمرة البدل، العقيقة، الأضاحي، والصدقة. التزام شرعي كامل وتوثيق احترافي يطمئن القلب.'
        : 'Manasik performs Umrah Badal, Aqiqah, Qurbani, and Sadaqah on your behalf with legal proxy. Trusted service with professional documentation.',
      images: ['/og-default.png'],
    },
    robots: {
      index: IS_INDEXABLE,
      follow: IS_INDEXABLE,
      googleBot: {
        index: IS_INDEXABLE,
        follow: IS_INDEXABLE,
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
const CF_COUNTRY_HEADER = 'cf-ipcountry';
const VERCEL_IP_HEADER = 'x-vercel-ip-address';

function normalizeCountryCode(raw: string | null): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  if (code === 'XX' || code === 'ZZ') return null;
  // Map Israel → Palestine everywhere in the app.
  return code === 'IL' ? 'PS' : code;
}

// IP lookup fallbacks — same services as /api/geo/detect.
async function getCountryFromCountryIs(ip: string): Promise<string | null> {
  try {
    const res = await fetch(`https://country.is/${encodeURIComponent(ip)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { country?: string | null };
    return normalizeCountryCode(data.country ?? null);
  } catch {
    return null;
  }
}

async function getCountryFromIpApi(ip: string): Promise<string | null> {
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=countryCode`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { countryCode?: string | null };
    return normalizeCountryCode(data.countryCode ?? null);
  } catch {
    return null;
  }
}

/**
 * Server-side country detection — mirrors /api/geo/detect but runs
 * in-process from the incoming request headers. No backend call needed.
 */
async function getIpCountryFromHeaders(): Promise<string | null> {
  const headerList = await headers();

  // 1. CDN-provided country headers (Vercel, then Cloudflare)
  const fromHeader =
    normalizeCountryCode(headerList.get(VERCEL_COUNTRY_HEADER)) ||
    normalizeCountryCode(headerList.get(CF_COUNTRY_HEADER));
  if (fromHeader) return fromHeader;

  // 2. IP-based lookup fallback
  const ip =
    headerList.get(VERCEL_IP_HEADER)?.trim() ||
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    null;
  if (!ip) return null;

  return (await getCountryFromCountryIs(ip)) || (await getCountryFromIpApi(ip));
}

const BACKEND_URL = (
  process.env.BACKEND_URL || 'http://localhost:3000'
).replace(/\/$/, '');

/**
 * Appearance config is admin-managed and identical for every visitor —
 * fetch it once server-side and cache for 5 minutes instead of letting
 * the client provider hit /api/appearance on every page load.
 */
async function getAppearanceData(): Promise<unknown | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/appearance?project=manasik`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const result = await res.json();
    return result?.success ? result.data : null;
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale: localeParam } = await params;
  if (!hasLocale(routing.locales, localeParam)) notFound();
  const locale = await getLocale();
  const messages = await getMessages();
  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  const fontClass = locale === 'ar' ? expoArabic.variable : satoshi.variable;

  // Non-blocking: geo detect and appearance fetch run in parallel
  const ipCountryCodePromise = getIpCountryFromHeaders();
  const appearancePromise = getAppearanceData();
  const sectionsPromise = visibleSections(locale);
  const sharePromise = getSiteSwitch('share-experience');
  const promptPromise = getSiteSwitch('experience-prompt');
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

  const appearanceData = await appearancePromise;
  const sections = await sectionsPromise;
  const shareEnabled = await sharePromise;
  const promptEnabled = await promptPromise;

  // The Meta pixel's first consent call (before its init): the banner's stored
  // answer if there is one, else revoked for the EU/UK/CH until the banner is
  // answered, granted for everyone else (lib/meta-consent.ts).
  const metaConsent = initialMetaConsent(
    ipCountryCode,
    (await cookies()).get(CONSENT_COOKIE_NAME)?.value,
  );

  return (
    <html
      lang={locale}
      dir={direction}
      suppressHydrationWarning
      className={fontClass}
    >
      <head>
        {/* the home page's arrivals wait from the first paint (components/motion/home-motion.tsx) */}
        <script dangerouslySetInnerHTML={{ __html: HOME_MOTION_BOOT }} />
        <script dangerouslySetInnerHTML={{ __html: CLICK_ID_KEEPER }} />
        <MetaPixel consent={metaConsent} />
        <GoogleTag />
        <TiktokPixel />
        <OpenAIPixel />
        <GTM />
      </head>
      <body
        className={`antialiased ${locale === 'ar' ? 'font-expo-arabic' : 'font-satoshi'}`}
        suppressHydrationWarning
      >
        <GTMNoScript />
        <MarqueePause />
        <SmoothScrollProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <OurThemeProvider>
              <CurrencyProvider initialCountryCode={ipCountryCode}>
                <AppearanceProvider initialData={appearanceData}>
                  <AudioPlayerProvider locale={locale as 'ar' | 'en'}>
                    <SectionsProvider visible={sections}>
                    <ShareExperienceProvider enabled={shareEnabled} promptEnabled={promptEnabled}>
                    <Suspense>
                      <ReferralProvider>
                        <BlockedAccountNotice />
                        <OutstandingBalanceWarning />
                        {children}
                        <ConsentBanner
                          initialCountryCode={ipCountryCode}
                        />
                      </ReferralProvider>
                    </Suspense>
                    </ShareExperienceProvider>
                    </SectionsProvider>
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
