'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import { AlertCircle, ArrowDown, Check, CheckCircle2, ChevronLeft, ChevronRight, ImageOff, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { LuMinus, LuPlus } from 'react-icons/lu';
import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import BackButton from '@/components/shared/back-button';
import WhatsAppButton from '@/components/shared/whats-app-button';
import CurrencySelector from '@/components/shared/currency-selector';
import Button from '@/components/ui/button';
import Modal from '@/components/ui/modal';
import { canOptimizeImage } from '@/lib/image';
import { getPrimaryProductImageUrl, type Product, type ProductSize } from '@/types/Product';
import { useCurrency, useDisplayCurrency, usePriceInCurrency } from '@/hooks/currency-hook';
import { fetchProducts } from '@/lib/fetch-products';

/**
 * حاسبة العقيقة (owner, 2026-10-12): the app's calculator brought to the site, in the site's own look.
 * Two sacrifices for a boy and one for a girl; a product covers `sacrificeCount` sacrifices (a calf can cover 7).
 * The same rules as before (and as the app, manasik-app src/core/calculator.ts): a single-cover animal is booked once
 * per sacrifice, a several-cover animal once; the added sacrifices are booked in their first size; one checkout per
 * product. What changed is how it is chosen: the counters say what each child needs, the sheep show the count, the
 * sacrifices are cards with their picture and price, the order card shows how much is covered, and the total and
 * the next step stay pinned under the thumb.
 */

const PLATFORM = 'manasik';
/** Sheep drawn at most; past it a "+N". */
const SHEEP_CAP = 12;

const isSizeAvailable = (size?: ProductSize) => !!size && size.isAvailable !== false;
const coverageOf = (p: Pick<Product, 'sacrificeCount'>) => {
  const n = p.sacrificeCount ?? 1;
  return n > 0 ? n : 1;
};
const canBeMain = (p: Product) => p.inStock !== false && p.sizes.some(isSizeAvailable);
const startingSize = (p: Product) => Math.max(0, p.sizes.findIndex(isSizeAvailable));

interface Extra {
  uid: number;
  productId: string;
}

export default function CalcAqeqaPage() {
  const t = useTranslations('calcAqeqa');
  const tCommon = useTranslations('common');
  const tProducts = useTranslations('products');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const router = useRouter();
  const getPrice = usePriceInCurrency();
  const { homeCountryCode, isLoading: currencyLoading } = useCurrency();
  const unit = useDisplayCurrency();

  const [males, setMales] = useState(0);
  const [females, setFemales] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [mainId, setMainId] = useState<string | null>(null);
  const [sizeIndex, setSizeIndex] = useState(0);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [nextUid, setNextUid] = useState(1);
  const [picker, setPicker] = useState(false);
  const [bookEach, setBookEach] = useState(false);
  // A product with several sizes waits for the customer's own choice of size before the order shows (owner, 2026-10-12).
  const [sizeChosen, setSizeChosen] = useState(false);
  // The pinned order's height, so nothing of the page (nor the WhatsApp key) hides under it.
  const bar = useRef<HTMLDivElement | null>(null);
  const [barH, setBarH] = useState(0);
  useEffect(() => {
    const el = bar.current;
    if (!el) {
      setBarH(0);
      return;
    }
    const ro = new ResizeObserver(() => setBarH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  });
  const [attempt, setAttempt] = useState(0);

  // Products only once the visitor's country is settled, so the first price shown is the right one.
  useEffect(() => {
    if (currencyLoading || !homeCountryCode) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    fetchProducts({ sacrifice: 'true', inStock: 'true', limit: '100', platform: PLATFORM, viewerCountryCode: homeCountryCode })
      .then((list) => {
        if (!cancelled) setProducts(list.filter((p) => p.slug));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currencyLoading, homeCountryCode, attempt]);

  const name = useCallback((p: Pick<Product, 'name'>) => (isAr ? p.name.ar : p.name.en), [isAr]);
  const money = useCallback((n: number) => `${n.toLocaleString('en-US')} ${unit}`, [unit]);
  const priceOf = useCallback((p: Product, idx: number) => getPrice((p.sizes[idx] ?? p.sizes[0])?.resolvedPrices)?.amount ?? null, [getPrice]);

  // ── the counts ──
  const required = males * 2 + females;
  const setCount = (who: 'm' | 'f', value: number) => {
    const m = who === 'm' ? Math.max(0, value) : males;
    const f = who === 'f' ? Math.max(0, value) : females;
    setMales(m);
    setFemales(f);
    // Both back at zero: the whole choice starts over.
    if (m === 0 && f === 0) {
      setMainId(null);
      setSizeIndex(0);
      setSizeChosen(false);
      setExtras([]);
    }
  };

  // ── the plan ──
  const main = useMemo(() => products.find((p) => p._id === mainId) ?? null, [products, mainId]);
  const pick = (p: Product) => {
    if (!canBeMain(p) || p._id === mainId) return;
    setMainId(p._id);
    setSizeIndex(startingSize(p));
    setSizeChosen(p.sizes.length <= 1);
    setExtras([]);
    // its sizes come next: bring them into view
    if (p.sizes.length > 1) setTimeout(() => document.getElementById('calc-size')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
  };

  const plan = useMemo(() => {
    if (!main || required === 0) return { covered: 0, remaining: required, sufficient: false, progress: 0, lines: [] as Array<{ product: Product; qty: number; size: number | null }> };
    const qty = coverageOf(main) === 1 ? required : 1;
    const lines: Array<{ product: Product; qty: number; size: number | null }> = [{ product: main, qty, size: sizeIndex }];
    let covered = qty * coverageOf(main);
    for (const e of extras) {
      const p = products.find((x) => x._id === e.productId);
      if (!p) continue;
      covered += coverageOf(p);
      const line = lines.find((l) => l.product._id === p._id);
      if (line) line.qty += 1;
      else lines.push({ product: p, qty: 1, size: null });
    }
    return { covered, remaining: Math.max(0, required - covered), sufficient: covered >= required, progress: Math.min(100, (covered / required) * 100), lines };
  }, [main, required, sizeIndex, extras, products]);

  const priced = plan.lines.map((l) => {
    const idx = l.size ?? 0;
    const unitPrice = priceOf(l.product, idx);
    return { ...l, amount: unitPrice === null ? null : unitPrice * l.qty, available: isSizeAvailable(l.product.sizes[idx] ?? l.product.sizes[0]) };
  });
  const total = priced.length && priced.every((l) => l.amount !== null) ? priced.reduce((s, l) => s + (l.amount ?? 0), 0) : null;
  const sizeOk = !main || isSizeAvailable(main.sizes[sizeIndex]);
  const ready = !!main && plan.sufficient && priced.every((l) => l.available);
  const several = plan.lines.length > 1;

  // An added sacrifice is booked in its first size (the main one again joins the main order in its size).
  const canAdd = (p: Product) => isSizeAvailable(p._id === mainId ? p.sizes[sizeIndex] : p.sizes[0]);
  // The added sacrifices are chosen as counts (owner, 2026-10-12): the window opens with what is already added, and
  // what is still missing already put on one single-cover sacrifice, each count changed with its own − and +.
  const [draft, setDraft] = useState<Record<string, number>>({});
  const openPicker = () => {
    const d: Record<string, number> = {};
    for (const e of extras) d[e.productId] = (d[e.productId] || 0) + 1;
    if (plan.remaining > 0) {
      const one = products.find((p) => coverageOf(p) === 1 && canAdd(p));
      if (one) d[one._id] = (d[one._id] || 0) + plan.remaining;
    }
    setDraft(d);
    setPicker(true);
  };
  const extrasCover = extras.reduce((sum, e) => sum + coverageOf(products.find((x) => x._id === e.productId) ?? {}), 0);
  const draftCover = Object.entries(draft).reduce((sum, [id, n]) => sum + n * coverageOf(products.find((x) => x._id === id) ?? {}), 0);
  const draftCovered = plan.covered - extrasCover + draftCover;
  const draftRemaining = Math.max(0, required - draftCovered);
  const applyDraft = () => {
    let uid = nextUid;
    const list: Extra[] = [];
    for (const p of products) for (let i = 0; i < (draft[p._id] || 0); i++) list.push({ uid: uid++, productId: p._id });
    setExtras(list);
    setNextUid(uid);
    setPicker(false);
  };

  const book = (l: { product: Product; qty: number; size: number | null }) => {
    const params = new URLSearchParams({ prod: l.product.slug, qty: String(l.qty) });
    if (l.size !== null) params.set('size', String(l.size));
    router.push(`/checkout?${params.toString()}`);
  };
  const onBook = () => {
    if (!ready) return;
    if (several) setBookEach(true);
    else book(plan.lines[0]);
  };
  const qtyName = (qty: number, p: Product) => `${qty}× ${name(p)}`;
  const needsMore = t('status.insufficient', { count: plan.remaining });

  return (
    <>
      <Header />
      <main className="grid-bg min-h-screen">
        <Container className="mx-auto max-w-2xl py-8">
          <BackButton className="mb-6" />
          <h1 className="mb-5 text-center text-3xl font-bold text-foreground md:text-4xl">{t('pageTitle')}</h1>

          {/* the saying the rule comes from */}
          <figure className="mb-8 rounded-site border border-primary/30 bg-card-bg px-5 py-6 text-center">
            <Image src="/icons3d/aqiqah-kids.svg" alt="" width={96} height={64} className="mx-auto mb-3" unoptimized aria-hidden />
            <blockquote className="text-lg font-semibold leading-9 text-foreground md:text-xl">{t('hadethText')}</blockquote>
            <figcaption className="mt-3 text-xs text-secondary">{t('hadethSource')}</figcaption>
          </figure>

          {/* 1 · how many children */}
          <section aria-labelledby="calc-children">
            <h2 id="calc-children" className="mb-3 text-xl font-bold text-foreground">{t('childrenCount')}</h2>
            <div className="grid grid-cols-2 gap-3">
              <Counter title={t('males')} hint={t('perBoy')} value={males} onChange={(v) => setCount('m', v)} />
              <Counter title={t('females')} hint={t('perGirl')} value={females} onChange={(v) => setCount('f', v)} />
            </div>
            {/* one place for the hint and the count that replaces it, so nothing below jumps */}
            <div className="mt-4 flex min-h-[92px] flex-col items-center justify-center gap-3">
              {required > 0 ? (
                <>
                  <SheepRow count={required} />
                  <p key={required} className="calc-pop inline-flex items-center gap-2 rounded-full border border-primary/40 bg-[color-mix(in_srgb,var(--primary)_14%,var(--card-bg))] px-4 py-1.5 text-sm font-bold text-primary">
                    <ShieldCheck size={16} aria-hidden />
                    {t('requiredCount', { count: required })}
                  </p>
                </>
              ) : (
                <p className="text-center text-sm text-secondary">{t('hint')}</p>
              )}
            </div>
          </section>

          {/* 2 · which sacrifice */}
          {required > 0 ? (
            <section aria-labelledby="calc-type" className="calc-rise mt-8">
              <div className="mb-3 flex items-center justify-between gap-3">
                {/* one title, and an arrow to the cards until one is chosen (owner, 2026-10-12) */}
                <h2 id="calc-type" className="flex min-w-0 items-center gap-2 text-xl font-bold text-foreground">
                  {t('selectSacrifice')}
                  {!main ? <ArrowDown size={22} className="calc-point shrink-0 text-primary" aria-hidden /> : null}
                </h2>
                <div className="shrink-0"><CurrencySelector /></div>
              </div>
              {failed ? (
                <div className="rounded-site border border-stroke bg-card-bg p-5 text-center">
                  <p className="mb-3 text-sm text-secondary">{t('loadFailed')}</p>
                  <Button variant="outline" size="sm" className="mx-auto" onClick={() => setAttempt((n) => n + 1)}>{t('retry')}</Button>
                </div>
              ) : loading ? (
                <Rail>{[0, 1, 2].map((i) => <CardSkeleton key={i} />)}</Rail>
              ) : products.length === 0 ? (
                <p className="text-sm text-secondary">{t('noSacrificeProducts')}</p>
              ) : (
                <Rail label={t('sacrificeType')}>
                  {products.map((p) => {
                    const sizes = p.sizes.filter(isSizeAvailable);
                    const cheapest = (sizes.length ? sizes : p.sizes).reduce<number | null>((best, s) => {
                      const a = getPrice(s.resolvedPrices)?.amount;
                      return a === undefined ? best : best === null ? a : Math.min(best, a);
                    }, null);
                    return (
                      <SacrificeCard
                        key={p._id}
                        product={p}
                        name={name(p)}
                        selected={p._id === mainId}
                        available={canBeMain(p)}
                        covers={coverageOf(p) > 1 ? t('covers', { count: coverageOf(p) }) : ''}
                        from={sizes.length > 1 ? tProducts('startsFrom') : ''}
                        price={cheapest === null ? null : money(cheapest)}
                        unavailable={tCommon('status.unavailable')}
                        onPick={() => pick(p)}
                      />
                    );
                  })}
                </Rail>
              )}
            </section>
          ) : null}

          {/* 3 · which size */}
          {main && main.sizes.length > 1 ? (
            <section aria-labelledby="calc-size" className="calc-rise mt-8">
              <h2 id="calc-size" className="mb-3 flex items-center gap-2 text-xl font-bold text-foreground">
                {t('sizeLabel')}
                {!sizeChosen ? <ArrowDown size={22} className="calc-point shrink-0 text-primary" aria-hidden /> : null}
              </h2>
              <div role="radiogroup" aria-labelledby="calc-size" className="grid grid-cols-2 gap-3">
                {main.sizes.map((size, i) => {
                  const selected = sizeChosen && i === sizeIndex;
                  const available = isSizeAvailable(size);
                  const price = getPrice(size.resolvedPrices)?.amount;
                  return (
                    <button
                      key={size._id ?? i}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={!available}
                      onClick={() => {
                        setSizeIndex(i);
                        setSizeChosen(true);
                      }}
                      className={`flex flex-col gap-1 rounded-site border p-3 text-start transition-all active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'border-primary bg-[color-mix(in_srgb,var(--primary)_14%,var(--card-bg))] shadow-[0_0_0_1px_var(--primary)]' : 'border-stroke bg-card-bg hover:border-primary/50'}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        {price !== undefined ? (
                          <span className={`text-lg font-bold tabular-nums ${selected ? 'text-primary' : 'text-foreground'}`}>{money(price)}</span>
                        ) : (
                          <span className="inline-block h-6 w-24 animate-pulse rounded bg-primary/20" />
                        )}
                        <span className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${selected ? 'border-primary bg-primary text-white' : 'border-stroke'}`}>
                          {selected ? <Check size={12} strokeWidth={3.2} /> : null}
                        </span>
                      </span>
                      <span className="text-xs text-secondary">{isAr ? size.name.ar : size.name.en}</span>
                      {!available ? <span className="text-[11px] font-bold text-error">{tCommon('status.unavailable')}</span> : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* 4 · the order: is it covered, what is in it, what it costs */}
          {main && sizeChosen ? (
            <section className="calc-rise mt-8 rounded-site border border-primary/35 bg-card-bg p-5 shadow-[0_18px_40px_-24px_rgba(0,0,0,.45)]" aria-live="polite">
              <p className={`flex items-center gap-2 font-bold ${plan.sufficient ? 'text-success' : 'text-warning'}`}>
                {plan.sufficient ? <CheckCircle2 size={20} aria-hidden /> : <AlertCircle size={20} aria-hidden />}
                {plan.sufficient ? t('status.sufficient') : needsMore}
              </p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-stroke/40" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(plan.progress)}>
                <div className={`h-full rounded-full transition-[width] duration-500 ease-out ${plan.sufficient ? 'bg-success' : 'bg-warning'}`} style={{ width: `${plan.progress}%` }} />
              </div>
              <p className="mt-2 text-xs tabular-nums text-secondary">{t('covered', { covered: Math.min(plan.covered, required), required })}</p>

              {extras.length ? (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-bold text-foreground">{t('additionalSacrifice')}</p>
                  {extras.map((e) => {
                    const p = products.find((x) => x._id === e.productId);
                    if (!p) return null;
                    return (
                      <div key={e.uid} className="flex items-center gap-2 rounded-site border border-stroke px-3 py-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{name(p)}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary" dir="ltr">+{coverageOf(p)}</span>
                        <button type="button" onClick={() => setExtras((list) => list.filter((x) => x.uid !== e.uid))} className="grid size-9 place-items-center rounded-full text-error transition hover:bg-error/10" aria-label={`${t('remove')} ${name(p)}`}>
                          <Trash2 size={17} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {!plan.sufficient ? (
                <button type="button" onClick={openPicker} className="mt-4 flex w-full items-center justify-center gap-2 rounded-site border border-dashed border-primary/60 py-3 text-sm font-bold text-primary transition hover:bg-primary/10">
                  <Plus size={18} aria-hidden />
                  {t('addMoreSacrifice')}
                </button>
              ) : null}

              <hr className="my-4 border-stroke" />
              <p className="mb-2 font-bold text-foreground">{t('summary')}</p>
              <div className="space-y-2">
                {priced.map((l) => {
                  const size = l.product.sizes[l.size ?? 0];
                  return (
                    <div key={l.product._id} className="flex items-start justify-between gap-3 text-sm">
                      <span className="min-w-0">
                        <span className="block font-medium text-foreground">{qtyName(l.qty, l.product)}</span>
                        {l.product.sizes.length > 1 && size ? (
                          <span className={`block text-xs ${l.available ? 'text-secondary' : 'text-error'}`}>
                            {isAr ? size.name.ar : size.name.en}
                            {l.available ? '' : ` · ${tCommon('status.unavailable')}`}
                          </span>
                        ) : null}
                      </span>
                      <Amount value={l.amount} money={money} className="font-semibold text-foreground" />
                    </div>
                  );
                })}
              </div>
              <hr className="my-4 border-stroke" />
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-foreground">{t('total')}</span>
                <Amount value={total} money={money} className="text-2xl font-bold text-primary" />
              </div>
            </section>
          ) : null}

          {ready && sizeChosen ? <p className="mt-3 text-center text-xs text-secondary">{t(several ? 'easykashMultiNote' : 'easykashSingleNote')}</p> : null}
          {/* room for the pinned order */}
          {barH ? <div style={{ height: barH }} aria-hidden /> : null}
        </Container>
      </main>

      {/* pinned: the total, what it is for, and the next step, always under the thumb */}
      {main && sizeChosen ? (
        <div ref={bar} className="calc-bar fixed inset-x-0 bottom-0 z-40 border-t border-stroke bg-background/90 backdrop-blur-md" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <div className="mx-auto flex max-w-2xl flex-col gap-2.5 px-4 pt-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-secondary">{t('total')}</p>
                {!sizeOk ? (
                  <p className="text-xs font-medium text-error">{t('sizeUnavailableNotice')}</p>
                ) : !plan.sufficient ? (
                  <p className="truncate text-sm font-bold text-warning">{needsMore}</p>
                ) : (
                  <p className="truncate text-sm font-medium text-foreground">{plan.lines.map((l) => qtyName(l.qty, l.product)).join(' + ')}</p>
                )}
              </div>
              <Amount value={total} money={money} className="shrink-0 text-2xl font-bold text-primary" />
            </div>
            {sizeOk && !plan.sufficient ? (
              <Button variant="outline" className="w-full gap-2" onClick={openPicker}>
                <Plus size={18} aria-hidden />
                {t('addMoreSacrifice')}
              </Button>
            ) : (
              <Button variant="primary" className="w-full gap-2 disabled:opacity-50" onClick={onBook} disabled={!ready}>
                {t('bookNow')}
                {isAr ? <ChevronLeft size={18} aria-hidden /> : <ChevronRight size={18} aria-hidden />}
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {/* add a sacrifice to cover what is left */}
      <Modal
        isOpen={picker}
        onClose={() => setPicker(false)}
        title={t('addMoreSacrifice')}
        footer={
          <Button variant="primary" className="w-full" onClick={applyDraft}>
            {t('applyExtras')}
          </Button>
        }
      >
        <div className="mb-3 space-y-2">
          <p className={`flex items-center gap-2 text-sm font-bold ${draftRemaining ? 'text-warning' : 'text-success'}`}>
            {draftRemaining ? <AlertCircle size={18} aria-hidden /> : <CheckCircle2 size={18} aria-hidden />}
            {draftRemaining ? t('status.insufficient', { count: draftRemaining }) : t('status.sufficient')}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-stroke/40">
            <div className={`h-full rounded-full transition-[width] duration-300 ${draftRemaining ? 'bg-warning' : 'bg-success'}`} style={{ width: `${Math.min(100, (draftCovered / Math.max(1, required)) * 100)}%` }} />
          </div>
          <p className="text-xs tabular-nums text-secondary">{t('covered', { covered: Math.min(draftCovered, required), required })}</p>
        </div>
        <div className="space-y-2">
          {products.map((p) => {
            const ok = canAdd(p);
            const price = priceOf(p, p._id === mainId ? sizeIndex : 0);
            const n = draft[p._id] || 0;
            const set = (v: number) => setDraft((d) => ({ ...d, [p._id]: Math.max(0, v) }));
            return (
              <div key={p._id} className={`flex items-center gap-3 rounded-site border p-2.5 transition-colors ${n ? 'border-primary/60 bg-[color-mix(in_srgb,var(--primary)_12%,var(--card-bg))]' : 'border-stroke bg-card-bg'} ${ok ? '' : 'opacity-50'}`}>
                <Thumb product={p} size={52} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-foreground">{name(p)}</span>
                  <span className="flex flex-wrap items-center gap-x-2 text-xs text-secondary">
                    {ok ? (price === null ? '' : money(price)) : tCommon('status.unavailable')}
                    {coverageOf(p) > 1 ? <span className="font-bold text-primary">{t('covers', { count: coverageOf(p) })}</span> : null}
                  </span>
                </span>
                {ok ? (
                  <span className="flex shrink-0 items-center gap-1.5" dir="ltr">
                    <button type="button" onClick={() => set(n - 1)} disabled={!n} aria-label={`${name(p)} −`} className="grid size-9 place-items-center rounded-full border border-stroke text-foreground transition active:scale-90 disabled:opacity-30">
                      <LuMinus size={16} />
                    </button>
                    <span key={n} className={`calc-pop w-6 text-center text-lg font-bold tabular-nums ${n ? 'text-primary' : 'text-secondary'}`}>{n}</span>
                    <button type="button" onClick={() => set(n + 1)} aria-label={`${name(p)} +`} className="grid size-9 place-items-center rounded-full bg-primary text-white transition active:scale-90">
                      <LuPlus size={16} />
                    </button>
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </Modal>

      {/* several products: one checkout each */}
      <Modal isOpen={bookEach && several} onClose={() => setBookEach(false)} title={t('checkoutEach').replace(/[:：]\s*$/, '')}>
        <p className="mb-3 text-sm text-secondary">{t('easykashMultiNote')}</p>
        <div className="space-y-2">
          {priced.map((l, i) => (
            <div key={l.product._id} className="flex items-center gap-3 rounded-site border border-stroke bg-card-bg p-2.5">
              <Thumb product={l.product} size={48} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-foreground">{qtyName(l.qty, l.product)}</span>
                <Amount value={l.amount} money={money} className="text-xs text-secondary" />
              </span>
              <Button variant={i === 0 ? 'primary' : 'outline'} size="sm" onClick={() => book(l)} disabled={!l.available}>
                {t('bookNow')}
              </Button>
            </div>
          ))}
        </div>
      </Modal>

      <style>{`
        @keyframes calc-pop { 0% { opacity: 0; transform: scale(.6) } 60% { opacity: 1; transform: scale(1.08) } 100% { transform: scale(1) } }
        @keyframes calc-rise { from { opacity: 0; transform: translateY(14px) } }
        @keyframes calc-bar { from { transform: translateY(100%) } }
        @keyframes calc-point { 0%, 100% { transform: translateY(-2px) } 50% { transform: translateY(4px) } }
        .calc-point { animation: calc-point 1.1s ease-in-out infinite }
        .calc-pop { animation: calc-pop .38s cubic-bezier(.2,.9,.3,1.2) both }
        .calc-rise { animation: calc-rise .4s cubic-bezier(.2,.8,.2,1) both }
        .calc-bar { animation: calc-bar .35s cubic-bezier(.2,.8,.2,1) both }
        .calc-rail { scrollbar-width: none } .calc-rail::-webkit-scrollbar { display: none }
        body:has(.calc-bar) a[aria-label="WhatsApp"] { bottom: calc(var(--calc-bar-h, 0px) + 12px) }
        body:has(.calc-bar[data-open="true"]) a[aria-label="WhatsApp"] { display: none }
        @media (prefers-reduced-motion: reduce) { .calc-pop, .calc-rise, .calc-bar, .calc-point { animation: none } }
      `}</style>
      {barH ? <style>{`:root { --calc-bar-h: ${barH}px }`}</style> : null}
      <WhatsAppButton />
      <Footer />
      {/* room under the footer for the pinned bar */}
      {barH ? <div style={{ height: barH }} aria-hidden /> : null}
    </>
  );
}

function Counter({ title, hint, value, onChange }: { title: string; hint: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className={`flex flex-col items-center gap-3 rounded-site border p-4 transition-colors ${value > 0 ? 'border-primary/60 bg-[color-mix(in_srgb,var(--primary)_14%,var(--card-bg))]' : 'border-stroke bg-card-bg'}`}>
      <div className="text-center">
        <p className="text-lg font-bold text-foreground">{title}</p>
        <p className="text-xs text-secondary">{hint}</p>
      </div>
      <div className="flex w-full items-center justify-between gap-2" dir="ltr">
        <button type="button" onClick={() => onChange(value - 1)} disabled={value === 0} aria-label={`${title} −`} className="grid size-11 place-items-center rounded-full border border-stroke text-foreground transition active:scale-90 disabled:opacity-30">
          <LuMinus size={18} />
        </button>
        <span key={value} className={`calc-pop min-w-8 text-center text-3xl font-bold tabular-nums ${value ? 'text-primary' : 'text-secondary'}`} aria-live="polite">{value}</span>
        <button type="button" onClick={() => onChange(value + 1)} aria-label={`${title} +`} className="grid size-11 place-items-center rounded-full bg-primary text-white shadow-[0_6px_16px_-6px_var(--primary)] transition active:scale-90">
          <LuPlus size={18} />
        </button>
      </div>
    </div>
  );
}

/** One sheep per sacrifice needed; each new one pops in. */
function SheepRow({ count }: { count: number }) {
  const shown = Math.min(count, SHEEP_CAP);
  return (
    <div className="flex flex-wrap items-center justify-center gap-1" aria-hidden>
      {Array.from({ length: shown }, (_, i) => (
        <Image key={i} src="/icons3d/sheep-face.svg" alt="" width={34} height={34} unoptimized className="calc-pop" style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }} />
      ))}
      {count > SHEEP_CAP ? <span className="ms-1 text-sm font-bold text-primary" dir="ltr">+{count - SHEEP_CAP}</span> : null}
    </div>
  );
}

function Rail({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div role={label ? 'radiogroup' : undefined} aria-label={label} className="calc-rail -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-7 pt-2">
      {children}
    </div>
  );
}

function Thumb({ product, size }: { product: Product; size: number }) {
  const src = getPrimaryProductImageUrl(product);
  return (
    <span className="relative block shrink-0 overflow-hidden rounded-[10px] bg-stroke/20" style={{ width: size, height: size }}>
      {src ? <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" unoptimized={!canOptimizeImage(src)} /> : <ImageOff size={18} className="m-auto mt-[35%] text-secondary" />}
    </span>
  );
}

function SacrificeCard({ product, name, selected, available, covers, from, price, unavailable, onPick }: { product: Product; name: string; selected: boolean; available: boolean; covers: string; from: string; price: string | null; unavailable: string; onPick: () => void }) {
  const src = getPrimaryProductImageUrl(product);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={!available}
      onClick={onPick}
      className={`group relative flex w-40 shrink-0 snap-start flex-col overflow-hidden rounded-site border text-start transition-all duration-200 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50 sm:w-44 ${selected ? 'border-primary bg-card-bg shadow-[0_0_0_2px_var(--primary),0_10px_20px_-12px_var(--primary)]' : 'border-stroke bg-card-bg hover:-translate-y-0.5 hover:border-primary/50'}`}
    >
      <span className="relative block aspect-square w-full overflow-hidden bg-stroke/20" dir="ltr">
        {src ? <Image src={src} alt={name} fill sizes="176px" className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized={!canOptimizeImage(src)} /> : <ImageOff className="absolute inset-0 m-auto text-secondary" size={22} />}
        {/* the choice's circle on every card: empty until chosen, so it is plain that one must be picked */}
        {selected ? (
          <span className="calc-pop absolute left-2 top-2 grid size-7 place-items-center rounded-full bg-primary text-white shadow">
            <Check size={15} strokeWidth={3} />
          </span>
        ) : available ? (
          <span className="absolute left-2 top-2 size-7 rounded-full border-[2.5px] border-white bg-[#000f2f] shadow-[0_1px_4px_rgba(0,0,0,.45)]" aria-hidden />
        ) : null}
        <span className="absolute bottom-2 right-2 flex flex-col items-end gap-1">
          {covers ? <span className="rounded-full bg-[#000f2f] px-2 py-0.5 text-xs font-bold text-white">{covers}</span> : null}
          {!available ? <span className="rounded-full bg-error px-2 py-0.5 text-[11px] font-bold text-white">{unavailable}</span> : null}
        </span>
      </span>
      <span className={`flex flex-1 flex-col gap-0.5 p-3 ${selected ? 'bg-[color-mix(in_srgb,var(--primary)_14%,var(--card-bg))]' : ''}`}>
        <span className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-foreground">{name}</span>
        <span className="min-h-4 text-[11px] text-secondary">{from}</span>
        {price ? <span className={`text-base font-bold tabular-nums ${selected ? 'text-primary' : 'text-foreground'}`}>{price}</span> : <span className="inline-block h-5 w-20 animate-pulse rounded bg-primary/20" />}
      </span>
    </button>
  );
}

function CardSkeleton() {
  return (
    <div className="flex w-40 shrink-0 flex-col overflow-hidden rounded-site border border-stroke bg-card-bg sm:w-44" aria-hidden>
      <div className="aspect-square w-full animate-pulse bg-stroke/30" />
      <div className="space-y-2 p-3">
        <div className="h-3.5 w-[86%] animate-pulse rounded bg-stroke/40" />
        <div className="h-3.5 w-1/2 animate-pulse rounded bg-stroke/40" />
        <div className="h-5 w-20 animate-pulse rounded bg-primary/20" />
      </div>
    </div>
  );
}

function Amount({ value, money, className }: { value: number | null; money: (n: number) => string; className?: string }) {
  if (value === null) return <span className="inline-block h-6 w-24 animate-pulse rounded bg-primary/20" aria-hidden />;
  return <span className={`tabular-nums ${className || ''}`}>{money(value)}</span>;
}
