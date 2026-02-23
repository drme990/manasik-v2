'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
  CheckCircle2,
  XCircle,
  ShoppingBag,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { LuMinus, LuPlus } from 'react-icons/lu';
import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import BackButton from '@/components/shared/back-button';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import Button from '@/components/ui/button';
import Dropdown from '@/components/ui/dropdown';
import { SectionTitle } from '@/components/layout/section';
import { Product } from '@/types/Product';
import { usePriceInCurrency } from '@/hooks/currency-hook';
import {
  UpgradeModalProvider,
  useUpgradeModal,
} from '@/components/providers/upgrade-modal-provider';

// ────────────────────────────────────────────────────────────────────────────
// Counter widget
// ────────────────────────────────────────────────────────────────────────────

function Counter({
  label,
  value,
  onIncrement,
  onDecrement,
}: {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-foreground font-medium text-sm">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={onIncrement}
          className="w-8 h-8 rounded-full bg-success flex items-center justify-center text-white hover:bg-success/80 transition-colors shadow"
        >
          <LuPlus size={16} />
        </button>
        <span className="text-xl font-bold text-foreground w-6 text-center">
          {value}
        </span>
        <button
          onClick={onDecrement}
          disabled={value === 0}
          className="w-8 h-8 rounded-full bg-success flex items-center justify-center text-white hover:bg-success/80 transition-colors shadow disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <LuMinus size={16} />
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Inner calculator (consumes UpgradeModalProvider context)
// ────────────────────────────────────────────────────────────────────────────

interface AdditionalItem {
  uid: string;
  productId: string;
}

function AqeqaCalcInner() {
  const t = useTranslations('calcAqeqa');
  const locale = useLocale();
  const router = useRouter();
  const isAr = locale === 'ar';
  const getPrice = usePriceInCurrency();
  const { showUpgradeModal } = useUpgradeModal();

  const [males, setMales] = useState(0);
  const [females, setFemales] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedSizeIndex, setSelectedSizeIndex] = useState<number>(0);
  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'paymob' | 'easykash'>(
    'paymob',
  );
  // Additional sacrifices the user picks to cover remaining slots
  const [additionalItems, setAdditionalItems] = useState<AdditionalItem[]>([]);

  // ── Fetch sacrifice-eligible products ────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          '/api/products?sacrifice=true&inStock=true&limit=100',
        );
        const data = await res.json();
        if (data.success) setProducts(data.data.products);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingProducts(false);
      }
    })();
  }, []);

  // ── Fetch active payment method ───────────────────────────────────────────
  useEffect(() => {
    fetch('/api/payment-method')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setPaymentMethod(data.data.paymentMethod);
      })
      .catch(() => {});
  }, []);

  // ── Derived state ──────────────────────────────────────────────────────────
  const totalRequired = males * 2 + females;

  const selectedProduct = useMemo(
    () => products.find((p) => p._id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const showSizeSelector = (selectedProduct?.sizes?.length ?? 0) > 1;

  /**
   * How many units of the main product are needed:
   * - sacrificeCount === 1 → auto-repeat to fill all required slots
   * - sacrificeCount > 1  → always 1 unit (user may add extras manually)
   */
  const mainQty = useMemo(() => {
    if (!selectedProduct || totalRequired === 0) return 1;
    const sc = selectedProduct.sacrificeCount ?? 1;
    return sc === 1 ? totalRequired : 1;
  }, [selectedProduct, totalRequired]);

  // How many slots the main product covers (qty × sacrificeCount)
  const coveredByMain = mainQty * (selectedProduct?.sacrificeCount ?? 0);

  const coveredByAdditional = useMemo(
    () =>
      additionalItems.reduce((sum, item) => {
        const p = products.find((pr) => pr._id === item.productId);
        return sum + (p?.sacrificeCount ?? 0);
      }, 0),
    [additionalItems, products],
  );

  const totalCovered = coveredByMain + coveredByAdditional;
  const isSufficient = totalRequired > 0 && totalCovered >= totalRequired;
  const remaining = Math.max(0, totalRequired - totalCovered);
  const showStatus = totalRequired > 0 && selectedProduct !== null;

  // ── Reset size + extras when main product changes ────────────────────────
  useEffect(() => {
    setSelectedSizeIndex(0);
    setAdditionalItems([]);
  }, [selectedProductId]);

  // ── Reset everything when both counters reach 0 ───────────────────────────
  useEffect(() => {
    if (males === 0 && females === 0) {
      setSelectedProductId('');
      setSelectedSizeIndex(0);
      setAdditionalItems([]);
    }
  }, [males, females]);

  // ── Grouped checkout items (by product ID → qty) ──────────────────────────
  const checkoutGroups = useMemo(() => {
    if (!selectedProduct) return [];
    const map = new Map<string, { product: Product; qty: number }>();
    // Main product — use auto-computed qty
    map.set(selectedProduct._id, { product: selectedProduct, qty: mainQty });
    for (const item of additionalItems) {
      const p = products.find((pr) => pr._id === item.productId);
      if (p) {
        const existing = map.get(p._id);
        map.set(p._id, { product: p, qty: (existing?.qty ?? 0) + 1 });
      }
    }
    return Array.from(map.values());
  }, [selectedProduct, mainQty, additionalItems, products]);

  // ── Dropdown options ───────────────────────────────────────────────────────
  const productOptions = products.map((p) => ({
    value: p._id,
    label:
      `${isAr ? p.name.ar : p.name.en}` +
      ((p.sacrificeCount ?? 1) > 1
        ? ` (${t('covers', { count: p.sacrificeCount ?? 1 })})`
        : ''),
  }));

  // ── Price helper ──────────────────────────────────────────────────────────
  const getProductPrice = useCallback(
    (product: Product, sizeIdx?: number | null) => {
      const idx = sizeIdx ?? 0;
      const s = product.sizes[idx];
      if (s) {
        return getPrice(s.prices ?? [], s.price ?? 0, product.baseCurrency);
      }
      // Fallback: use first size
      const firstSize = product.sizes[0];
      return getPrice(
        firstSize?.prices ?? [],
        firstSize?.price ?? 0,
        product.baseCurrency,
      );
    },
    [getPrice],
  );

  // ── Additional items helpers ──────────────────────────────────────────────
  const addAdditionalSlot = () => {
    setAdditionalItems((prev) => [
      ...prev,
      { uid: `${Date.now()}-${Math.random()}`, productId: '' },
    ]);
  };

  const removeAdditionalSlot = (uid: string) => {
    setAdditionalItems((prev) => prev.filter((item) => item.uid !== uid));
  };

  const updateAdditionalProduct = (uid: string, productId: string) => {
    setAdditionalItems((prev) =>
      prev.map((item) => (item.uid === uid ? { ...item, productId } : item)),
    );
  };

  // ── Checkout (Paymob) ──────────────────────────────────────────────────────
  const doCheckout = useCallback(
    (product: Product, qty: number, sizeIdx?: number | null) => {
      const params = new URLSearchParams({
        product: product._id,
        qty: String(qty),
      });
      if (sizeIdx !== null && sizeIdx !== undefined)
        params.set('size', String(sizeIdx));
      router.push(`/checkout?${params.toString()}`);
    },
    [router],
  );

  const handleBookNow = useCallback(() => {
    if (!selectedProduct) return;
    // Only suggest upgrade for single-product paymob checkouts
    if (paymentMethod === 'paymob' && checkoutGroups.length === 1) {
      const upgrades = products.filter(
        (p) =>
          p._id !== selectedProduct._id &&
          (p.sacrificeCount ?? 1) > (selectedProduct.sacrificeCount ?? 1),
      );
      if (upgrades.length > 0) {
        showUpgradeModal({
          currentProduct: selectedProduct,
          upgradeProducts: upgrades,
          onSelect: (p) => {
            setSelectedProductId(p._id);
            setSelectedSizeIndex(0);
            setAdditionalItems([]);
          },
        });
        return;
      }
    }
    doCheckout(
      checkoutGroups[0].product,
      checkoutGroups[0].qty,
      selectedSizeIndex,
    );
  }, [
    selectedProduct,
    checkoutGroups,
    products,
    paymentMethod,
    showUpgradeModal,
    doCheckout,
    selectedSizeIndex,
  ]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Header />
      <main className="grid-bg min-h-screen">
        <Container className="py-8 max-w-lg mx-auto">
          <BackButton className="mb-6" />

          <SectionTitle>{t('pageTitle')}</SectionTitle>

          <p className="text-secondary text-center mb-6">{t('hadeth')}</p>

          <div className="space-y-4">
            {/* ── Step 1: Child counters ── */}
            <div className="bg-card-bg border border-stroke rounded-site p-5">
              <p className="text-foreground font-semibold text-center mb-4">
                {t('childrenCount')}
              </p>
              <div className="flex justify-around">
                <Counter
                  label={t('males')}
                  value={males}
                  onIncrement={() => setMales((v) => v + 1)}
                  onDecrement={() => setMales((v) => Math.max(0, v - 1))}
                />
                <Counter
                  label={t('females')}
                  value={females}
                  onIncrement={() => setFemales((v) => v + 1)}
                  onDecrement={() => setFemales((v) => Math.max(0, v - 1))}
                />
              </div>
              {totalRequired > 0 && (
                <p className="text-center text-sm text-secondary mt-3">
                  {t('totalRequired', { count: totalRequired })}
                </p>
              )}
            </div>

            {/* ── Step 2: Main sacrifice type ── */}
            {totalRequired > 0 && (
              <div className="bg-card-bg border border-stroke rounded-site p-5 space-y-3">
                <p className="text-foreground font-semibold">
                  {t('sacrificeType')}
                </p>
                {loadingProducts ? (
                  <p className="text-secondary text-sm animate-pulse">
                    {t('loadingProducts')}
                  </p>
                ) : products.length === 0 ? (
                  <p className="text-secondary text-sm">
                    {t('noSacrificeProducts')}
                  </p>
                ) : (
                  <Dropdown<string>
                    value={selectedProductId}
                    options={productOptions}
                    onChange={setSelectedProductId}
                    placeholder={t('selectSacrifice')}
                  />
                )}
              </div>
            )}

            {/* ── Step 3: Size picker ── */}
            {selectedProduct && showSizeSelector && (
              <div className="bg-card-bg border border-stroke rounded-site p-5 space-y-3">
                <p className="text-foreground font-semibold">
                  {t('sizeLabel')}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {selectedProduct.sizes.map((size, idx) => {
                    const { amount, currency } = getProductPrice(
                      selectedProduct,
                      idx,
                    );
                    const isSelected = selectedSizeIndex === idx;
                    return (
                      <button
                        key={size._id ?? idx}
                        onClick={() => setSelectedSizeIndex(idx)}
                        className={`rounded-site border p-3 text-start transition-all ${
                          isSelected
                            ? 'border-success bg-success/10'
                            : 'border-stroke hover:border-success/50'
                        }`}
                      >
                        <p
                          className={`text-lg font-bold ${isSelected ? 'text-success' : 'text-foreground'}`}
                        >
                          {currency}&nbsp;{amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-secondary mt-0.5">
                          {isAr ? size.name.ar : size.name.en}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Step 4: Status + Additional sacrifices ── */}
            {showStatus && (
              <div className="bg-card-bg border border-stroke rounded-site p-5 space-y-4">
                {/* Status banner */}
                {isSufficient ? (
                  <div className="flex items-center gap-2 justify-center text-success font-semibold">
                    <CheckCircle2 size={20} />
                    <span>{t('status.sufficient')}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 justify-center text-error font-semibold">
                    <XCircle size={20} />
                    <span>
                      {t('status.insufficient', { count: remaining })}
                    </span>
                  </div>
                )}

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-stroke overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isSufficient ? 'bg-success' : 'bg-warning'
                    }`}
                    style={{
                      width: `${Math.min(100, (totalCovered / totalRequired) * 100)}%`,
                    }}
                  />
                </div>

                {/* Additional sacrifice slots */}
                {additionalItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      {t('additionalSacrifice')}
                    </p>
                    {additionalItems.map((item) => {
                      const addedProduct = products.find(
                        (p) => p._id === item.productId,
                      );
                      return (
                        <div key={item.uid} className="flex items-center gap-2">
                          <div className="flex-1">
                            <Dropdown<string>
                              value={item.productId}
                              options={productOptions}
                              onChange={(val) =>
                                updateAdditionalProduct(item.uid, val)
                              }
                              placeholder={t('selectSacrifice')}
                            />
                          </div>
                          {addedProduct && (
                            <span className="text-xs text-success font-medium whitespace-nowrap">
                              +{addedProduct.sacrificeCount ?? 1}
                            </span>
                          )}
                          <button
                            onClick={() => removeAdditionalSlot(item.uid)}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-stroke hover:border-error hover:text-error text-secondary transition-colors shrink-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add more button (when still insufficient) */}
                {!isSufficient && (
                  <button
                    onClick={addAdditionalSlot}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-site border border-dashed border-stroke hover:border-success hover:text-success text-secondary text-sm transition-colors"
                  >
                    <Plus size={16} />
                    {t('addMoreSacrifice')}
                  </button>
                )}

                {/* Price summary per group */}
                {isSufficient && checkoutGroups.length > 0 && (
                  <div className="border-t border-stroke pt-3 space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      {t('summary')}
                    </p>
                    {checkoutGroups.map(({ product, qty }) => {
                      const { amount, currency } = getProductPrice(
                        product,
                        product._id === selectedProduct?._id
                          ? selectedSizeIndex
                          : null,
                      );
                      return (
                        <div
                          key={product._id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-secondary">
                            {qty}× {isAr ? product.name.ar : product.name.en}
                          </span>
                          <span className="font-semibold text-foreground">
                            {currency}&nbsp;{(amount * qty).toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 5: CTA buttons ── */}
            {showStatus && isSufficient && (
              <div className="space-y-2">
                {paymentMethod === 'easykash' ? (
                  /* ── Easy Kash: show per-product links to product pages ── */
                  <div className="bg-card-bg border border-stroke rounded-site p-5 space-y-4">
                    <p className="font-semibold text-foreground">
                      {t('easykashSummaryTitle')}
                    </p>
                    <p className="text-sm text-secondary">
                      {t('easykashSummaryDesc')}
                    </p>
                    {checkoutGroups.map(({ product, qty }) => {
                      const { amount, currency } = getProductPrice(
                        product,
                        product._id === selectedProduct?._id
                          ? selectedSizeIndex
                          : null,
                      );
                      return (
                        <div
                          key={product._id}
                          className="flex items-center justify-between gap-4 border border-stroke rounded-site p-3"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {qty}&times;{' '}
                              {isAr ? product.name.ar : product.name.en}
                            </p>
                            <p className="text-success font-bold text-sm mt-0.5">
                              {currency} {(amount * qty).toLocaleString()}
                            </p>
                          </div>
                          <Button
                            variant="primary"
                            size="sm"
                            href={`/products/${product._id}`}
                            target="_blank"
                            className="shrink-0 gap-1.5"
                          >
                            <ExternalLink size={14} />
                            {t('viewProduct')}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : checkoutGroups.length === 1 ? (
                  /* ── Paymob single product → upgrade suggestion ── */
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full gap-2"
                    onClick={handleBookNow}
                  >
                    <ShoppingBag size={20} />
                    {t('bookNow')}
                  </Button>
                ) : (
                  /* ── Paymob multiple products → one checkout per group ── */
                  <>
                    <p className="text-center text-sm text-secondary">
                      {t('checkoutEach')}
                    </p>
                    {checkoutGroups.map(({ product, qty }, idx) => (
                      <Button
                        key={product._id}
                        variant={idx === 0 ? 'primary' : 'secondary'}
                        size="lg"
                        className="w-full gap-2"
                        onClick={() =>
                          doCheckout(
                            product,
                            qty,
                            product._id === selectedProduct?._id
                              ? selectedSizeIndex
                              : null,
                          )
                        }
                      >
                        <ShoppingBag size={18} />
                        {t('bookProduct', {
                          qty,
                          name: isAr ? product.name.ar : product.name.en,
                        })}
                      </Button>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Empty state hint */}
            {totalRequired === 0 && (
              <p className="text-center text-secondary text-sm py-6">
                {t('hint')}
              </p>
            )}
          </div>
        </Container>
      </main>
      <Footer />
      <GoToTop />
      <WhatsAppButton />
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Page export — wraps with UpgradeModalProvider
// ────────────────────────────────────────────────────────────────────────────

export default function CalcAqeqaPage() {
  return (
    <UpgradeModalProvider>
      <AqeqaCalcInner />
    </UpgradeModalProvider>
  );
}
