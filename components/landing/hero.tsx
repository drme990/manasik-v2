'use client';

import { useTranslations } from 'next-intl';
import Button from '@/components/ui/button';

export default function Hero() {
  const t = useTranslations('landing.hero');
  const tc = useTranslations('common.buttons');
  return (
    <section className="min-h-[85vh] bg-background flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-4xl text-center space-y-10 gbf gbf-lg">
        <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
          {t('title')}
          <br />
          {t('subtitle')}
        </h1>

        <p className="text-base md:text-lg text-secondary leading-relaxed max-w-2xl mx-auto px-6 md:px-0">
          {t('description')}
        </p>

        <div className="flex gap-4 items-center justify-center pt-4 px-4">
          <Button
            variant="primary"
            size="md"
            className="w-full md:w-auto"
            href="/products"
          >
            {tc('orderNow')}
          </Button>
          <Button variant="outline" size="md" className="w-full md:w-auto">
            {tc('discoverMore')}
          </Button>
        </div>
      </div>
    </section>
  );
}
