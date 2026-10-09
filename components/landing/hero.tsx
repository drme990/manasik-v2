'use client';

import { useTranslations } from 'next-intl';
import Button from '@/components/ui/button';
import type { CSSProperties } from 'react';

/** The words of a line, each in its own span so they can rise one after another (app/[locale]/motion.css). */
function Words({ text, from }: { text: string; from: number }) {
  return (
    <>
      {text.split(' ').map((word, index) => (
        <span key={index}>
          {index > 0 ? ' ' : null}
          <span className="mo-hw" style={{ '--w': from + index } as CSSProperties}>
            {word}
          </span>
        </span>
      ))}
    </>
  );
}

export default function Hero() {
  const t = useTranslations('landing.hero');
  const tc = useTranslations('common.buttons');
  const tn = useTranslations('common.navigation');
  const title = t('title');
  const subtitle = t('subtitle');
  const titleWords = title.split(' ').length;
  const words = titleWords + subtitle.split(' ').length;

  return (
    <section
      className="mo-hero min-h-[85vh] bg-background flex items-center justify-center px-4 py-20"
      style={{ '--mo-hero-words': Math.min(words, 14) } as CSSProperties}
    >
      <div className="mo-hero-stage w-full max-w-4xl text-center space-y-10 gbf gbf-lg">
        <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
          <Words text={title} from={0} />
          <br />
          <Words text={subtitle} from={titleWords} />
        </h1>

        <p className="mo-hero-text text-base md:text-lg text-secondary leading-relaxed max-w-2xl mx-auto px-6 md:px-0">
          {t('description')}
        </p>

        <div className="flex gap-4 items-center justify-center pt-4 px-4">
          <Button
            variant="primary"
            size="md"
            className="mo-hero-key mo-ask w-full md:w-auto"
            style={{ '--k': 0 } as CSSProperties}
            href="/products"
          >
            {tc('orderNow')}
          </Button>
          <Button
            variant="outline"
            size="md"
            className="mo-hero-key w-full md:w-auto"
            style={{ '--k': 1 } as CSSProperties}
            href="/calc-aqeqa"
          >
            {tn('calcAqeqa')}
          </Button>
        </div>
      </div>
    </section>
  );
}
