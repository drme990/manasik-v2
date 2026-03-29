'use client';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, useRef } from 'react';
import Container from '@/components/layout/container';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import Button from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, Package, User } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { PageLoading } from '@/components/ui/loading';
import { trackEvent } from '@/lib/fb-pixel';
import { ReservationFieldKey } from '@/lib/reservation-fields';
import { buildOrderWhatsappLink } from '@/lib/order-whatsapp';

interface OrderItemData {
  productId: string;
  productSlug?: string;
  productName: { ar: string; en: string };
  price: number;
  currency: string;
  quantity: number;
}

interface OrderData {
  orderNumber: string;
  status: string;
  totalAmount: number;
  currency: string;
  items: OrderItemData[];
  billingData: {
    fullName: string;
    email: string;
    phone: string;
    country: string;
  };
  couponCode: string | null;
  couponDiscount: number;
  isPartialPayment: boolean;
  fullAmount: number;
  paidAmount: number;
  remainingAmount: number;
  referralId: string | null;
  sizeIndex: number;
  reservationData: Array<{
    key: ReservationFieldKey;
    label: { ar: string; en: string };
    type:
      | 'text'
      | 'textarea'
      | 'number'
      | 'date'
      | 'select'
      | 'radio'
      | 'picture';
    value: string;
  }>;
  source: 'manasik' | 'ghadaq';
  referralInfo: { name: string; phone: string } | null;
  createdAt: string;
}

function PaymentStatusContent() {
  const searchParams = useSearchParams();
  const t = useTranslations('payment');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const purchaseTracked = useRef(false);

  // EasyKash redirects with: ?status=xxx&providerRefNum=xxx&customerReference=xxx
  // We also pass orderNumber ourselves in the redirect URL
  const orderNumber =
    searchParams.get('orderNumber') || searchParams.get('customerReference');
  const easykashStatus = searchParams.get('status');
  const providerRefNum = searchParams.get('providerRefNum');
  const customerReference = searchParams.get('customerReference');
  const gatewayAmount = searchParams.get('gatewayAmount');
  const gatewayCurrency = searchParams.get('gatewayCurrency');

  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [statusLoading, setStatusLoading] = useState(!!orderNumber);

  // Fetch order status from server
  useEffect(() => {
    if (!orderNumber) return;

    const params = new URLSearchParams({ orderNumber });
    if (easykashStatus) params.set('status', easykashStatus);
    if (providerRefNum) params.set('providerRefNum', providerRefNum);
    if (customerReference) params.set('customerReference', customerReference);

    fetch(`/api/payment/status?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setOrderData(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }, [orderNumber, easykashStatus, providerRefNum, customerReference]);

  // Derive display status
  const serverStatus = orderData?.status;
  let status: 'success' | 'pending' | 'failed' = 'pending';
  if (serverStatus === 'paid' || serverStatus === 'partially-paid') {
    status = 'success';
  } else if (serverStatus === 'failed' || serverStatus === 'cancelled') {
    status = 'failed';
  } else if (easykashStatus === 'PAID') {
    status = 'success';
  } else if (easykashStatus === 'FAILED' || easykashStatus === 'EXPIRED') {
    status = 'failed';
  }

  const amount = orderData?.totalAmount
    ? orderData.totalAmount.toFixed(2)
    : null;
  const currency = orderData?.currency || null;

  const isCustomPayLinkPayment =
    searchParams.get('customPayment') === '1' ||
    customerReference?.startsWith('custom-');
  const isOrderPayLinkPayment = customerReference?.startsWith('ord_');
  const isPayLinkPayment = isCustomPayLinkPayment || isOrderPayLinkPayment;
  const receiptDateTime = new Date(
    orderData?.createdAt || new Date().toISOString(),
  ).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // ── FB Pixel: Purchase (fire once on successful payment) ───────────────────
  useEffect(() => {
    if (status !== 'success' || purchaseTracked.current) return;
    purchaseTracked.current = true;

    trackEvent('Purchase', {
      value: amount ? parseFloat(amount) : 0,
      currency: currency || 'SAR',
      order_id: orderNumber || undefined,
    });
  }, [status, amount, currency, orderNumber]);

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

  const whatsappHref = whatsappData?.href;

  const handleRetryPayment = () => {
    if (!orderData || !orderData.items?.length) return;

    const item = orderData.items[0];
    const targetSlug = item.productSlug || '';
    if (!targetSlug) return;
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
        paymentOption === 'custom' ? Math.max(orderData.paidAmount || 0, 0) : 0,
    };

    if (typeof window !== 'undefined') {
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
            {/* Status Header */}
            <div className="text-center">
              <div
                className={`w-20 h-20 mx-auto rounded-full ${config.bgColor} flex items-center justify-center mb-5`}
              >
                <StatusIcon size={40} className={config.color} />
              </div>
              <h1 className="text-2xl font-bold mb-2">{config.title}</h1>
              <p className="text-secondary text-sm">{config.message}</p>
            </div>

            {/* Order Card */}
            <div className="bg-card-bg border border-stroke rounded-site overflow-hidden">
              {/* Receipt Header: order number + amount */}
              <div
                className={`px-5 py-4 flex items-center justify-between gap-4 ${config.bgColor} border-b ${config.borderColor}`}
              >
                <div className="flex flex-col gap-1">
                  {orderNumber && (
                    <span className="text-xs font-mono text-secondary">
                      #{orderNumber}
                    </span>
                  )}
                  <span className="text-xs text-secondary">
                    {t('receiptDateTime')}: {receiptDateTime}
                  </span>
                </div>
                {amount && currency ? (
                  <span className={`text-xl font-bold ${config.color} ltr`}>
                    {amount} {currency}
                  </span>
                ) : null}
              </div>

              {/* Items */}
              {orderData && (
                <>
                  <div className="p-5 border-b border-stroke">
                    <div className="flex items-center gap-2 mb-4">
                      <Package size={16} className="text-secondary" />
                      <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide">
                        {t('orderItems')}
                      </h3>
                    </div>
                    <div className="space-y-2.5">
                      {orderData.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="font-medium">
                            {isRTL ? item.productName.ar : item.productName.en}
                            {item.quantity > 1 && (
                              <span className="text-secondary font-normal">
                                {' '}
                                ×{item.quantity}
                              </span>
                            )}
                          </span>
                          <span className="text-secondary ltr">
                            {(item.price * item.quantity).toLocaleString()}{' '}
                            {item.currency}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Price breakdown — only when there's something to show */}
                    {(orderData.couponDiscount > 0 ||
                      orderData.isPartialPayment) && (
                      <div className="mt-3 pt-3 border-t border-stroke/50 space-y-1.5 text-sm">
                        {orderData.couponDiscount > 0 && (
                          <div className="flex justify-between text-success">
                            <span>
                              {t('discount')}
                              {orderData.couponCode && (
                                <span className="text-xs opacity-60 ms-1">
                                  ({orderData.couponCode})
                                </span>
                              )}
                            </span>
                            <span className="ltr">
                              -{orderData.couponDiscount.toLocaleString()}{' '}
                              {orderData.currency}
                            </span>
                          </div>
                        )}
                        {orderData.isPartialPayment && (
                          <>
                            <div className="flex justify-between text-secondary">
                              <span>{t('fullAmount')}</span>
                              <span className="ltr">
                                {orderData.fullAmount.toLocaleString()}{' '}
                                {orderData.currency}
                              </span>
                            </div>
                            <div className="flex justify-between font-semibold">
                              <span>{t('paidNow')}</span>
                              <span className="ltr">
                                {orderData.paidAmount.toLocaleString()}{' '}
                                {orderData.currency}
                              </span>
                            </div>
                            <div className="flex justify-between text-yellow-500">
                              <span>{t('remaining')}</span>
                              <span className="ltr">
                                {orderData.remainingAmount.toLocaleString()}{' '}
                                {orderData.currency}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Customer Info */}
                  <div className="p-5 border-b border-stroke">
                    <div className="flex items-center gap-2 mb-4">
                      <User size={16} className="text-secondary" />
                      <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide">
                        {t('customerInfo')}
                      </h3>
                    </div>
                    <div
                      className="space-y-2 text-sm"
                      dir={isRTL ? 'rtl' : 'ltr'}
                    >
                      <div className="flex justify-between gap-4">
                        <span className="text-secondary shrink-0">
                          {t('name')}
                        </span>
                        <span className="font-medium text-end">
                          {orderData.billingData.fullName}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-secondary shrink-0">
                          {t('email')}
                        </span>
                        <span className="font-medium ltr text-end break-all">
                          {orderData.billingData.email}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-secondary shrink-0">
                          {t('phone')}
                        </span>
                        <span className="font-medium ltr">
                          {orderData.billingData.phone}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-secondary shrink-0">
                          {t('country')}
                        </span>
                        <span className="font-medium text-end">
                          {orderData.billingData.country}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reservation Data */}
                  {orderData.reservationData?.length > 0 && (
                    <div className="p-5">
                      <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide mb-3">
                        {t('reservationTitle')}
                      </h3>
                      <div className="space-y-2.5">
                        {orderData.reservationData.map((field, idx) => (
                          <div
                            key={idx}
                            className="flex items-start justify-between gap-4 text-sm"
                          >
                            <span className="text-secondary shrink-0">
                              {isRTL ? field.label.ar : field.label.en}
                            </span>
                            {field.type === 'picture' ? (
                              <a
                                href={field.value}
                                target="_blank"
                                rel="noreferrer"
                                className="text-success underline break-all"
                              >
                                {t('viewImage')}
                              </a>
                            ) : (
                              <div className="flex flex-wrap justify-end gap-1.5">
                                {field.value
                                  .split('\n')
                                  .map((entry) => entry.trim())
                                  .filter(Boolean)
                                  .map((entry, valueIdx) => (
                                    <span
                                      key={`${field.key}-${valueIdx}`}
                                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-success/10 text-success"
                                    >
                                      {entry}
                                    </span>
                                  ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isPayLinkPayment && (
                    <div className="p-5 border-t border-stroke/50">
                      <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide mb-3">
                        {t('paymentMethod')}
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-secondary">
                            {t('paymentMethod')}
                          </span>
                          <span className="font-medium">
                            {t('paymentMethodPayLink')}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-secondary">
                            {t('paymentType')}
                          </span>
                          <span className="font-medium">
                            {isCustomPayLinkPayment
                              ? t('paymentTypeCustomPayLink')
                              : t('paymentTypeOrderPayLink')}
                          </span>
                        </div>
                        {gatewayAmount && gatewayCurrency && (
                          <div className="flex justify-between gap-4">
                            <span className="text-secondary">
                              {t('paidNow')}
                            </span>
                            <span className="font-medium ltr">
                              {gatewayAmount} {gatewayCurrency}
                            </span>
                          </div>
                        )}
                        {providerRefNum && (
                          <div className="flex justify-between gap-4">
                            <span className="text-secondary">
                              {t('providerReference')}
                            </span>
                            <span className="font-medium font-mono text-xs ltr">
                              {providerRefNum}
                            </span>
                          </div>
                        )}
                        {customerReference && (
                          <div className="flex justify-between gap-4">
                            <span className="text-secondary">
                              {t('transactionReference')}
                            </span>
                            <span className="font-medium font-mono text-xs ltr">
                              {customerReference}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {!orderData && isPayLinkPayment && (
              <div className="bg-card-bg border border-stroke rounded-site p-5 space-y-3">
                <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide">
                  {t('paymentMethod')}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-secondary">
                      {t('receiptDateTime')}
                    </span>
                    <span className="font-medium">{receiptDateTime}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-secondary">{t('paymentMethod')}</span>
                    <span className="font-medium">
                      {t('paymentMethodPayLink')}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-secondary">{t('paymentType')}</span>
                    <span className="font-medium">
                      {isCustomPayLinkPayment
                        ? t('paymentTypeCustomPayLink')
                        : t('paymentTypeOrderPayLink')}
                    </span>
                  </div>
                  {gatewayAmount && gatewayCurrency && (
                    <div className="flex justify-between gap-4">
                      <span className="text-secondary">{t('paidNow')}</span>
                      <span className="font-medium ltr">
                        {gatewayAmount} {gatewayCurrency}
                      </span>
                    </div>
                  )}
                  {providerRefNum && (
                    <div className="flex justify-between gap-4">
                      <span className="text-secondary">
                        {t('providerReference')}
                      </span>
                      <span className="font-medium font-mono text-xs ltr">
                        {providerRefNum}
                      </span>
                    </div>
                  )}
                  {customerReference && (
                    <div className="flex justify-between gap-4">
                      <span className="text-secondary">
                        {t('transactionReference')}
                      </span>
                      <span className="font-medium font-mono text-xs ltr">
                        {customerReference}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {(status === 'success' || status === 'failed') &&
                whatsappHref && (
                  <div className="space-y-1.5">
                    <Button
                      variant="primary"
                      href={whatsappHref}
                      target="_blank"
                      className="bg-[#25D366]! hover:bg-[#1da851]! flex items-center justify-center gap-2"
                    >
                      <Image
                        src="/icons/whatsapp.svg"
                        alt="WhatsApp"
                        width={20}
                        height={20}
                      />

                      {status === 'failed'
                        ? t('contactSupportWhatsApp')
                        : whatsappData?.referralName
                          ? t('contactReferral', {
                              name: whatsappData.referralName,
                            })
                          : t('contactWhatsApp')}
                    </Button>
                    <p className="text-xs text-secondary text-center">
                      {t('screenshotNote')}
                    </p>
                  </div>
                )}
              {status === 'failed' && orderData?.items?.length ? (
                <Button variant="secondary" onClick={handleRetryPayment}>
                  {t('retryPayment')}
                </Button>
              ) : null}
              {status === 'failed' && orderData?.items?.length ? null : (
                <Button variant="primary" href="/">
                  {t('backHome')}
                </Button>
              )}
              <Button variant="secondary" href="/products">
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
