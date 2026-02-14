'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { useCurrency } from '@/hooks/currency-hook';
import { useTranslations, useLocale } from 'next-intl';
import { Product } from '@/types/Product';
import { ShoppingCart, Loader2, AlertCircle, Minus, Plus } from 'lucide-react';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const t = useTranslations('checkout');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { selectedCurrency } = useCurrency();

  const productId = searchParams.get('product');
  const qtyParam = searchParams.get('qty');

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(() => {
    const parsed = parseInt(qtyParam || '1', 10);
    return isNaN(parsed) || parsed < 1 ? 1 : parsed;
  });

  // Billing data
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');

  // Form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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

  // Get price in selected currency
  const getPrice = (): { amount: number; currency: string } | null => {
    if (!product) return null;

    const currencyCode = selectedCurrency?.code || 'SAR';
    const currencyPrice = product.prices?.find(
      (p) => p.currencyCode === currencyCode.toUpperCase(),
    );

    if (currencyPrice) {
      return { amount: currencyPrice.amount, currency: currencyCode };
    }

    if (product.currency === currencyCode.toUpperCase()) {
      return { amount: product.price, currency: currencyCode };
    }

    // Fallback to default currency
    return { amount: product.price, currency: product.currency };
  };

  const priceInfo = getPrice();
  const totalAmount = priceInfo ? priceInfo.amount * quantity : 0;

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!firstName.trim()) errors.firstName = t('required');
    if (!lastName.trim()) errors.lastName = t('required');
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
    if (!city.trim()) errors.city = t('required');

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !product || !priceInfo) return;

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
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            country: country.trim(),
            city: city.trim(),
          },
          locale,
        }),
      });

      const data = await res.json();

      if (data.success && data.data.checkoutUrl) {
        // Redirect to Paymob checkout
        window.location.href = data.data.checkoutUrl;
      } else if (data.success && !data.data.checkoutUrl) {
        // Payment gateway not configured
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

  // Loading
  if (loading) {
    return (
      <>
        <main className="grid-bg min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-success border-t-transparent rounded-full animate-spin" />
        </main>
        <Footer />
      </>
    );
  }

  // Product not found
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
  const isRTL = locale === 'ar';

  return (
    <>
      <main className="grid-bg min-h-screen pt-28 pb-16">
        <Container>
          <div className="max-w-4xl mx-auto">
            {/* Page Title */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <ShoppingCart size={20} className="text-success" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold">{t('title')}</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Order Summary - Takes 2 columns on large screens */}
              <div className="lg:col-span-2">
                <div className="bg-card-bg border border-stroke rounded-site p-6 lg:sticky lg:top-28">
                  <h2 className="text-lg font-semibold mb-6">
                    {t('orderSummary')}
                  </h2>

                  {/* Product */}
                  <div className="flex gap-4 pb-4 border-b border-stroke">
                    {product.image ? (
                      <div className="relative w-20 h-20 rounded-site overflow-hidden shrink-0 bg-card-bg border border-stroke">
                        <Image
                          src={product.image}
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
                          {priceInfo.amount.toLocaleString()}{' '}
                          {priceInfo.currency}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="flex items-center justify-between py-4 border-b border-stroke">
                    <span className="text-sm font-medium">{t('quantity')}</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-8 h-8 rounded-full border border-stroke flex items-center justify-center hover:bg-card-bg transition-colors"
                        disabled={quantity <= 1}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-semibold w-8 text-center">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => q + 1)}
                        className="w-8 h-8 rounded-full border border-stroke flex items-center justify-center hover:bg-card-bg transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between pt-4">
                    <span className="font-semibold">{t('total')}</span>
                    {priceInfo && (
                      <span className="text-xl font-bold text-success">
                        {totalAmount.toLocaleString()} {priceInfo.currency}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Billing Form - Takes 3 columns on large screens */}
              <div className="lg:col-span-3">
                <div className="bg-card-bg border border-stroke rounded-site p-6">
                  <h2 className="text-lg font-semibold mb-6">
                    {t('billingInfo')}
                  </h2>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Name Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label={t('firstName')}
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          if (formErrors.firstName) {
                            setFormErrors((prev) => ({
                              ...prev,
                              firstName: '',
                            }));
                          }
                        }}
                        error={formErrors.firstName}
                        placeholder={t('firstNamePlaceholder')}
                        required
                        dir={isRTL ? 'rtl' : 'ltr'}
                      />
                      <Input
                        label={t('lastName')}
                        value={lastName}
                        onChange={(e) => {
                          setLastName(e.target.value);
                          if (formErrors.lastName) {
                            setFormErrors((prev) => ({
                              ...prev,
                              lastName: '',
                            }));
                          }
                        }}
                        error={formErrors.lastName}
                        placeholder={t('lastNamePlaceholder')}
                        required
                        dir={isRTL ? 'rtl' : 'ltr'}
                      />
                    </div>

                    {/* Email */}
                    <Input
                      label={t('email')}
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (formErrors.email) {
                          setFormErrors((prev) => ({ ...prev, email: '' }));
                        }
                      }}
                      error={formErrors.email}
                      placeholder={t('emailPlaceholder')}
                      required
                      dir="ltr"
                    />

                    {/* Phone */}
                    <Input
                      label={t('phone')}
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (formErrors.phone) {
                          setFormErrors((prev) => ({ ...prev, phone: '' }));
                        }
                      }}
                      error={formErrors.phone}
                      placeholder={t('phonePlaceholder')}
                      required
                      dir="ltr"
                    />

                    {/* Location Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label={t('country')}
                        value={country}
                        onChange={(e) => {
                          setCountry(e.target.value);
                          if (formErrors.country) {
                            setFormErrors((prev) => ({ ...prev, country: '' }));
                          }
                        }}
                        error={formErrors.country}
                        placeholder={t('countryPlaceholder')}
                        required
                        dir={isRTL ? 'rtl' : 'ltr'}
                      />
                      <Input
                        label={t('city')}
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          if (formErrors.city) {
                            setFormErrors((prev) => ({ ...prev, city: '' }));
                          }
                        }}
                        error={formErrors.city}
                        placeholder={t('cityPlaceholder')}
                        required
                        dir={isRTL ? 'rtl' : 'ltr'}
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
                        t('payNow')
                      )}
                    </Button>
                  </form>
                </div>
              </div>
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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-success border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
