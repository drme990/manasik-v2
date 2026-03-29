'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import Container from '@/components/layout/container';
import { ArrowRight, Loader2 } from 'lucide-react';
import Button from '@/components/ui/button';
import Loading from '@/components/ui/loading';

interface Order {
  _id: string;
  orderNumber: string;
  product: {
    name: string;
    slug?: string;
  };
  quantity: number;
  fullAmount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  isPartialPayment: boolean;
  hasActivePendingPayment: boolean;
  canCompleteOrder: boolean;
  canPayRemainingAmount: boolean;
  createdAt: string;
}

export default function OrdersPage() {
  const t = useTranslations('auth.orders');
  const router = useRouter();
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/orders/my-orders');
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/auth/login');
            return;
          }
          throw new Error('Failed to fetch orders');
        }

        const { data } = await response.json();
        setOrders(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [router]);

  const handlePayRemainingAmount = async (order: Order) => {
    setPayingOrderId(order._id);
    try {
      const response = await fetch('/api/payment/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: order.orderNumber }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(result.error || 'Failed to create payment link');
        return;
      }

      // Redirect to EasyKash
      if (result.data?.redirectUrl) {
        window.location.href = result.data.redirectUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setPayingOrderId(null);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-[70vh] px-4 py-10 md:px-8">
          <Container>
            <Loading size="lg" />
          </Container>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-[70vh] px-4 py-10 md:px-8">
        <Container>
          <div className="mx-auto max-w-6xl">
            <h1 className="mb-2 text-3xl font-semibold text-foreground">
              {t('title')}
            </h1>
            <p className="mb-6 text-secondary">{t('subtitle')}</p>

            {error && (
              <div className="mb-4 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-foreground">
                {error}
              </div>
            )}

            {orders.length === 0 ? (
              <div className="rounded-site border border-stroke bg-background/80 p-8 flex flex-col items-center text-center">
                <p className="mb-4 text-secondary">{t('noOrders')}</p>
                <Button href="/products" variant="outline" className="w-fit">
                  {locale === 'ar' ? 'شراء منتجات' : 'Shop Products'}
                  <ArrowRight size={16} />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order._id}
                    className="rounded-site border border-stroke bg-background/80 p-6"
                  >
                    {/* Header with order number and date */}
                    <div className="mb-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {order.orderNumber}
                        </h3>
                        <p className="text-xs text-secondary">
                          {locale === 'ar' ? 'تاريخ الطلب: ' : 'Order Date: '}
                          {new Date(order.createdAt).toLocaleDateString(locale)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-secondary uppercase">
                          {t('fields.status')}
                        </p>
                        <p className="font-semibold text-foreground">
                          {order.status}
                        </p>
                      </div>
                    </div>

                    {/* Product info */}
                    <div className="mb-4 pb-4 border-b border-stroke/50">
                      <p className="text-xs text-secondary uppercase mb-2">
                        {t('fields.product')}
                      </p>
                      <p className="font-semibold text-foreground">
                        {order.product?.name || 'N/A'}
                      </p>
                      <p className="text-sm text-secondary">
                        {locale === 'ar' ? 'الكمية: ' : 'Quantity: '}
                        {order.quantity}
                      </p>
                    </div>

                    {/* Payment details grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-secondary uppercase mb-1">
                          {locale === 'ar' ? 'المبلغ الكامل' : 'Full Amount'}
                        </p>
                        <p className="font-semibold text-foreground">
                          {order.fullAmount} {order.currency}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-secondary uppercase mb-1">
                          {locale === 'ar' ? 'المبلغ المدفوع' : 'Paid Amount'}
                        </p>
                        <p className="font-semibold text-success">
                          {order.paidAmount} {order.currency}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-secondary uppercase mb-1">
                          {locale === 'ar' ? 'المبلغ المتبقي' : 'Remaining'}
                        </p>
                        <p
                          className={`font-semibold ${
                            order.remainingAmount > 0
                              ? 'text-error'
                              : 'text-success'
                          }`}
                        >
                          {order.remainingAmount} {order.currency}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-secondary uppercase mb-1">
                          {locale === 'ar' ? 'حالة الدفع' : 'Payment Status'}
                        </p>
                        <p className="font-semibold text-foreground">
                          {order.paymentStatus}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {(order.canCompleteOrder ||
                      order.canPayRemainingAmount) && (
                      <div className="flex gap-2">
                        {order.canCompleteOrder && (
                          <Button
                            onClick={() => handlePayRemainingAmount(order)}
                            disabled={payingOrderId === order._id}
                            variant="primary"
                            className="flex-1"
                          >
                            {payingOrderId === order._id && (
                              <Loader2 size={16} className="animate-spin" />
                            )}
                            {locale === 'ar' ? 'إكمال الطلب' : 'Complete Order'}
                          </Button>
                        )}

                        {order.canPayRemainingAmount && (
                          <Button
                            onClick={() => handlePayRemainingAmount(order)}
                            disabled={payingOrderId === order._id}
                            variant="primary"
                            className="flex-1"
                          >
                            {payingOrderId === order._id && (
                              <Loader2 size={16} className="animate-spin" />
                            )}
                            {locale === 'ar'
                              ? 'دفع المبلغ المتبقي'
                              : 'Pay Remaining Amount'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
