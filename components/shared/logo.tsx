'use client';

import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';

export default function Logo() {
  const locale = useLocale();
  const alt = locale === 'ar' ? 'مناسك' : 'Manasik';

  return (
    <Link href="/" className="block w-fit">
      {/* Vector (owner, 2026-10-17: the 123×32 PNG was blurry on phones): drawn sharp at any size and density. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- an SVG drawn as is */}
      <img src="/logo-light.svg" alt={alt} width={120} height={31} className="dark:hidden h-auto" fetchPriority="high" />
      {/* eslint-disable-next-line @next/next/no-img-element -- an SVG drawn as is */}
      <img src="/logo-dark.svg" alt={alt} width={120} height={31} className="hidden dark:block h-auto" fetchPriority="high" />
    </Link>
  );
}
