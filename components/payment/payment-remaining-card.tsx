'use client';

import { useState } from 'react';
import { Loader2, Wallet } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import Button from '@/components/ui/button';
import { openPayment } from '@/components/payment/payment-sheet';

function formatMoney(amount: number, currency: string, locale: string): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const number = new Intl.NumberFormat(locale === 'ar' ? 'ar-u-nu-latn' : locale, {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${number} ${(currency || '').toUpperCase()}`.trim();
}

/**
 * Something left to pay on this order: the amount, said first and plainly, and the way to pay it
 * (owner, 2026-10-11). Opens the same payment as "pay the remaining amount" in the order history.
 */
export default function PaymentRemainingCard({
  orderNumber,
  remainingAmount,
  currency,
}: {
  orderNumber: string;
  remainingAmount: number;
  currency: string;
}) {
  const t = useTranslations('payment');
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const owed = formatMoney(remainingAmount, currency, locale);

  const pay = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/payment/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success || !result.data?.redirectUrl) {
        setError(result?.error || t('remainingCard.error'));
        return;
      }
      await openPayment(result.data.redirectUrl);
    } catch {
      setError(t('remainingCard.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-warning/35 bg-warning/10 p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-warning/20 text-warning">
          <Wallet size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-secondary">{t('remainingCard.title')}</p>
          <p className="mt-0.5 text-3xl font-bold tabular-nums text-warning">
            <bdi dir="ltr">{owed}</bdi>
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm text-foreground">{t('remainingCard.hint')}</p>
      <Button
        onClick={pay}
        disabled={busy}
        variant="primary"
        className="mt-4 h-12 w-full gap-2 rounded-2xl text-base font-semibold"
      >
        {busy ? <Loader2 size={18} className="animate-spin" /> : <>
            <span>{t('remainingCard.pay')}</span>
            <bdi dir="ltr">{owed}</bdi>
          </>}
      </Button>
      {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}
    </section>
  );
}
