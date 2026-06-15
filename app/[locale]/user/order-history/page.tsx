'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import Container from '@/components/layout/container';
import {
  ArrowRight,
  Loader2,
  Package,
  Search,
  CalendarDays,
  CreditCard,
  CircleDollarSign,
} from 'lucide-react';

import Button from '@/components/ui/button';
import Loading from '@/components/ui/loading';

interface OrderItem {
  productId: string;
  productSlug: string;
  productName: {
    ar: string;
    en: string;
  };
  price: number;
  currency: string;
  quantity: number;
  sizeIndex: number;
  sizeName: {
    ar: string;
    en: string;
  };
}

interface Order {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  fullAmount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  isPartialPayment: boolean;
  hasActivePendingPayment: boolean;
  canCompleteOrder: boolean;
  canPayRemainingAmount: boolean;
  createdAt: string;
}

interface OrderCardProps {
  order: Order;
  locale: string;
  payingOrderId: string | null;
  onPay: (order: Order) => void;
}

function OrderCard({ order, locale, payingOrderId, onPay }: OrderCardProps) {
  const t = useTranslations('auth.orders');
  const canShowPaymentAction =
    order.status !== 'completed' &&
    (order.canCompleteOrder || order.canPayRemainingAmount);

  const paymentStatusStyles = {
    paid: 'bg-success/15 text-success border-success/20',
    partial: 'bg-warning/15 text-warning border-warning/20',
    pending: 'bg-error/15 text-error border-error/20',
  };

  const paymentStyle =
    paymentStatusStyles[
      order.paymentStatus as keyof typeof paymentStatusStyles
    ] || 'bg-muted text-foreground border-stroke';

  return (
    <div className="group overflow-hidden rounded-3xl border border-stroke/60 bg-background/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      {/* Header */}
      <div className="flex flex-col gap-5 border-b border-stroke/50 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-bold text-foreground">
              #{order.orderNumber}
            </h3>
          </div>

          <div className="flex items-center gap-2 text-sm text-secondary">
            <CalendarDays size={16} />
            <span>
              {locale === 'ar' ? 'تاريخ الطلب:' : 'Order Date:'}{' '}
              {new Date(order.createdAt).toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Status Box */}
        <div className="rounded-2xl border border-stroke/50 bg-muted/30 px-5 py-4">
          <p className="mb-1 text-xs uppercase text-secondary">
            {t('fields.status')}
          </p>

          <p
            className={`font-semibold capitalize text-foreground ${paymentStyle}`}
          >
            {order.status}
          </p>
        </div>
      </div>

      {/* Products Section */}
      <div className="border-b border-stroke/50 p-6">
        <p className="mb-4 text-xs uppercase tracking-wide text-secondary">
          {t('fields.product')}
        </p>

        <div className="space-y-4">
          {order.items && order.items.length > 0 ? (
            order.items.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-4 rounded-2xl border border-stroke/40 bg-muted/20 p-4"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Package size={20} />
                </div>

                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">
                    {locale === 'ar'
                      ? item.productName?.ar || 'N/A'
                      : item.productName?.en || 'N/A'}
                  </h4>

                  <p className="mt-1 text-sm text-secondary">
                    {locale === 'ar' ? 'الكمية:' : 'Quantity:'}{' '}
                    <span className="font-medium text-foreground">
                      {item.quantity}
                    </span>
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    {item.price} {item.currency}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-secondary">N/A</p>
          )}
        </div>
      </div>

      {/* Financial Overview */}
      <div className="border-b border-stroke/50 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-stroke/40 bg-muted/20 p-4">
            <div className="mb-2 flex items-center gap-2 text-secondary">
              <CircleDollarSign size={16} />
              <p className="text-xs uppercase">
                {locale === 'ar' ? 'الإجمالي' : 'Full Amount'}
              </p>
            </div>

            <p className="text-lg font-bold text-foreground">
              {order.fullAmount} {order.currency}
            </p>
          </div>

          <div className="rounded-2xl border border-stroke/40 bg-success/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-secondary">
              <CreditCard size={16} />
              <p className="text-xs uppercase">
                {locale === 'ar' ? 'المدفوع' : 'Paid'}
              </p>
            </div>

            <p className="text-lg font-bold text-success">
              {order.paidAmount} {order.currency}
            </p>
          </div>

          <div className="rounded-2xl border border-stroke/40 bg-error/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-secondary">
              <CircleDollarSign size={16} />
              <p className="text-xs uppercase">
                {locale === 'ar' ? 'المتبقي' : 'Remaining'}
              </p>
            </div>

            <p
              className={`text-lg font-bold ${
                order.remainingAmount > 0 ? 'text-error' : 'text-success'
              }`}
            >
              {order.remainingAmount} {order.currency}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      {canShowPaymentAction && (
        <div className="p-6">
          <Button
            onClick={() => onPay(order)}
            disabled={payingOrderId === order._id}
            variant="primary"
            className="h-12 w-full rounded-2xl text-base font-medium"
          >
            {payingOrderId === order._id ? (
              <Loader2 size={18} className="animate-spin" />
            ) : locale === 'ar' ? (
              order.canCompleteOrder ? (
                'إكمال الطلب'
              ) : (
                'دفع المبلغ المتبقي'
              )
            ) : order.canCompleteOrder ? (
              'Complete Order'
            ) : (
              'Pay Remaining Amount'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const t = useTranslations('auth.orders');
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState(searchParams.get('orderNum') || '');
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

  useEffect(() => {
    const orderNum = searchParams.get('orderNum');
    if (orderNum) {
      setSearch(orderNum);
    }
  }, [searchParams]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) =>
      order.orderNumber.toLowerCase().includes(search.toLowerCase()),
    );
  }, [orders, search]);

  const handlePayRemainingAmount = async (order: Order) => {
    setPayingOrderId(order._id);
    try {
      const response = await fetch('/api/payment/links', {
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

      <main className="min-h-[70vh] bg-muted/20 px-4 py-10 md:px-8">
        <Container>
          <div className="mx-auto max-w-7xl">
            {/* Page Header */}
            <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="mb-2 text-4xl font-bold text-foreground">
                  {t('title')}
                </h1>

                <p className="text-secondary">{t('subtitle')}</p>
              </div>

              {/* Search */}
              <div className="relative w-full max-w-md">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary"
                />

                <input
                  type="text"
                  placeholder={
                    locale === 'ar'
                      ? 'ابحث برقم الطلب...'
                      : 'Search by order number...'
                  }
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-stroke bg-background pl-11 pr-4 text-sm outline-none transition-all focus:border-primary"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}

            {/* Empty */}
            {filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center rounded-3xl border border-dashed border-stroke bg-background/80 px-6 py-20 text-center">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Package size={34} />
                </div>

                <h3 className="mb-2 text-2xl font-semibold text-foreground">
                  {search
                    ? locale === 'ar'
                      ? 'لم يتم العثور على طلبات'
                      : 'No matching orders found'
                    : t('noOrders')}
                </h3>

                <p className="mb-6 max-w-md text-secondary">
                  {locale === 'ar'
                    ? 'ابدأ بالتسوق وسيظهر سجل الطلبات الخاص بك هنا.'
                    : 'Start shopping and your order history will appear here.'}
                </p>

                <Button
                  href="/products"
                  variant="outline"
                  className="rounded-2xl"
                  data-ref-track-action="navigate_products"
                  data-ref-track-button-label={
                    locale === 'ar' ? 'شراء منتجات' : 'Shop Products'
                  }
                  data-ref-track-meta={JSON.stringify({
                    source: 'order_history_empty',
                  })}
                >
                  {locale === 'ar' ? 'شراء منتجات' : 'Shop Products'}

                  <ArrowRight size={16} />
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order._id}
                    order={order}
                    locale={locale}
                    payingOrderId={payingOrderId}
                    onPay={handlePayRemainingAmount}
                  />
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
