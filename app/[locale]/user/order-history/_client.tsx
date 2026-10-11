'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams, usePathname } from 'next/navigation';
import { useRouter } from '@/i18n/routing';

import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import Container from '@/components/layout/container';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Loader2,
  Package,
  Receipt,
  Search,
  Sparkles,
  Wallet,
  X,
  ClipboardList,
  Image as ImageIcon,
} from 'lucide-react';

import Button from '@/components/ui/button';
import Loading from '@/components/ui/loading';
import { openPayment } from '@/components/payment/payment-sheet';

interface OrderItem {
  productId: string;
  productSlug: string;
  productName: { ar: string; en: string };
  price: number;
  currency: string;
  quantity: number;
  sizeIndex: number;
  sizeName?: { ar: string; en: string };
  isAddOn?: boolean;
}

interface ReservationAnswer {
  key: string;
  label?: { ar?: string; en?: string };
  type?: string;
  value?: string;
}

interface OrderDesign {
  url: string;
  productName: string;
  templateType: 'text' | 'image';
  reviewed: boolean;
}

interface ReceiptPayment {
  id: string;
  amount: number;
  currency: string;
  method: string | null;
  reference: string | null;
  paidAt: string;
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
  reservationData?: ReservationAnswer[];
  designs?: OrderDesign[];
  payments?: ReceiptPayment[];
  couponCode?: string | null;
  couponDiscount?: number;
}

type Filter = 'all' | 'due' | 'done';

const numLocale = (locale: string) => (locale === 'ar' ? 'ar-u-nu-latn' : locale);

function formatMoney(amount: number, currency: string, locale: string): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const digits = Number.isInteger(value) ? 0 : 2;
  const number = new Intl.NumberFormat(numLocale(locale), {
    minimumFractionDigits: digits,
    maximumFractionDigits: 2,
  }).format(value);
  return `${number} ${(currency || '').toUpperCase()}`.trim();
}

function formatDate(value: string, locale: string, withTime = false): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(numLocale(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(d);
}

/** A stored execution date ("YYYY-MM-DD") read as a calendar day, not a UTC instant. */
function formatDay(value: string, locale: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!iso) return value;
  const d = new Date(+iso[1], +iso[2] - 1, +iso[3]);
  return new Intl.DateTimeFormat(numLocale(locale), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

const isDue = (o: Order) => o.remainingAmount > 0.001;

/** The order's state as the customer should read it. */
function stateOf(o: Order): 'completed' | 'paid' | 'partial' {
  if (o.status === 'completed') return 'completed';
  if (isDue(o) || o.status === 'partial-paid') return 'partial';
  return 'paid';
}

const STATE_STYLE: Record<ReturnType<typeof stateOf>, string> = {
  paid: 'bg-success/12 text-success ring-success/25',
  partial: 'bg-warning/12 text-warning ring-warning/30',
  completed: 'bg-info/12 text-info ring-info/25',
};

function nameOf(n: { ar?: string; en?: string } | undefined, locale: string): string {
  if (!n) return '';
  return (locale === 'ar' ? n.ar || n.en : n.en || n.ar) || '';
}

/* ─────────────── one order ─────────────── */

function OrderCard({
  order,
  locale,
  payingOrderId,
  onPay,
  onOpenImage,
  index,
}: {
  order: Order;
  locale: string;
  payingOrderId: string | null;
  onPay: (order: Order) => void;
  onOpenImage: (url: string) => void;
  index: number;
}) {
  const t = useTranslations('auth.orders');
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const state = stateOf(order);
  const items = order.items || [];
  const main = items.find((i) => !i.isAddOn) || items[0];
  const others = Math.max(0, items.length - 1);
  const due = isDue(order);
  const paidPct =
    order.fullAmount > 0 ? Math.min(100, Math.max(0, Math.round((order.paidAmount / order.fullAmount) * 100))) : 100;
  const canShowPaymentAction =
    order.status !== 'completed' && (order.canCompleteOrder || order.canPayRemainingAmount);
  const answers = (order.reservationData || []).filter(
    (a) => a && typeof a.value === 'string' && a.value.trim() && !['none', 'null', 'undefined'].includes(a.value.trim()),
  );
  const designs = order.designs || [];
  const payments = order.payments || [];

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(order.orderNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // the number stays on screen to copy by hand
    }
  };

  return (
    <article
      className="oh-card group relative overflow-hidden rounded-3xl border border-foreground/10 bg-background shadow-sm transition-shadow duration-300 hover:shadow-lg"
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
    >
      <div className="p-5 sm:p-6">
        {/* head: what was ordered, its number and date, and its state */}
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Package size={26} strokeWidth={1.8} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h3 className="min-w-0 text-lg font-bold leading-snug text-foreground sm:text-xl">
                {nameOf(main?.productName, locale) || t('fields.product')}
              </h3>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${STATE_STYLE[state]}`}>
                {state === 'partial' ? <Wallet size={13} /> : <CheckCircle2 size={13} />}
                {t(`state.${state}`)}
              </span>
            </div>

            {others > 0 ? (
              <p className="mt-1 text-sm text-secondary">{t('moreItems', { count: others })}</p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-secondary">
              <button
                type="button"
                onClick={copyNumber}
                className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 -mx-1.5 font-medium transition-colors hover:bg-foreground/5 hover:text-foreground"
                title={t('copyNumber')}
              >
                <span dir="ltr" className="font-semibold tabular-nums">#{order.orderNumber}</span>
                {copied ? <Check size={14} className="text-success" /> : <Copy size={13} />}
                <span className="sr-only">{copied ? t('copied') : t('copyNumber')}</span>
              </button>
              <span>{formatDate(order.createdAt, locale)}</span>
            </div>
          </div>
        </div>

        {/* the money: one line when paid, a progress bar while something remains */}
        <div className="mt-5 rounded-2xl bg-foreground/[0.035] p-4 dark:bg-foreground/[0.06]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs text-secondary">{t('total')}</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
                {formatMoney(order.fullAmount, order.currency, locale)}
              </p>
            </div>
            {due ? (
              <div className="text-end">
                <p className="text-xs text-secondary">{t('remaining')}</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-warning">
                  {formatMoney(order.remainingAmount, order.currency, locale)}
                </p>
              </div>
            ) : (
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
                <CheckCircle2 size={16} />
                {t('fullyPaid')}
              </p>
            )}
          </div>

          {due ? (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
                <div className="oh-bar h-full rounded-full bg-success" style={{ width: `${paidPct}%` }} />
              </div>
              <p className="mt-2 text-xs text-secondary">
                {t('paidLabel')}{' '}<bdi className="font-semibold text-foreground">{formatMoney(order.paidAmount, order.currency, locale)}</bdi>{' '}<bdi>({paidPct}%)</bdi>
              </p>
            </div>
          ) : null}
        </div>

        {/* what the customer can do */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          {canShowPaymentAction ? (
            <Button
              onClick={() => onPay(order)}
              disabled={payingOrderId === order._id}
              variant="primary"
              className="h-12 rounded-2xl px-6 text-base font-semibold sm:min-w-56"
            >
              {payingOrderId === order._id ? (
                <Loader2 size={18} className="animate-spin" />
              ) : order.canCompleteOrder ? (
                t('completeOrder')
              ) : (
                t('payRemaining', { amount: formatMoney(order.remainingAmount, order.currency, locale) })
              )}
            </Button>
          ) : null}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5 sm:ms-auto"
          >
            {open ? t('hideDetails') : t('showDetails')}
            {designs.length > 0 && !open ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-xs text-primary">
                <ImageIcon size={12} />
                {t('designReady')}
              </span>
            ) : null}
            <ChevronDown size={18} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* the details, opened on demand */}
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-6 border-t border-stroke/30 p-5 sm:p-6">
            {/* products */}
            <section>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                <ClipboardList size={16} className="text-primary" />
                {t('items')}
              </h4>
              <ul className="divide-y divide-stroke/25 overflow-hidden rounded-2xl border border-stroke/30">
                {items.map((item, i) => {
                  const size = nameOf(item.sizeName, locale);
                  return (
                    <li key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">
                          {nameOf(item.productName, locale) || '—'}
                        </p>
                        {size || item.isAddOn ? (
                          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-secondary">
                            {item.isAddOn ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{t('addOn')}</span> : null}
                            {size ? <span>{size}</span> : null}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded-lg bg-foreground/5 px-2 py-1 text-sm font-semibold tabular-nums text-foreground" dir="ltr">
                        ×{item.quantity || 1}
                      </span>
                      <span className="w-28 shrink-0 text-end text-sm font-semibold tabular-nums text-foreground">
                        {formatMoney(item.price * (item.quantity || 1), item.currency || order.currency, locale)}
                      </span>
                    </li>
                  );
                })}
                {order.couponCode && order.couponDiscount ? (
                  <li className="flex items-center justify-between gap-3 bg-success/5 px-4 py-3 text-sm">
                    <span className="text-secondary">
                      {t('coupon')} <b dir="ltr" className="text-foreground">{order.couponCode}</b>
                    </span>
                    <span className="font-semibold tabular-nums text-success">
                      −{formatMoney(order.couponDiscount, order.currency, locale)}
                    </span>
                  </li>
                ) : null}
              </ul>
            </section>

            {/* the booking details the customer entered */}
            {answers.length > 0 ? (
              <section>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                  <Sparkles size={16} className="text-primary" />
                  {t('reservation')}
                </h4>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {answers.map((a, i) => (
                    <div key={`${a.key}-${i}`} className={`rounded-2xl bg-foreground/[0.035] px-4 py-3 dark:bg-foreground/[0.06] ${a.type === 'textarea' || a.key === 'shortDuaa' ? 'sm:col-span-2' : ''}`}>
                      <dt className="text-xs text-secondary">{nameOf(a.label, locale) || a.key}</dt>
                      <dd className="mt-1 whitespace-pre-line font-semibold leading-relaxed text-foreground">
                        {a.type === 'picture' && /^https?:\/\//.test(a.value || '') ? (
                          <button type="button" onClick={() => onOpenImage(a.value as string)} className="mt-1 block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={a.value} alt="" loading="lazy" className="h-20 w-20 rounded-xl object-cover" />
                          </button>
                        ) : a.type === 'date' || a.key === 'executionDate' ? (
                          formatDay(a.value as string, locale)
                        ) : (
                          a.value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {/* the order's design, once it is ready */}
            {designs.length > 0 ? (
              <section>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                  <ImageIcon size={16} className="text-primary" />
                  {t('designs')}
                </h4>
                <div className="flex flex-wrap gap-3">
                  {designs.map((d, i) => (
                    <button
                      key={`${d.url}-${i}`}
                      type="button"
                      onClick={() => onOpenImage(d.url)}
                      className="group/d relative overflow-hidden rounded-2xl border border-stroke/30 bg-foreground/5"
                      title={d.productName || t('designs')}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={d.url} alt={d.productName || t('designs')} loading="lazy" className="h-36 w-36 object-cover transition-transform duration-300 group-hover/d:scale-105" />
                      {d.productName ? (
                        <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1 text-xs text-white">{d.productName}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {/* the payments made on this order */}
            {payments.length > 0 ? (
              <section>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                  <Receipt size={16} className="text-primary" />
                  {t('payments')}
                </h4>
                <ol className="relative space-y-3 ps-6">
                  <span aria-hidden className="absolute inset-y-2 start-[7px] w-0.5 rounded bg-success/30" />
                  {payments.map((p) => (
                    <li key={p.id} className="relative">
                      <span aria-hidden className="absolute -start-6 top-1.5 h-4 w-4 rounded-full border-[3px] border-background bg-success ring-1 ring-success/40" />
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <span className="font-bold tabular-nums text-foreground">{formatMoney(p.amount, p.currency || order.currency, locale)}</span>
                        <span className="text-xs text-secondary">{formatDate(p.paidAt, locale, true)}</span>
                      </div>
                      {p.reference ? (
                        <p className="mt-0.5 text-xs text-secondary">
                          {t('reference')} <span dir="ltr" className="font-medium tabular-nums text-foreground">{p.reference}</span>
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ─────────────── the page ─────────────── */

export default function OrdersPage() {
  const t = useTranslations('auth.orders');
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState(searchParams.get('orderNum') || '');
  const [filter, setFilter] = useState<Filter>('all');
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/orders/my-orders');
        if (!response.ok) {
          if (response.status === 401) {
            router.push(`/auth/login?callback=${encodeURIComponent(pathname)}`);
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
  }, [router, pathname]);

  useEffect(() => {
    const orderNum = searchParams.get('orderNum');
    if (orderNum) {
      setSearch(orderNum);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!image) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setImage(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [image]);

  const dueCount = useMemo(() => orders.filter(isDue).length, [orders]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (filter === 'due' && !isDue(order)) return false;
      if (filter === 'done' && isDue(order)) return false;
      if (!q) return true;
      if (order.orderNumber.toLowerCase().includes(q)) return true;
      return (order.items || []).some(
        (i) => (i.productName?.ar || '').toLowerCase().includes(q) || (i.productName?.en || '').toLowerCase().includes(q),
      );
    });
  }, [orders, search, filter]);

  // the orders by month, newest first (as they come)
  const months = useMemo(() => {
    const groups: { key: string; title: string; orders: Order[] }[] = [];
    for (const o of filteredOrders) {
      const d = new Date(o.createdAt);
      const key = Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${d.getMonth()}`;
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.orders.push(o);
      else
        groups.push({
          key,
          title: Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat(numLocale(locale), { month: 'long', year: 'numeric' }).format(d),
          orders: [o],
        });
    }
    return groups;
  }, [filteredOrders, locale]);

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

      // EasyKash: in the site's own sheet when it can be, otherwise by going to it as before
      if (result.data?.redirectUrl) {
        await openPayment(result.data.redirectUrl);
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

  const tabs: { id: Filter; label: string; count?: number }[] = [
    { id: 'all', label: t('filters.all'), count: orders.length },
    { id: 'due', label: t('filters.due'), count: dueCount },
    { id: 'done', label: t('filters.done'), count: orders.length - dueCount },
  ];
  let seq = 0;

  return (
    <>
      <Header />

      <main className="min-h-[70vh] bg-foreground/[0.02] py-8 md:px-8 md:py-10">
        <Container>
          <div className="mx-auto max-w-3xl">
            {/* page head */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{t('title')}</h1>
              <p className="mt-2 text-secondary">
                {orders.length > 0 ? t('summary', { count: orders.length }) : t('subtitle')}
              </p>
            </div>

            {/* something left to pay: said once, at the top */}
            {dueCount > 0 ? (
              <button
                type="button"
                onClick={() => setFilter('due')}
                className="mb-6 flex w-full items-center gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-start text-sm font-semibold text-foreground transition-colors hover:bg-warning/15"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning">
                  <Wallet size={18} />
                </span>
                <span className="flex-1">{t('dueNotice', { count: dueCount })}</span>
                {locale === 'ar' ? <ArrowLeft size={18} className="text-secondary" /> : <ArrowRight size={18} className="text-secondary" />}
              </button>
            ) : null}

            {/* search and filters */}
            {orders.length > 0 ? (
              <div className="mb-8 space-y-3">
                <div className="relative">
                  <Search size={18} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-secondary" />
                  <input
                    type="search"
                    placeholder={t('searchPlaceholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-stroke/40 bg-background ps-11 pe-4 text-sm text-foreground outline-none transition-all placeholder:text-secondary focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={filter === tab.id}
                      onClick={() => setFilter(tab.id)}
                      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-all ${filter === tab.id
                        ? 'bg-foreground text-background shadow-md'
                        : 'bg-background text-secondary ring-1 ring-stroke/30 hover:text-foreground'
                        }`}
                    >
                      {tab.label}
                      <span className={`rounded-full px-1.5 text-xs tabular-nums ${filter === tab.id ? 'bg-background/20' : 'bg-foreground/5'}`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {error && (
              <div className="mb-6 rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}

            {filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center rounded-3xl border border-dashed border-stroke/50 bg-background px-6 py-16 text-center">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Package size={34} />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">
                  {orders.length > 0 ? t('noMatch') : t('noOrders')}
                </h3>
                <p className="mb-6 max-w-md text-secondary">
                  {orders.length > 0 ? t('noMatchHint') : t('startShopping')}
                </p>
                {orders.length > 0 ? (
                  <Button
                    variant="outline"
                    className="rounded-2xl px-5 py-2.5"
                    onClick={() => {
                      setSearch('');
                      setFilter('all');
                    }}
                  >
                    {t('showAll')}
                  </Button>
                ) : (
                  <Button href="/products" variant="outline" className="rounded-2xl px-5 py-2.5">
                    {t('shop')}
                    {locale === 'ar' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {months.map((m) => (
                  <section key={m.key || m.title}>
                    {m.title ? (
                      <h2 className="mb-3 flex items-center gap-3 text-sm font-bold text-secondary">
                        {m.title}
                        <span className="h-px flex-1 bg-stroke/25" />
                      </h2>
                    ) : null}
                    <div className="space-y-4">
                      {m.orders.map((order) => (
                        <OrderCard
                          key={order._id}
                          order={order}
                          locale={locale}
                          payingOrderId={payingOrderId}
                          onPay={handlePayRemainingAmount}
                          onOpenImage={setImage}
                          index={seq++}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </Container>
      </main>

      {/* a picture opened full size */}
      {image ? (
        <div
          className="oh-lightbox fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setImage(null)}
            className="absolute end-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
            aria-label={t('close')}
          >
            <X size={22} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt=""
            className="max-h-[88vh] max-w-full rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}

      <style>{`
        .oh-card{animation:oh-in .45s cubic-bezier(.2,.8,.2,1) both}
        .oh-bar{animation:oh-grow .8s cubic-bezier(.2,.8,.2,1) .15s both}
        .oh-lightbox{animation:oh-fade .2s ease-out both}
        @keyframes oh-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes oh-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        @keyframes oh-fade{from{opacity:0}to{opacity:1}}
        [dir="rtl"] .oh-bar{transform-origin:right}
        [dir="ltr"] .oh-bar{transform-origin:left}
        @media (prefers-reduced-motion:reduce){.oh-card,.oh-bar,.oh-lightbox{animation:none}}
      `}</style>

      <Footer />
    </>
  );
}
