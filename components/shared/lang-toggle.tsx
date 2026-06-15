'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import Button from '../ui/button';

export default function LangToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const toggleLang = () => {
    const newLocale = locale === 'ar' ? 'en' : 'ar';
    const queryString = searchParams.toString();
    const href = queryString ? `${pathname}?${queryString}` : pathname;

    startTransition(() => {
      router.replace(href, { locale: newLocale });
    });
  };

  return (
    <Button
      variant="icon"
      onClick={toggleLang}
      disabled={isPending}
      size="custom"
      className="text-[13px]"
      aria-label={`Switch to ${locale === 'ar' ? 'English' : 'العربية'}`}
    >
      {locale === 'ar' ? 'EN' : 'AR'}
    </Button>
  );
}
