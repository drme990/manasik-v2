'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, useRef } from 'react';
import Container from '@/components/layout/container';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import Button from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, Package, User } from 'lucide-react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { PageLoading } from '@/components/ui/loading';
import { trackEvent } from '@/lib/fb-pixel';

const MAIN_WHATSAPP = '201027282396';

interface OrderItemData {
  productId: string;
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
  reservationData: Array<{
    label: { ar: string; en: string };
    type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'picture';
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
  const redirectChecked = useRef(false);

  // EasyKash redirects with: ?status=xxx&providerRefNum=xxx&customerReference=xxx
  // We also pass orderNumber ourselves in the redirect URL
  const orderNumber =
    searchParams.get('orderNumber') || searchParams.get('customerReference');
  const easykashStatus = searchParams.get('status');

  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [statusLoading, setStatusLoading] = useState(!!orderNumber);

  // ── Redirect ghadaq users to ghadaq domain ────────────────────────────────
  useEffect(() => {
    if (!orderNumber || redirectChecked.current) return;
    redirectChecked.current = true;

    if (orderNumber.startsWith('GHD-')) {
      // Preserve all URL params when redirecting
      const params = new URLSearchParams(searchParams.toString());
      window.location.replace(
        `https://www.ghadaqplus.com/payment/status?${params.toString()}`,
      );
    }
  }, [orderNumber, searchParams]);

  // Fetch order status from server
  useEffect(() => {
    if (!orderNumber || orderNumber.startsWith('GHD-')) return;

    fetch(`/api/payment/status?orderNumber=${orderNumber}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setOrderData(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }, [orderNumber]);

  // Derive display status
  const serverStatus = orderData?.status;
  let status: 'success' | 'pending' | 'failed' = 'pending';
  if (serverStatus === 'paid') {
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
  const referralInfo = orderData?.referralInfo || null;
  const whatsappTarget = referralInfo?.phone || MAIN_WHATSAPP;
  const whatsappPhone = whatsappTarget
    .replace(/[\s\-+()]/g, '')
    .replace(/^0+/, '');

  const formattedRemainingAmount =
    orderData && orderData.remainingAmount > 0
      ? `${orderData.remainingAmount.toLocaleString('ar-EG')} ${orderData.currency}`
      : 'لا يوجد مبلغ متبقٍ';

  const reservationLines =
    orderData?.reservationData
      ?.map((field) => {
        const label = field.label.ar || field.label.en;
        const value = field.value?.trim() || '-';
        if (field.type === 'picture') {
          return `${label}: ${value}`;
        }
        return `${label}: ${value}`;
      })
      .filter(Boolean) || [];

  const orderItemLines =
    orderData?.items
      ?.map((item) => {
        const name = item.productName.ar || item.productName.en;
        return `- ${name} × ${item.quantity}`;
      })
      .filter(Boolean) || [];

  const whatsappMessage = orderData
    ? [
        'السلام عليكم،',
        '',
        'تفاصيل الطلب:',
        `رقم الطلب: ${orderData.orderNumber}`,
        `الاسم: ${orderData.billingData.fullName}`,
        `رقم الجوال: ${orderData.billingData.phone}`,
        `المتبقي: ${formattedRemainingAmount}`,
        '',
        'الطلبات:',
        ...(orderItemLines.length > 0 ? orderItemLines : ['- لا توجد عناصر']),
        '',
        'بيانات الحجز:',
        ...(reservationLines.length > 0
          ? reservationLines
          : ['- لا توجد بيانات حجز']),
      ].join('\n')
    : 'السلام عليكم، أحتاج المساعدة بخصوص حالة الدفع للطلب.';

  const whatsappHref = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappMessage)}`;

  // If redirecting ghadaq user, show loading
  if (orderNumber?.startsWith('GHD-')) {
    return (
      <>
        <Header />
        <main className="grid-bg min-h-screen flex items-center justify-center">
          <Container>
            <div className="max-w-md mx-auto text-center py-16">
              <div className="w-20 h-20 mx-auto rounded-full bg-secondary/10 flex items-center justify-center mb-6">
                <Clock size={40} className="text-secondary animate-pulse" />
              </div>
              <p className="text-secondary">{t('redirecting')}</p>
            </div>
          </Container>
        </main>
        <Footer />
      </>
    );
  }

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
                {orderNumber && (
                  <span className="text-xs font-mono text-secondary">
                    #{orderNumber}
                  </span>
                )}
                {amount && currency && (
                  <span className={`text-xl font-bold ${config.color} ltr`}>
                    {amount} {currency}
                  </span>
                )}
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
                              <span className="font-medium text-end whitespace-pre-line">
                                {field.value}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {status === 'success' && (
                <Button
                  variant="primary"
                  href={whatsappHref}
                  className="bg-[#25D366]! hover:bg-[#1da851]! flex items-center justify-center gap-2"
                >
                  <Image
                    src="/icons/whatsapp.svg"
                    alt="WhatsApp"
                    width={20}
                    height={20}
                  />
                  {referralInfo
                    ? t('contactReferral', { name: referralInfo.name })
                    : t('contactWhatsApp')}
                </Button>
              )}
              <Button variant="primary" href="/">
                {t('backHome')}
              </Button>
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
