'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import CountrySelector from '@/components/shared/country-selector';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { useCurrency } from '@/hooks/currency-hook';
import { useTranslations, useLocale } from 'next-intl';
import { Product } from '@/types/Product';
import {
  ShoppingCart,
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Tag,
  X,
} from 'lucide-react';
import { getCountryByCode } from '@/lib/countries';
import { PageLoading } from '@/components/ui/loading';

type PaymentOption = 'full' | 'half' | 'custom';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const t = useTranslations('checkout');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { selectedCurrency } = useCurrency();
  const isRTL = locale === 'ar';

  const productId = searchParams.get('product');
  const qtyParam = searchParams.get('qty');
  const refParam = searchParams.get('ref');
  const sizeParam = searchParams.get('size');

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [activePaymentMethod, setActivePaymentMethod] =
    useState<string>('paymob');
  const [paymentMethodLoading, setPaymentMethodLoading] = useState(true);
  const quantity = (() => {
    const parsed = parseInt(qtyParam || '1', 10);
    return isNaN(parsed) || parsed < 1 ? 1 : parsed;
  })();
  const sizeIndex = sizeParam !== null ? parseInt(sizeParam, 10) : null;

  // Payment options
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('full');
  const [customAmount, setCustomAmount] = useState<number>(0);

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    type: string;
    value: number;
  } | null>(null);

  // Terms
  const [termsAgreed, setTermsAgreed] = useState(false);

  // Get initial country
  const initialCountry = useMemo(() => {
    if (selectedCurrency?.countryCode) {
      const country = getCountryByCode(selectedCurrency.countryCode);
      return country?.value || '';
    }
    return '';
  }, [selectedCurrency?.countryCode]);

  // Billing data
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState(initialCountry);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selectedCurrency?.countryCode && !country) {
      const countryData = getCountryByCode(selectedCurrency.countryCode);
      if (countryData) {
        setCountry(countryData.value);
      }
    }
  }, [selectedCurrency?.countryCode, country]);

  // Fetch active payment method
  useEffect(() => {
    fetch('/api/payment-method')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setActivePaymentMethod(data.data.paymentMethod);
        }
      })
      .catch(() => {})
      .finally(() => setPaymentMethodLoading(false));
  }, []);

  // Fetch product
  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${productId}`);
        const data = await res.json();
        if (data.success) {
          setProduct(data.data);
        } else {
          setError(t('productNotFound'));
        }
      } catch {
        setError(t('loadError'));
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, t]);

  // Get price in selected currency — respects size selection
  const getPrice = (): { amount: number; currency: string } | null => {
    if (!product) return null;

    const currencyCode = selectedCurrency?.code || 'SAR';

    // If a size is selected, always use size pricing (sizes own their prices)
    const selectedSizeObj =
      sizeIndex !== null &&
      product.sizes &&
      sizeIndex >= 0 &&
      sizeIndex < product.sizes.length
        ? product.sizes[sizeIndex]
        : null;

    if (selectedSizeObj) {
      const sizeCurrencyPrice = selectedSizeObj.prices?.find(
        (p) => p.currencyCode === currencyCode.toUpperCase(),
      );
      if (sizeCurrencyPrice) {
        return { amount: sizeCurrencyPrice.amount, currency: currencyCode };
      }
      const sizePrice = selectedSizeObj.price ?? 0;
      if (
        (product.mainCurrency || product.currency) ===
        currencyCode.toUpperCase()
      ) {
        return { amount: sizePrice, currency: currencyCode };
      }
      return {
        amount: sizePrice,
        currency: product.mainCurrency || product.currency,
      };
    }

    // No size — use product-level pricing
    const currencyPrice = product.prices?.find(
      (p) => p.currencyCode === currencyCode.toUpperCase(),
    );

    if (currencyPrice) {
      return { amount: currencyPrice.amount, currency: currencyCode };
    }

    if (product.currency === currencyCode.toUpperCase()) {
      return { amount: product.price, currency: currencyCode };
    }

    return { amount: product.price, currency: product.currency };
  };

  const priceInfo = getPrice();
  const subtotal = priceInfo ? priceInfo.amount * quantity : 0;
  const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const totalAfterDiscount = subtotal - discount;

  // Calculate payment amount
  const getPayAmount = (): number => {
    if (paymentOption === 'full') return totalAfterDiscount;
    if (paymentOption === 'half') return Math.ceil(totalAfterDiscount / 2);
    if (paymentOption === 'custom') return customAmount || 0;
    return totalAfterDiscount;
  };

  const payAmount = getPayAmount();

  // Get minimum payment amount
  const getMinPayment = (): number => {
    if (!product?.minimumPayment) return Math.ceil(totalAfterDiscount / 2);
    if (product.minimumPayment.type === 'percentage') {
      return Math.ceil(
        (totalAfterDiscount * product.minimumPayment.value) / 100,
      );
    }
    return product.minimumPayment.value;
  };

  // Apply coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !priceInfo) return;

    setCouponLoading(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.trim(),
          orderAmount: subtotal,
          currency: priceInfo.currency,
          productId: product?._id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAppliedCoupon({
          code: data.data.code,
          discountAmount: data.data.discountAmount,
          type: data.data.type,
          value: data.data.value,
        });
        setError('');
      } else {
        setError(
          t(`couponErrors.${data.error}`, { defaultValue: t('couponInvalid') }),
        );
        setAppliedCoupon(null);
      }
    } catch {
      setError(t('couponInvalid'));
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const validateStep1 = (option: PaymentOption = paymentOption): boolean => {
    if (!termsAgreed) {
      setError(t('termsRequired'));
      return false;
    }
    if (option === 'custom') {
      if (!product?.allowPartialPayment) {
        setError(t('customPaymentNotAllowed'));
        return false;
      }
      if (!customAmount || customAmount <= 0) {
        setError(t('enterCustomAmount'));
        return false;
      }
      const minPayment = getMinPayment();
      if (customAmount < minPayment) {
        setError(
          t('minimumPaymentError', {
            amount: minPayment,
            currency: priceInfo?.currency || '',
          }),
        );
        return false;
      }
      if (customAmount > totalAfterDiscount) {
        setError(
          t('maximumPaymentError', {
            amount: totalAfterDiscount,
            currency: priceInfo?.currency || '',
          }),
        );
        return false;
      }
    }
    setError('');
    return true;
  };

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) errors.fullName = t('required');
    if (!email.trim()) {
      errors.email = t('required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = t('invalidEmail');
    }
    if (!phone.trim()) {
      errors.phone = t('required');
    } else if (!/^\+?[\d\s-]{8,}$/.test(phone)) {
      errors.phone = t('invalidPhone');
    }
    if (!country.trim()) errors.country = t('required');

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep2() || !product || !priceInfo) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product._id,
          quantity,
          currency: priceInfo.currency,
          billingData: {
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            country: country.trim(),
          },
          locale,
          couponCode: appliedCoupon?.code,
          referralId: refParam || undefined,
          sizeIndex: sizeIndex !== null ? sizeIndex : undefined,
          paymentOption,
          customPaymentAmount:
            paymentOption === 'custom' ? customAmount : undefined,
          termsAgreed,
        }),
      });

      const data = await res.json();

      if (data.success && data.data.checkoutUrl) {
        window.location.href = data.data.checkoutUrl;
      } else if (data.success && !data.data.checkoutUrl) {
        setError(t('gatewayNotConfigured'));
        setSubmitting(false);
      } else {
        setError(data.error || t('checkoutError'));
        setSubmitting(false);
      }
    } catch {
      setError(t('checkoutError'));
      setSubmitting(false);
    }
  };

  // No product ID
  if (!productId) {
    return (
      <>
        <main className="grid-bg min-h-screen flex items-center justify-center">
          <Container>
            <div className="max-w-md mx-auto text-center py-16">
              <div className="w-20 h-20 mx-auto rounded-full bg-error/10 flex items-center justify-center mb-6">
                <AlertCircle size={40} className="text-error" />
              </div>
              <h1 className="text-2xl font-bold mb-3">{t('noProduct')}</h1>
              <p className="text-secondary mb-6">{t('noProductMessage')}</p>
              <Button variant="primary" href="/products">
                {t('browseProducts')}
              </Button>
            </div>
          </Container>
        </main>
        <Footer />
      </>
    );
  }

  if (loading || paymentMethodLoading) {
    return <PageLoading />;
  }

  // Redirect when Easy Kash is active
  if (activePaymentMethod === 'easykash') {
    return (
      <>
        <main className="grid-bg min-h-screen flex items-center justify-center">
          <Container>
            <div className="max-w-md mx-auto text-center py-16">
              <div className="w-20 h-20 mx-auto rounded-full bg-warning/10 flex items-center justify-center mb-6">
                <AlertCircle size={40} className="text-warning" />
              </div>
              <h1 className="text-2xl font-bold mb-3">
                {t('directPaymentActive')}
              </h1>
              <p className="text-secondary mb-6">{t('directPaymentMessage')}</p>
              <Button variant="primary" href="/products">
                {t('browseProducts')}
              </Button>
            </div>
          </Container>
        </main>
        <Footer />
      </>
    );
  }

  if (!product) {
    return (
      <>
        <main className="grid-bg min-h-screen flex items-center justify-center">
          <Container>
            <div className="max-w-md mx-auto text-center py-16">
              <div className="w-20 h-20 mx-auto rounded-full bg-error/10 flex items-center justify-center mb-6">
                <AlertCircle size={40} className="text-error" />
              </div>
              <h1 className="text-2xl font-bold mb-3">
                {t('productNotFound')}
              </h1>
              <p className="text-secondary mb-6">
                {t('productNotFoundMessage')}
              </p>
              <Button variant="primary" href="/products">
                {t('browseProducts')}
              </Button>
            </div>
          </Container>
        </main>
        <Footer />
      </>
    );
  }

  const productName = locale === 'ar' ? product.name.ar : product.name.en;
  const productImage = product.images?.[0] || product.image;
  const selectedSizeName =
    sizeIndex !== null &&
    product.sizes &&
    sizeIndex >= 0 &&
    sizeIndex < product.sizes.length
      ? locale === 'ar'
        ? product.sizes[sizeIndex].name.ar
        : product.sizes[sizeIndex].name.en
      : null;

  return (
    <>
      <main className="grid-bg min-h-screen pt-28 pb-16">
        <div className="gbf gbf-right gbf-lg" />
        <Container>
          {/* Page Title */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
              <ShoppingCart size={20} className="text-success" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">{t('title')}</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Order Summary - Sidebar */}
            <div className="lg:col-span-2">
              <div className="bg-card-bg border border-stroke rounded-site p-6 lg:sticky lg:top-28">
                <h2 className="text-lg font-semibold mb-6">
                  {t('orderSummary')}
                </h2>

                {/* Product */}
                <div className="flex gap-4 pb-4 border-b border-stroke">
                  {productImage ? (
                    <div className="relative w-20 h-20 rounded-site overflow-hidden shrink-0 bg-card-bg border border-stroke">
                      <Image
                        src={productImage}
                        alt={productName}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-site bg-card-bg border border-stroke flex items-center justify-center shrink-0">
                      <ShoppingCart size={24} className="text-secondary" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                      {productName}
                    </h3>
                    {selectedSizeName && (
                      <span className="text-xs text-success font-medium">
                        {selectedSizeName}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          product.inStock ? 'bg-success' : 'bg-error'
                        }`}
                      />
                      <span className="text-xs text-secondary">
                        {product.inStock
                          ? tCommon('status.available')
                          : tCommon('status.unavailable')}
                      </span>
                    </div>
                    {priceInfo && (
                      <span className="text-sm text-secondary">
                        {priceInfo.amount.toLocaleString()} {priceInfo.currency}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantity */}
                <div className="flex items-center justify-between py-4 border-b border-stroke">
                  <span className="text-sm font-medium">{t('quantity')}</span>
                  <span className="text-sm font-semibold">{quantity}</span>
                </div>

                {/* Price Breakdown */}
                <div className="py-4 space-y-2 border-b border-stroke">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary">{t('subtotal')}</span>
                    <span>
                      {subtotal.toLocaleString()} {priceInfo?.currency}
                    </span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex items-center justify-between text-sm text-success">
                      <span className="flex items-center gap-1">
                        <Tag size={14} />
                        {t('discount')} ({appliedCoupon.code})
                      </span>
                      <span>
                        -{discount.toLocaleString()} {priceInfo?.currency}
                      </span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="pt-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{t('total')}</span>
                    {priceInfo && (
                      <span className="text-xl font-bold text-success">
                        {totalAfterDiscount.toLocaleString()}{' '}
                        {priceInfo.currency}
                      </span>
                    )}
                  </div>
                  {paymentOption !== 'full' && product.allowPartialPayment && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-secondary">{t('payingNow')}</span>
                      <span className="font-semibold text-success">
                        {payAmount.toLocaleString()} {priceInfo?.currency}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              {/* STEP 1: Coupon, Terms, Payment Buttons */}
              {step === 1 && (
                <div className="space-y-6">
                  {/* Coupon Code */}
                  <div className="bg-card-bg border border-stroke rounded-site p-6">
                    <h2 className="text-lg font-semibold mb-4">
                      {t('couponTitle')}
                    </h2>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between p-3 bg-success/10 border border-success/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Tag size={16} className="text-success" />
                          <span className="font-mono font-bold text-success">
                            {appliedCoupon.code}
                          </span>
                          <span className="text-sm text-secondary">
                            (
                            {appliedCoupon.type === 'percentage'
                              ? `${appliedCoupon.value}%`
                              : `${appliedCoupon.value} ${priceInfo?.currency}`}
                            )
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="p-1 text-error hover:bg-error/10 rounded transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <Input
                            value={couponCode}
                            onChange={(e) =>
                              setCouponCode(e.target.value.toUpperCase())
                            }
                            placeholder={t('couponPlaceholder')}
                            dir="ltr"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={couponLoading || !couponCode.trim()}
                          className="px-6 py-2.5 bg-success text-white rounded-lg hover:bg-success/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {couponLoading ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            t('applyCoupon')
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Terms & Conditions */}
                  <div className="bg-card-bg border border-stroke rounded-site p-6">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <div className="pt-0.5">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            termsAgreed
                              ? 'bg-success border-success'
                              : 'border-stroke'
                          }`}
                          onClick={() => setTermsAgreed(!termsAgreed)}
                        >
                          {termsAgreed && (
                            <span className="text-white text-sm font-bold">
                              ✓
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className="text-sm"
                        onClick={() => setTermsAgreed(!termsAgreed)}
                      >
                        {t('agreeToTerms')}{' '}
                        <Link
                          href="/terms"
                          target="_blank"
                          className="text-success hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t('termsLink')}
                        </Link>{' '}
                        {t('and')}{' '}
                        <Link
                          href="/privacy"
                          target="_blank"
                          className="text-success hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t('privacyLink')}
                        </Link>
                      </span>
                    </label>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-site bg-error/10 border border-error/30 text-error text-sm">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Payment Options as Buttons */}
                  <div className="bg-card-bg border border-stroke rounded-site p-6">
                    <h2 className="text-lg font-semibold mb-4">
                      {t('paymentOptions')}
                    </h2>
                    <div className="flex flex-col gap-3">
                      {/* Pay Full Button */}
                      <Button
                        type="button"
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={() => {
                          setPaymentOption('full');
                          if (validateStep1('full')) {
                            setStep(2);
                          }
                        }}
                      >
                        {t('payFull')}
                      </Button>

                      {/* Pay Half Button */}
                      <Button
                        type="button"
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={() => {
                          setPaymentOption('half');
                          if (validateStep1('half')) {
                            setStep(2);
                          }
                        }}
                      >
                        {t('payHalf')}
                      </Button>

                      {/* Pay Custom Button - Only if quantity=1 AND product allows partial payment */}
                      {quantity === 1 && product?.allowPartialPayment && (
                        <>
                          <Button
                            type="button"
                            variant={
                              paymentOption === 'custom'
                                ? 'primary'
                                : 'secondary'
                            }
                            size="lg"
                            className="w-full"
                            onClick={() => {
                              if (
                                paymentOption === 'custom' &&
                                customAmount > 0
                              ) {
                                if (validateStep1('custom')) {
                                  setStep(2);
                                }
                              } else {
                                setPaymentOption('custom');
                              }
                            }}
                          >
                            {paymentOption === 'custom' && customAmount > 0 ? (
                              <span className="w-full flex items-center justify-between">
                                <span className="font-medium">
                                  {t('payCustom')}
                                </span>
                                <span className="font-bold">
                                  {customAmount.toLocaleString()}{' '}
                                  {priceInfo?.currency}
                                </span>
                              </span>
                            ) : (
                              <span className="font-medium">
                                {t('payCustom')}
                              </span>
                            )}
                          </Button>

                          {/* Custom Amount Input */}
                          {paymentOption === 'custom' && (
                            <div className="pt-2">
                              <Input
                                type="number"
                                value={customAmount || ''}
                                onChange={(e) =>
                                  setCustomAmount(
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                min={getMinPayment()}
                                max={totalAfterDiscount}
                                placeholder={t('customAmountPlaceholder', {
                                  min: getMinPayment(),
                                })}
                                helperText={t('minimumPayment', {
                                  amount: getMinPayment(),
                                  currency: priceInfo?.currency || '',
                                })}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Billing Info */}
              {step === 2 && (
                <div className="space-y-6">
                  {/* Back button */}
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 text-sm text-secondary hover:text-foreground transition-colors"
                  >
                    {isRTL ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
                    {t('backToStep1')}
                  </button>

                  <div className="bg-card-bg border border-stroke rounded-site p-6">
                    <h2 className="text-lg font-semibold mb-6">
                      {t('billingInfo')}
                    </h2>

                    <form
                      onSubmit={handleSubmit}
                      className="flex flex-col gap-4"
                    >
                      <Input
                        label={t('fullName')}
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (formErrors.fullName) {
                            setFormErrors((prev) => ({
                              ...prev,
                              fullName: '',
                            }));
                          }
                        }}
                        error={formErrors.fullName}
                        placeholder={t('fullNamePlaceholder')}
                        required
                        dir={isRTL ? 'rtl' : 'ltr'}
                      />

                      <Input
                        label={t('email')}
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (formErrors.email) {
                            setFormErrors((prev) => ({
                              ...prev,
                              email: '',
                            }));
                          }
                        }}
                        error={formErrors.email}
                        placeholder={t('emailPlaceholder')}
                        required
                        dir="ltr"
                      />

                      <Input
                        label={t('phone')}
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (formErrors.phone) {
                            setFormErrors((prev) => ({
                              ...prev,
                              phone: '',
                            }));
                          }
                        }}
                        error={formErrors.phone}
                        placeholder={t('phonePlaceholder')}
                        required
                        dir="ltr"
                      />

                      <div className="grid grid-cols-1 gap-4">
                        <CountrySelector
                          value={country}
                          onChange={(value) => {
                            setCountry(value);
                            if (formErrors.country) {
                              setFormErrors((prev) => ({
                                ...prev,
                                country: '',
                              }));
                            }
                          }}
                          error={formErrors.country}
                          placeholder={t('countryPlaceholder')}
                        />
                      </div>

                      {/* Error Message */}
                      {error && (
                        <div className="flex items-center gap-2 p-3 rounded-site bg-error/10 border border-error/30 text-error text-sm">
                          <AlertCircle size={16} className="shrink-0" />
                          <span>{error}</span>
                        </div>
                      )}

                      {/* Submit */}
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full mt-2"
                        disabled={submitting}
                      >
                        {submitting ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 size={18} className="animate-spin" />
                            {t('processing')}
                          </span>
                        ) : (
                          t('payNow', {
                            amount: payAmount.toLocaleString(),
                            currency: priceInfo?.currency || '',
                          })
                        )}
                      </Button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Container>
      </main>
      <Footer />
      <GoToTop />
      <WhatsAppButton />
    </>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CheckoutContent />
    </Suspense>
  );
}
