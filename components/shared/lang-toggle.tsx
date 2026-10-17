'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Languages } from 'lucide-react';
import Button from '../ui/button';

/** `icon`: the phone's header shows the language picture instead of «EN» (owner, 2026-10-17). */
export default function LangToggle({ icon = false, compact = false }: { icon?: boolean; compact?: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const toggleLang = () => {
    const newLocale = locale === 'ar' ? 'en' : 'ar';
    const queryString = searchParams.toString();
    const href = queryString ? `${pathname}?${queryString}` : pathname;

    // the choice is kept for a year (the same cookie the site reads on every visit), so a refresh or a
    // later visit opens in it
    try {
      document.cookie = `MANASIK_LOCALE=${newLocale}; path=/; max-age=31536000; samesite=lax${location.protocol === 'https:' ? '; secure' : ''}`;
    } catch {
      // the address still carries the language
    }

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
      className={compact ? 'h-[34px]! w-[34px]! p-0! rounded-[10px]! text-[12px] font-medium inline-flex items-center justify-center bg-foreground/[0.06]! border-foreground/10! backdrop-blur-md' : 'text-[13px]'}
      aria-label={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
    >
      {icon ? <Languages size={19} aria-hidden="true" /> : locale === 'ar' ? 'EN' : 'AR'}
    </Button>
  );
}
