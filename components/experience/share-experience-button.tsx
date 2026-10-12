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

  // Same green as the site's main buttons (owner, 2026-10-12), with the current icon.
  const styles = {
    solid: 'min-h-12 px-6 text-base',
    soft: 'min-h-12 px-6 text-base',
    compact: 'min-h-11 px-5 text-[15px]',
  }[variant];

  const button = (
    <button
      type="button"
      onClick={open}
      className={`gradient-site gradient-text inline-flex items-center justify-center gap-2 rounded-site font-medium shadow-lg transition-all duration-200 hover:opacity-90 hover:shadow-xl active:scale-[0.98] ${styles} ${className}`}
    >
      <MessageCircleHeart size={variant === 'solid' ? 20 : 18} aria-hidden />
      {t('button')}
    </button>
  );
  return wrap ? <div className={wrap}>{button}</div> : button;
}
