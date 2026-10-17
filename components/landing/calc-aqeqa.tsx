'use client';

import Container from '../layout/container';
import { Section } from '../layout/section';
import Button from '../ui/button';
import { useTranslations } from 'next-intl';
import { Baby } from 'lucide-react';

/** A small sheep, drawn here (a round wool body, a dark face): no horns. */
function Sheep({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 40" className={className} aria-hidden="true">
      <g fill="#fff">
        <circle cx="14" cy="18" r="8" />
        <circle cx="22" cy="13" r="8" />
        <circle cx="30" cy="16" r="8" />
        <circle cx="20" cy="22" r="8" />
        <circle cx="29" cy="23" r="7" />
      </g>
      <rect x="15" y="27" width="3" height="9" rx="1.5" fill="#1d2b4a" />
      <rect x="27" y="27" width="3" height="9" rx="1.5" fill="#1d2b4a" />
      <ellipse cx="38" cy="15" rx="6" ry="7" fill="#1d2b4a" />
      <circle cx="40" cy="13" r="1.2" fill="#fff" />
      <ellipse cx="34" cy="10" rx="3" ry="1.6" fill="#1d2b4a" transform="rotate(-25 34 10)" />
    </svg>
  );
}

/**
 * «احسب عقيقتك» with something to look at (owner, 2026-10-17: «كلام تكست بس… والزر بينبض»): on a green band, a
 * baby becomes the sheep of his aqiqah, again and again, and the key breathes so it is pressed. (Navy waits for the
 * owner's choice of where it goes.)
 */
export function AqeqaCard() {
  const t = useTranslations('landing.calcAqeqa');

  return (
    <div data-mo="pop" className="aqeqa-card relative w-full overflow-hidden bg-card-bg border border-stroke flex flex-col items-center gap-5 rounded-site p-6 mx-auto text-center">
      <div className="aqeqa-scene" aria-hidden="true">
        <span className="aqeqa-baby"><Baby size={30} strokeWidth={2.2} /></span>
        <span className="aqeqa-eq">=</span>
        <span className="aqeqa-sheep">
          <Sheep className="aqeqa-s1" />
          <Sheep className="aqeqa-s2" />
        </span>
      </div>
      <h2 className="text-xl font-bold text-foreground">{t('title')}</h2>
      <p className="text-secondary text-base leading-relaxed">
        {t('description')}
      </p>
      <Button className="aqeqa-cta w-full" href="/calc-aqeqa">
        {t('button')}
      </Button>
    </div>
  );
}

export default function CalcAqeqa() {
  return (
    <Section id="calc-aqeqa">
      <Container>
        <AqeqaCard />
      </Container>
      <div className="gbf gbf-lg gbf-bottom h-1"></div>
    </Section>
  );
}
