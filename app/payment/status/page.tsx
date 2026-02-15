'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Container from '@/components/layout/container';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import Button from '@/components/ui/button';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PageLoading } from '@/components/ui/loading';

function PaymentStatusContent() {
  const searchParams = useSearchParams();
  const t = useTranslations('payment');

  // Paymob redirects with these query params
  const success = searchParams.get('success') === 'true';
  const pending = searchParams.get('pending') === 'true';
  const orderId = searchParams.get('order') || searchParams.get('order_id');
  const amountCents = searchParams.get('amount_cents');
  const currency = searchParams.get('currency');

  const amount = amountCents ? (parseInt(amountCents) / 100).toFixed(2) : null;

  let status: 'success' | 'pending' | 'failed' = 'failed';
  if (success) status = 'success';
  else if (pending) status = 'pending';

  const statusConfig = {
    success: {
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/30',
      title: t('success.title'),
      message: t('success.message'),
    },
    pending: {
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      title: t('pending.title'),
      message: t('pending.message'),
    },
    failed: {
      icon: XCircle,
      color: 'text-error',
      bgColor: 'bg-error/10',
      borderColor: 'border-error/30',
      title: t('failed.title'),
      message: t('failed.message'),
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <>
      <Header />
      <main className="grid-bg min-h-screen flex items-center justify-center">
        <Container>
          <div className="max-w-md mx-auto text-center py-16">
            <div
              className={`w-20 h-20 mx-auto rounded-full ${config.bgColor} flex items-center justify-center mb-6`}
            >
              <StatusIcon size={40} className={config.color} />
            </div>

            <h1 className="text-2xl font-bold mb-3">{config.title}</h1>
            <p className="text-secondary mb-6">{config.message}</p>

            {amount && currency && (
              <div
                className={`inline-block px-4 py-2 rounded-site border ${config.borderColor} ${config.bgColor} mb-6`}
              >
                <span className="text-lg font-bold">
                  {amount} {currency}
                </span>
              </div>
            )}

            {orderId && (
              <p className="text-xs text-secondary mb-6">
                {t('orderRef')}: #{orderId}
              </p>
            )}

            <div className="flex flex-col gap-3">
              <Button variant="primary" href="/">
                {t('backHome')}
              </Button>
              <Button variant="outline" href="/products">
                {t('browseProducts')}
              </Button>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}

export default function PaymentStatusPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PaymentStatusContent />
    </Suspense>
  );
}
