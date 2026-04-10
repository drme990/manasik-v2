'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { hasClientAuthCookie } from '@/lib/client-auth-cookie';

const slideInOutKeyframes = `
  @keyframes slideInFromRight {
    from { opacity: 0; transform: translateX(100%); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideOutToRight {
    from { opacity: 1; transform: translateX(0); }
    to { opacity: 0; transform: translateX(100%); }
  }
  @keyframes slideInFromLeft {
    from { opacity: 0; transform: translateX(-100%); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideOutToLeft {
    from { opacity: 1; transform: translateX(0); }
    to { opacity: 0; transform: translateX(-100%); }
  }
`;

type OutstandingBalanceStatus = {
  hasOutstandingBalance: boolean;
  orderNumber?: string;
  remainingAmount?: number;
  currency?: string;
};

export default function OutstandingBalanceWarning() {
  const t = useTranslations('common');
  const locale = useLocale();
  const isAr = locale === 'ar';

  const [status, setStatus] = useState<OutstandingBalanceStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // ✅ key fix: control visibility separately
  const [visible, setVisible] = useState(false);

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

  // ✅ only effect that is VALID: reacts to external async data
  useEffect(() => {
    if (status?.hasOutstandingBalance && !dismissed) {
      // defer to next frame → avoids initial flicker
      requestAnimationFrame(() => {
        setVisible(true);
      });
    }
  }, [status?.hasOutstandingBalance, dismissed]);

  const handleDismiss = () => {
    setVisible(false);

    setTimeout(() => {
      setDismissed(true);
    }, 300);
  };

  if (!status?.hasOutstandingBalance || dismissed) {
    return null;
  }

  const amountLabel =
    typeof status.remainingAmount === 'number'
      ? `${status.remainingAmount.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')} ${status.currency || ''}`.trim()
      : t('paymentLock.unknownAmount');

  return (
    <>
      <style>{slideInOutKeyframes}</style>
      <div
        className="pointer-events-none fixed top-24 z-90 w-[min(92vw,26rem)] will-change-transform"
        style={{
          [isAr ? 'left' : 'right']: '1rem',
          animation: visible
            ? isAr
              ? 'slideInFromLeft 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
              : 'slideInFromRight 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
            : isAr
              ? 'slideOutToLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              : 'slideOutToRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <div className="pointer-events-auto relative rounded-site border border-amber-300/80 bg-amber-50/95 p-4 text-amber-950 shadow-[0_14px_35px_rgba(120,53,15,0.18)] transition-colors hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-900/85 dark:text-amber-100 dark:hover:bg-amber-900">
          <button
            type="button"
            aria-label="Dismiss warning"
            onClick={handleDismiss}
            className="absolute top-2 rounded p-1 text-amber-900/80 transition-all hover:bg-amber-200/60 hover:text-amber-950 dark:text-amber-100/80 dark:hover:bg-amber-800/70 dark:hover:text-amber-50"
            style={{
              [isAr ? 'left' : 'right']: '0.5rem',
            }}
          >
            <X size={14} />
          </button>

          <Link href="/user/order-history" className="block pr-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 shrink-0" size={18} />
              <div className="space-y-1">
                <p className="text-sm font-bold">{t('paymentLock.title')}</p>
                <p className="text-xs leading-5">
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
    </>
  );
}
