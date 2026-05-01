'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { hasClientAuthCookie } from '@/lib/client-auth-cookie';

type OutstandingBalanceStatus = {
  hasOutstandingBalance: boolean;
  orderNumber?: string;
  remainingAmount?: number;
  currency?: string;
};

export default function OutstandingBalanceWarning() {
  const t = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();
  const isAr = locale === 'ar';

  const [status, setStatus] = useState<OutstandingBalanceStatus | null>(null);
  const [dismissedPath, setDismissedPath] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!hasClientAuthCookie()) {
      setStatus(null);
      return;
    }

    try {
      const response = await fetch('/api/orders/payment-lock-status', {
        cache: 'no-store',
      });

      if (!response.ok) {
        setStatus(null);
        return;
      }

      const payload = await response.json();
      setStatus(payload?.data ?? null);
    } catch {
      setStatus(null);
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
  }, [refreshStatus]);

  const dismissedForCurrentPath = dismissedPath === pathname;

  const handleDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      setDismissedPath(pathname);
      setIsClosing(false);
    }, 300);
  };

  if (!status?.hasOutstandingBalance || dismissedForCurrentPath) {
    return null;
  }

  const amountLabel =
    typeof status.remainingAmount === 'number'
      ? `${status.remainingAmount.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')} ${status.currency || ''}`.trim()
      : t('paymentLock.unknownAmount');

  const noticePositionClass = isAr ? 'left-4' : 'right-4';
  const dismissButtonPositionClass = isAr ? 'left-2' : 'right-2';
  const noticeAnimationClass = isClosing
    ? isAr
      ? 'animate-blocked-out-left'
      : 'animate-blocked-out-right'
    : isAr
      ? 'animate-blocked-in-left'
      : 'animate-blocked-in-right';

  return (
    <div
      className={`pointer-events-none fixed top-24 z-90 w-[min(92vw,26rem)] will-change-transform ${noticePositionClass} ${noticeAnimationClass}`}
    >
      <div className="pointer-events-auto relative rounded-site border border-error/35 bg-background/95 p-4 text-foreground shadow-[0_14px_35px_rgba(120,53,15,0.18)] backdrop-blur transition-colors hover:bg-background dark:border-error/40 dark:bg-background/90">
        <button
          type="button"
          aria-label="Dismiss warning"
          onClick={handleDismiss}
          className={`absolute top-2 rounded p-1 text-foreground/70 transition-all hover:bg-foreground/10 hover:text-foreground ${dismissButtonPositionClass}`}
        >
          <X size={14} />
        </button>

        <Link href="/user/order-history" className="block pr-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-error" size={18} />
            <div className="space-y-1">
              <p className="text-sm font-bold text-error">
                {t('paymentLock.title')}
              </p>
              <p className="text-xs leading-5 text-secondary">
                {t('paymentLock.description', {
                  orderNumber: status.orderNumber || '-',
                  amount: amountLabel,
                })}
              </p>
              <p className="text-xs font-semibold underline underline-offset-2">
                {t('paymentLock.action')}
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
