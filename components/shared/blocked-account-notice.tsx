'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { AlertTriangle, X } from 'lucide-react';
import {
  clearClientAuthCookie,
  hasClientAuthCookie,
} from '@/lib/client-auth-cookie';
import { buildSupportWhatsappLink } from '@/lib/order-whatsapp';

type SessionUser = {
  isBanned?: boolean;
};

const supportWhatsappLink = buildSupportWhatsappLink();

export default function BlockedAccountNotice() {
  const t = useTranslations('auth.blocked');
  const locale = useLocale();
  const pathname = usePathname();
  const isAr = locale === 'ar';
  const isOrderHistoryPage = pathname.includes('/user/order-history');

  const [isBanned, setIsBanned] = useState(false);
  const [ready, setReady] = useState(false);
  const [dismissedPath, setDismissedPath] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!hasClientAuthCookie()) {
      setIsBanned(false);
      setDismissedPath(null);
      setReady(true);
      return;
    }

    try {
      const response = await fetch('/api/auth/manasik/session', {
        cache: 'no-store',
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearClientAuthCookie();
        }
        setIsBanned(false);
        setDismissedPath(null);
        setReady(true);
        return;
      }

      const payload = await response.json();
      const user = payload?.data as SessionUser | undefined;

      const banned = Boolean(user?.isBanned);
      setIsBanned(banned);
      if (!banned) {
        setDismissedPath(null);
      }
      setReady(true);
    } catch {
      setIsBanned(false);
      setDismissedPath(null);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshStatus();
    }, 0);

    const onAuthChanged = () => {
      void refreshStatus();
    };

    window.addEventListener('auth-changed', onAuthChanged);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('auth-changed', onAuthChanged);
    };
  }, [pathname, refreshStatus]);

  const handleDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      setDismissedPath(pathname);
      setIsClosing(false);
    }, 300);
  };

  const dismissedForCurrentPath = dismissedPath === pathname;
  const noticePositionClass = isAr ? 'left-4' : 'right-4';
  const dismissButtonPositionClass = isAr ? 'left-2' : 'right-2';
  const noticeAnimationClass = isClosing
    ? isAr
      ? 'animate-blocked-out-left'
      : 'animate-blocked-out-right'
    : isAr
      ? 'animate-blocked-in-left'
      : 'animate-blocked-in-right';

  if (!ready || !isBanned || dismissedForCurrentPath || isOrderHistoryPage) {
    return null;
  }

  return (
    <div
      className={`pointer-events-none fixed top-24 z-90 w-[min(92vw,26rem)] will-change-transform ${noticePositionClass} ${noticeAnimationClass}`}
    >
      <div className="pointer-events-auto relative rounded-site border border-error/35 bg-background/95 p-4 text-foreground shadow-[0_14px_35px_rgba(120,53,15,0.18)] backdrop-blur transition-colors hover:bg-background dark:border-error/40 dark:bg-background/90">
        <button
          type="button"
          aria-label="Dismiss notice"
          onClick={handleDismiss}
          className={`absolute top-2 rounded p-1 text-foreground/70 transition-all hover:bg-foreground/10 hover:text-foreground ${dismissButtonPositionClass}`}
        >
          <X size={14} />
        </button>

        <div className="pr-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-error" size={18} />
            <div className="space-y-2">
              <p className="text-sm font-bold text-error">{t('title')}</p>
              <p className="text-xs leading-5 text-secondary">
                {t('description')}
              </p>
              <a
                href={supportWhatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-site bg-success px-3 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"
              >
                {t('contactButton')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
