'use client';

import { useTranslations } from 'next-intl';
import Button from '@/components/ui/button';

export default function Hero() {
  const t = useTranslations('landing.hero');
  const tc = useTranslations('common.buttons');
  return (
    <section className="min-h-[85vh] bg-background flex items-center justify-center px-5 py-16">
      <div className="w-full text-center space-y-8 gbf gbf-lg">
        <h1 className="text-2xl font-bold text-foreground leading-relaxed">
          {t('title')}
          <br />
          {t('subtitle')}
        </h1>

        <p className="text-base text-secondary leading-loose px-2">
          {t('description')}
        </p>

        <div className="flex gap-3 items-center pt-4 px-4">
          <Button
            variant="primary"
            size="md"
            className="w-full"
            href="/products"
          >
            {tc('orderNow')}
          </Button>
          <Button variant="outline" size="md" className="w-full ">
            {tc('discoverMore')}
          </Button>
        </div>
      </div>
    </section>
  );
}
