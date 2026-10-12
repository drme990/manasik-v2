'use client';

import { MessageCircleHeart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useShareExperience } from './share-experience-provider';

/** The «شارك تجربتك» button; renders nothing while the feature is off. */
export default function ShareExperienceButton({
  variant = 'solid',
  className = '',
  wrap,
}: {
  variant?: 'solid' | 'soft' | 'compact';
  className?: string;
  /** Classes of a wrapper drawn only when the button shows (so nothing changes while it is off). */
  wrap?: string;
}) {
  const t = useTranslations('shareExperience');
  const { enabled, open } = useShareExperience();
  if (!enabled) return null;

  const styles = {
    solid: 'h-12 px-6 text-base bg-success text-white shadow-success hover:brightness-110',
    soft: 'h-11 px-5 text-sm bg-success/12 text-success ring-1 ring-success/25 hover:bg-success/18',
    compact: 'h-10 px-4 text-sm bg-success/12 text-success ring-1 ring-success/25 hover:bg-success/18',
  }[variant];

  const button = (
    <button
      type="button"
      onClick={open}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[0.98] ${styles} ${className}`}
    >
      <MessageCircleHeart size={variant === 'solid' ? 20 : 18} aria-hidden />
      {t('button')}
    </button>
  );
  return wrap ? <div className={wrap}>{button}</div> : button;
}
