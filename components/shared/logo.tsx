'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';

export default function Logo() {
  const locale = useLocale();
  const alt = locale === 'ar' ? 'مؤسسة مناسك' : 'Manasik Foundation';

  return (
    <Link href="/" className="block w-fit">
      <Image
        src="/logo-light.png"
        alt={alt}
        width={120}
        height={40}
        className="dark:hidden"
        priority
      />
      <Image
        src="/logo-dark.png"
        alt={alt}
        width={120}
        height={40}
        className="hidden dark:block h-auto!"
        priority
      />
    </Link>
  );
}
