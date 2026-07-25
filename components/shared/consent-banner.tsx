'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';

import {
  applyStoredConsent,
  denyAllConsent,
  getStoredConsent,
  grantAllConsent,
  isConsentRequiredCountry,
} from '@/lib/consent';

/**
 * Cookie consent banner shown only to visitors from regions that
 * require explicit consent under Google Consent Mode v2 (EU, UK, CH,
 * EFTA). For everyone else the <GoogleTag /> defaults already grant
 * storage, so no banner is displayed.
 *
 * On first mount we re-apply any previously stored choice so returning
 * users keep their preferences. The banner only appears when:
 *   - the visitor is in a consent-required region, AND
 *   - there is no valid (non-expired) stored choice.
 */
export default function ConsentBanner({
  initialCountryCode,
}: {
  initialCountryCode?: string | null;
}) {
  const t = useTranslations('consent');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 1. Re-apply a returning user's stored choice.
    const stored = getStoredConsent();
    if (stored) {
      applyStoredConsent();
      return; // already decided — don't show the banner
    }

    // 2. Decide whether the visitor needs to see the banner.
    const resolveCountry = async () => {
      let code = initialCountryCode ?? null;

      if (!code) {
        try {
          const res = await fetch('/api/geo/detect', { cache: 'no-store' });
          if (res.ok) {
            const data = (await res.json()) as {
              success?: boolean;
              data?: { countryCode?: string | null };
            };
            if (data.success) code = data.data?.countryCode ?? null;
          }
        } catch {
          // ignore — treat as non-EEA (no banner)
        }
      }

      if (isConsentRequiredCountry(code)) setVisible(true);
    };

    void resolveCountry();
  }, [initialCountryCode]);

  const handleAccept = () => {
    grantAllConsent();
    setVisible(false);
  };

  const handleReject = () => {
    denyAllConsent();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t('title')}
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-x-0 bottom-0 z-100 m-3 mx-auto max-w-2xl rounded-2xl border border-black/10 bg-white p-4 shadow-lg dark:border-white/10 dark:bg-zinc-900 sm:m-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {t('message')}{' '}
          <Link
            href="/privacy"
            className="font-medium underline underline-offset-2 hover:opacity-80"
          >
            {t('privacyLink')}
          </Link>
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={handleReject}
            className="rounded-lg border border-black/15 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-black/5 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10"
          >
            {t('rejectAll')}
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {t('acceptAll')}
          </button>
        </div>
      </div>
    </div>
  );
}
