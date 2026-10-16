import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import BackButton from '@/components/shared/back-button';
import WhatsAppButton from '@/components/shared/whats-app-button';
import { Metadata } from 'next';
import { getSeoMetadata } from '@/lib/seo';

/**
 * The official app (owner, 2026-10-16): states that the «مناسك | Manasik» app on the App Store and Google Play is
 * this website's own app, published by its owner — the page App Review is pointed to (guideline 4.1(b), 2026-10-15).
 * A new page only; nothing else on the site links to it or changes.
 */

const DEVELOPER = 'Mohamed Essam Eldin Salah Mohamed';
const REGISTRANT = 'Mohamed Esam Eldin Salah';
const APPLE_ID = '6822481569';
const ANDROID_ID = 'net.manasik.app';
const EMAIL = 'manasiksales@gmail.com';

const COPY = {
  ar: {
    title: 'تطبيق مناسك الرسمي',
    description: 'تطبيق «مناسك | Manasik» على App Store وGoogle Play هو التطبيق الرسمي لموقع manasik.net.',
    intro: 'تطبيق «مناسك | Manasik» على App Store وGoogle Play هو التطبيق الرسمي لموقع manasik.net، يقدّم الخدمات نفسها بالأسعار نفسها وبالحساب نفسه.',
    ownerTitle: 'الناشر والمالك',
    owner: `ينشر التطبيق مالك هذا الموقع نفسه. اسم المطوّر في App Store هو ${DEVELOPER}، وهو صاحب نطاق manasik.net المسجّل باسم ${REGISTRANT} (مناسك).`,
    idsTitle: 'معرّفات التطبيق',
    apple: 'App Store (Apple ID)',
    android: 'Google Play (package)',
    contactTitle: 'التواصل',
    contact: 'لأي استفسار عن التطبيق راسلنا على',
  },
  en: {
    title: 'The official Manasik app',
    description: 'The «مناسك | Manasik» app on the App Store and Google Play is the official app of manasik.net.',
    intro: 'The «مناسك | Manasik» app on the App Store and Google Play is the official app of manasik.net, offering the same services, at the same prices, with the same account.',
    ownerTitle: 'Publisher and owner',
    owner: `The app is published by the owner of this website. Its developer name on the App Store is ${DEVELOPER}, who owns the manasik.net domain, registered as ${REGISTRANT} (Manasik).`,
    idsTitle: 'App identifiers',
    apple: 'App Store (Apple ID)',
    android: 'Google Play (package)',
    contactTitle: 'Contact',
    contact: 'For any question about the app, write to',
  },
} as const;

function copyFor(locale: string) {
  return locale === 'ar' ? COPY.ar : COPY.en;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const c = copyFor(locale);
  const brandName = locale === 'ar' ? 'مناسك' : 'Manasik';
  return getSeoMetadata({ locale, path: '/official-app', title: `${c.title} | ${brandName}`, description: c.description });
}

export default async function OfficialAppPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const c = copyFor(locale);

  return (
    <>
      <Header />
      <main className="grid-bg min-h-screen">
        <Container className="py-8">
          <BackButton className="mb-6" />
          <div className="mx-auto max-w-2xl space-y-6">
            <h1 className="text-4xl font-bold text-foreground">{c.title}</h1>
            <p className="text-foreground leading-relaxed">{c.intro}</p>
            <div>
              <h2 className="text-xl font-semibold text-success mb-3">{c.ownerTitle}</h2>
              <p className="text-foreground leading-relaxed">{c.owner}</p>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-success mb-3">{c.idsTitle}</h2>
              <ul className="space-y-2 text-foreground">
                <li>
                  {c.apple}: <span dir="ltr">{APPLE_ID}</span>
                </li>
                <li>
                  {c.android}: <span dir="ltr">{ANDROID_ID}</span>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-success mb-3">{c.contactTitle}</h2>
              <p className="text-foreground leading-relaxed">
                {c.contact}{' '}
                <a className="text-success underline" href={`mailto:${EMAIL}`} dir="ltr">
                  {EMAIL}
                </a>
              </p>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
