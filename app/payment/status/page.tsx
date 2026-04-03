'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';

import Container from '@/components/layout/container';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import PaymentOrderCard from '@/components/payment/payment-order-card';
import PaymentStatusHeader from '@/components/payment/payment-status-header';
import PaymentPayLinkFallbackCard from '@/components/payment/payment-pay-link-fallback-card';
import PaymentActionButtons from '@/components/payment/payment-action-buttons';

import { PageLoading } from '@/components/ui/loading';
import {
  buildOrderWhatsappLink,
  buildSupportWhatsappLink,
} from '@/lib/order-whatsapp';
import { DisplayStatus, OrderData, StatusViewConfig } from '@/types/payment';
import {
  extractOrderNumber,
  resolveDisplayStatus,
  getHijriDateString,
} from '@/lib/payment-utils';
import { trackEvent } from '@/lib/fb-pixel';

import { CheckCircle, Clock, XCircle, LucideIcon } from 'lucide-react';

type StatusConfigEntry = StatusViewConfig & { icon: LucideIcon };

function PaymentStatusContent() {
  const searchParams = useSearchParams();
  const t = useTranslations('payment');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const purchaseTracked = useRef(false);

  // EasyKash redirects with: ?status=xxx&providerRefNum=xxx&customerReference=xxx
  // We also pass orderNumber ourselves in the redirect URL
  const orderNumberParam = searchParams.get('orderNumber');
  const customerReference = searchParams.get('customerReference');
  const orderNumber =
    extractOrderNumber(orderNumberParam) ||
    extractOrderNumber(customerReference);
  const easykashStatus = searchParams.get('status');
  const providerRefNum = searchParams.get('providerRefNum');
  const gatewayAmount = searchParams.get('gatewayAmount');
  const gatewayCurrency = searchParams.get('gatewayCurrency');
  const shouldLookupOrder = Boolean(orderNumber || customerReference);

  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [statusLoading, setStatusLoading] = useState(shouldLookupOrder);
  const [retryErrorMessage, setRetryErrorMessage] = useState('');

  // Fetch order status from server
  useEffect(() => {
    if (!shouldLookupOrder) {
      setOrderData(null);
      setStatusLoading(false);
      return;
    }

    const params = new URLSearchParams();
    if (orderNumber) params.set('orderNumber', orderNumber);
    if (easykashStatus) params.set('status', easykashStatus);
    if (providerRefNum) params.set('providerRefNum', providerRefNum);
    if (customerReference) params.set('customerReference', customerReference);

    const abortController = new AbortController();

    const loadOrderStatus = async () => {
      setStatusLoading(true);
      setOrderData(null);

      try {
        const response = await fetch(
          `/api/payment/status?${params.toString()}`,
          {
            cache: 'no-store',
            signal: abortController.signal,
          },
        );
        const payload = await response.json();

        if (!response.ok || !payload?.success || !payload?.data) {
          setOrderData(null);
          return;
        }

        setOrderData(payload.data);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setOrderData(null);
      } finally {
        if (!abortController.signal.aborted) {
          setStatusLoading(false);
        }
      }
    };

    void loadOrderStatus();

    return () => {
      abortController.abort();
    };
  }, [
    shouldLookupOrder,
    orderNumber,
    easykashStatus,
    providerRefNum,
    customerReference,
  ]);

  const displayOrderNumber = orderData?.orderNumber || orderNumber;
  const status = resolveDisplayStatus(orderData?.status, easykashStatus);

  const amount = orderData?.totalAmount
    ? orderData.totalAmount.toFixed(2)
    : null;
  const currency = orderData?.currency || null;

  const isCustomPayLinkPayment =
    searchParams.get('customPayment') === '1' ||
    Boolean(customerReference?.startsWith('custom-'));
  const isOrderPayLinkPayment = Boolean(customerReference?.startsWith('ord_'));
  const isPayLinkPayment = isCustomPayLinkPayment || isOrderPayLinkPayment;
  const createdAtDate = new Date(
    orderData?.createdAt || new Date().toISOString(),
  );
  const receiptDateTime = createdAtDate.toLocaleString(
    locale === 'ar' ? 'ar-SA' : 'en-US',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  );
  const hijriDateString = getHijriDateString(createdAtDate, locale);

  // ── FB Pixel: Purchase (fire once on successful payment) ───────────────────
  useEffect(() => {
    if (status !== 'success' || purchaseTracked.current) return;
    purchaseTracked.current = true;

    trackEvent('Purchase', {
      value: amount ? parseFloat(amount) : 0,
      currency: currency || 'SAR',
      order_id: displayOrderNumber || undefined,
    });
  }, [status, amount, currency, displayOrderNumber]);

  const statusConfig: Record<DisplayStatus, StatusConfigEntry> = {
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

  // WhatsApp logic: referral phone if exists, otherwise main number
  const reservationMap = new Map(
    (orderData?.reservationData ?? []).map((field) => [field.key, field]),
  );

  const whatsappData =
    orderData &&
    buildOrderWhatsappLink({
      orderNumber: orderData.orderNumber,
      currency: orderData.currency,
      remainingAmount: orderData.remainingAmount,
      items: orderData.items,
      billingData: orderData.billingData,
      reservationMap,
      referralInfo: orderData.referralInfo,
    });

  const whatsappHref =
    status === 'failed' || isCustomPayLinkPayment
      ? buildSupportWhatsappLink()
      : whatsappData?.href;
  const canRetryPayment =
    status === 'failed' && Boolean(orderData?.items?.length);

  const handleRetryPayment = () => {
    setRetryErrorMessage('');
    if (!orderData || !orderData.items?.length) {
      setRetryErrorMessage(t('retryPaymentError'));
      return;
    }

    const item = orderData.items[0];
    const targetSlug = item.productSlug || '';
    if (!targetSlug) {
      setRetryErrorMessage(t('retryPaymentError'));
      return;
    }
    const halfAmount = Math.ceil(orderData.fullAmount / 2);
    const paymentOption = !orderData.isPartialPayment
      ? 'full'
      : orderData.paidAmount === halfAmount
        ? 'half'
        : 'custom';

    const retryPayload = {
      orderNumber: orderData.orderNumber,
      productSlug: targetSlug,
      quantity: Math.max(item.quantity || 1, 1),
      sizeIndex: orderData.sizeIndex ?? 0,
      billingData: orderData.billingData,
      reservationData: orderData.reservationData || [],
      couponCode: orderData.couponCode,
      referralId: orderData.referralId,
      paymentOption,
      customAmount:
        paymentOption === 'custom'
          ? Math.max(orderData.remainingAmount || 0, 0)
          : 0,
    };

    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(
          'checkout-retry-prefill',
          JSON.stringify(retryPayload),
        );
        const params = new URLSearchParams({
          prod: targetSlug,
          qty: String(Math.max(item.quantity || 1, 1)),
          size: String(orderData.sizeIndex ?? 0),
          retry: '1',
          retryOrder: orderData.orderNumber,
        });
        window.location.href = `/checkout?${params.toString()}`;
      } catch {
        setRetryErrorMessage(t('retryPaymentError'));
      }
    } else {
      setRetryErrorMessage(t('retryPaymentError'));
    }
  };

  if (statusLoading) {
    return (
      <>
        <Header />
        <main className="grid-bg min-h-screen flex items-center justify-center">
          <Container>
            <div className="max-w-md mx-auto text-center py-16">
              <div className="w-20 h-20 mx-auto rounded-full bg-secondary/10 flex items-center justify-center mb-6">
                <Clock size={40} className="text-secondary animate-pulse" />
              </div>
              <p className="text-secondary">{t('pending.message')}</p>
            </div>
          </Container>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="grid-bg min-h-screen flex items-start justify-center pt-28 pb-16">
        <Container>
          <div className="max-w-xl mx-auto space-y-5">
            <PaymentStatusHeader
              Icon={config.icon}
              title={config.title}
              message={config.message}
              iconColorClassName={config.color}
              iconContainerClassName={config.bgColor}
            />

            <PaymentOrderCard
              orderData={orderData}
              displayOrderNumber={displayOrderNumber}
              amount={amount}
              currency={currency}
              isRTL={isRTL}
              statusConfig={config}
              t={t}
              receiptDateTime={receiptDateTime}
              hijriDateString={hijriDateString}
              isPayLinkPayment={isPayLinkPayment}
              isCustomPayLinkPayment={isCustomPayLinkPayment}
              gatewayAmount={gatewayAmount}
              gatewayCurrency={gatewayCurrency}
              providerRefNum={providerRefNum}
              customerReference={customerReference}
            />

            {!orderData && isPayLinkPayment ? (
              <PaymentPayLinkFallbackCard
                t={t}
                isCustomPayLinkPayment={isCustomPayLinkPayment}
                gatewayAmount={gatewayAmount}
                gatewayCurrency={gatewayCurrency}
                providerRefNum={providerRefNum}
                customerReference={customerReference}
                receiptDateTime={receiptDateTime}
                hijriDateString={hijriDateString}
              />
            ) : null}

            <PaymentActionButtons
              status={status}
              whatsappHref={whatsappHref}
              referralName={whatsappData?.referralName}
              canRetryPayment={canRetryPayment}
              onRetryPayment={handleRetryPayment}
              retryErrorMessage={retryErrorMessage}
              t={t}
            />
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
