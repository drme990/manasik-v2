import { redirect } from 'next/navigation';

/**
 * The «شارك تجربتك» invitation's own address (owner, 2026-10-13). On the site it opens the window on the home
 * page, exactly as `?share=1` did; it has a path of its own so that, once the app links are set up, the app can
 * open this link (and only links like it) without also taking the home page that ads lead to.
 */
export default async function SharePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale === 'en' ? 'en' : 'ar'}?share=1`);
}
