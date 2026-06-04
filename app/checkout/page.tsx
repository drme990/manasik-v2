'use client';

import {
  useState,
  useEffect,
  Suspense,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { useSearchParams } from 'next/navigation';
import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import { useCurrency } from '@/hooks/currency-hook';
import { useTranslations, useLocale } from 'next-intl';
import { Product, getPrimaryProductImageUrl } from '@/types/Product';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { getCountryByCode } from '@/lib/countries';
import { isExecutionDateKey } from '@/lib/reservation-fields';
import { PageLoading } from '@/components/ui/loading';
import { trackEvent } from '@/lib/fb-pixel';
import { getStoredReferral } from '@/components/providers/referral-provider';
import {
  clearClientAuthCookie,
  hasClientAuthCookie,
} from '@/lib/client-auth-cookie';
import {
  CheckoutUpgradeModal,
  useCheckoutUpgradeModal,
} from '@/components/providers/checkout-upgrade-modal';
import {
  CheckoutRecommendModal,
  useCheckoutRecommendModal,
} from '@/components/providers/checkout-recommend-modal';
import BackButton from '@/components/shared/back-button';
import Header from '@/components/layout/header';
import CheckoutEmptyState from './components/checkout-empty-state';
import CheckoutOrderSummary from './components/checkout-order-summary';
import CheckoutBillingStep from './components/checkout-billing-step';
import CheckoutReservationStep from './components/checkout-reservation-step';
import CheckoutCustomPaymentQuantityModal from './components/checkout-custom-payment-quantity-modal';
import CheckoutAqeeqahGuidanceModal from './components/checkout-aqeeqah-guidance-modal';

type PaymentOption = 'full' | 'half' | 'custom';

type RetryPrefillData = {
  orderNumber?: string;
  productSlug: string;
  quantity: number;
  sizeIndex: number;
  billingData: {
    fullName: string;
    email: string;
    phone: string;
    country: string;
  };
  reservationData: Array<{
    key: string;
    value: string;
  }>;
  couponCode: string | null;
  referralId: string | null;
  paymentOption: PaymentOption;
  customAmount: number;
};

const UPGRADE_DISCOUNT_DURATION_MS = 2 * 60 * 1000;

function getUpgradeDiscountTimerKey(
  currentProductId: string,
  upgradeProductId: string,
) {
  return `checkout-upgrade-discount-timer:${currentProductId}:${upgradeProductId}`;
}

function getLocalizedUpgradeFeatures(
  product: Product,
  isRTL: boolean,
): string[] {
  const features = isRTL
    ? product.upgradeFeatures?.ar
    : product.upgradeFeatures?.en;

  return (features ?? []).map((item) => item.trim()).filter(Boolean);
}

function normalizeIntentionValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, '')
    .replace(/\s+/g, ' ');
}

function isAqeeqahIntentionValue(value: string): boolean {
  if (!value.trim()) return false;

  const normalized = normalizeIntentionValue(value);
  const aqeeqahMarkers = ['aqeeqah', 'aqiqah', 'aqeqa', 'akeekah', 'عقيقة'];

  return aqeeqahMarkers.some((marker) => normalized.includes(marker));
}

async function fetchUpgradeProduct(
  upgradeRef: string,
): Promise<Product | null> {
  try {
    const res = await fetch(
      `/api/products/${encodeURIComponent(upgradeRef)}?platform=manasik`,
    );
    const data = await res.json();
    if (!data.success) return null;
    return data.data as Product;
  } catch {
    return null;
  }
}

async function fetchRecommendProduct(
  recommendRef: string,
): Promise<Product | null> {
  try {
    const res = await fetch(
      `/api/products/${encodeURIComponent(recommendRef)}?platform=manasik`,
    );
    const data = await res.json();
    if (!data.success) return null;
    return data.data as Product;
  } catch {
    return null;
  }
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const t = useTranslations('checkout');
  const locale = useLocale();
  const { selectedCurrency } = useCurrency();
  const isRTL = locale === 'ar';

  const productId = searchParams.get('prod');
  const qtyParam = searchParams.get('qty');
  const sizeParam = searchParams.get('size');
  const retryMode = searchParams.get('retry') === '1';
  const retryOrder = searchParams.get('retryOrder');
  const payLinkToken = searchParams.get('payLink');
  const urlRef = searchParams.get('ref');

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [resolvedProductSlug, setResolvedProductSlug] = useState('');
  const [resolvedQuantity, setResolvedQuantity] = useState<number | null>(null);
  const [resolvedSizeIndex, setResolvedSizeIndex] = useState<number | null>(
    null,
  );
  const activeProductSlug = productId || resolvedProductSlug;
  const quantityFromUrl = (() => {
    const parsed = parseInt(qtyParam || '1', 10);
    return isNaN(parsed) || parsed < 1 ? 1 : parsed;
  })();
  const sizeIndexFromUrl = sizeParam !== null ? parseInt(sizeParam, 10) : 0;
  const quantity = resolvedQuantity ?? quantityFromUrl;
  const sizeIndex = resolvedSizeIndex ?? sizeIndexFromUrl;

  // Payment options
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('full');
  const [isCustomPaymentMode, setIsCustomPaymentMode] = useState(false);
  const [showCustomPaymentQuantityModal, setShowCustomPaymentQuantityModal] =
    useState(false);
  const [customAmount, setCustomAmount] = useState<number>(0);
  const checkoutTracked = useRef(false);

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [isCouponSectionOpen, setIsCouponSectionOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    type: string;
    value: number;
  } | null>(null);

  // Terms
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [retryReferralId, setRetryReferralId] = useState('');
  const [retryPrefill, setRetryPrefill] = useState<RetryPrefillData | null>(
    null,
  );
  const retryCouponApplied = useRef(false);
  const retryReservationApplied = useRef(false);

  // Reservation fields
  const [reservationData, setReservationData] = useState<
    Record<number, string>
  >({});
  const [showOptionalReservationFields, setShowOptionalReservationFields] =
    useState(false);
  const [blockedExecutionDates, setBlockedExecutionDates] = useState<string[]>(
    [],
  );
  const [showAqeeqahGuidanceModal, setShowAqeeqahGuidanceModal] =
    useState(false);
  const [
    aqeeqahGuidanceAcknowledgedValue,
    setAqeeqahGuidanceAcknowledgedValue,
  ] = useState('');

  // Upgrade tracking
  const [acceptedUpgrade, setAcceptedUpgrade] = useState<{
    fromProductId: string;
    discount: number;
  } | null>(null);

  // Upgrade modal
  const {
    info: upgradeInfo,
    showUpgradeModal,
    hideUpgradeModal,
  } = useCheckoutUpgradeModal();
  const upgradeShown = useRef(false);
  const upgradeProductRef = useRef<Product | null>(null);

  // Recommend modal
  const {
    info: recommendInfo,
    showRecommendModal,
    hideRecommendModal,
  } = useCheckoutRecommendModal();
  const recommendShown = useRef(false);
  const recommendProductRef = useRef<Product | null>(null);
  const [acceptedRecommendProductId, setAcceptedRecommendProductId] = useState<
    string | null
  >(null);

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
  const [phone, setPhone] = useState('+');
  const [country, setCountry] = useState(initialCountry);
  const [isBillingLocked, setIsBillingLocked] = useState(false);
  const [isAuthenticatedCheckout, setIsAuthenticatedCheckout] = useState(false);
  const [isBannedAccount, setIsBannedAccount] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');
  const [showForgotPasswordHint, setShowForgotPasswordHint] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (payLinkToken || retryMode) return;

    if (!hasClientAuthCookie()) {
      setIsAuthenticatedCheckout(false);
      setIsBillingLocked(false);
      setIsBannedAccount(false);
      return;
    }

    const loadCurrentUserBilling = async () => {
      try {
        const response = await fetch('/api/auth/manasik/session', {
          cache: 'no-store',
        });
        if (!response.ok) {
          setIsAuthenticatedCheckout(false);
          setIsBillingLocked(false);
          setIsBannedAccount(false);
          clearClientAuthCookie();
          return;
        }

        const payload = await response.json();
        const user = payload?.data;
        if (!user) {
          setIsAuthenticatedCheckout(false);
          setIsBillingLocked(false);
          setIsBannedAccount(false);
          return;
        }

        setFullName((prev) => prev || user.name || '');
        setEmail((prev) => prev || user.email || '');
        setPhone((prev) => (prev && prev !== '+' ? prev : user.phone || '+'));
        setCountry(user.country || '');
        setTermsAgreed(true);
        setIsBillingLocked(true);
        setIsAuthenticatedCheckout(true);
        setIsBannedAccount(Boolean(user.isBanned));
      } catch {
        // Keep checkout editable for guests when profile lookup fails.
        setIsAuthenticatedCheckout(false);
        setIsBillingLocked(false);
        setIsBannedAccount(false);
      }
    };

    void loadCurrentUserBilling();
  }, [payLinkToken, retryMode]);

  useEffect(() => {
    if (!payLinkToken) return;

    const loadPayLink = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await fetch(
          `/api/payment/links/order/${encodeURIComponent(payLinkToken)}`,
        );
        const data = await res.json();

        if (!data.success || !data.data?.productSlug) {
          setError(data.error || t('loadError'));
          setLoading(false);
          return;
        }

        const parsed = data.data as RetryPrefillData;
        setResolvedProductSlug(parsed.productSlug);
        setResolvedQuantity(parsed.quantity || 1);
        setResolvedSizeIndex(parsed.sizeIndex ?? 0);

        setFullName(parsed.billingData?.fullName || '');
        setEmail(parsed.billingData?.email || '');
        setPhone(parsed.billingData?.phone || '+');
        setCountry(parsed.billingData?.country || '');
        setTermsAgreed(true);
        setRetryReferralId(parsed.referralId || '');
        setRetryPrefill(parsed);
        setCouponCode(parsed.couponCode || '');
        setPaymentOption('custom');
        setIsCustomPaymentMode(true);
        setCustomAmount(parsed.customAmount || 0);
      } catch {
        setError(t('loadError'));
        setLoading(false);
      }
    };

    void loadPayLink();
  }, [payLinkToken, t]);

  useEffect(() => {
    if (
      !retryMode ||
      !activeProductSlug ||
      typeof window === 'undefined' ||
      payLinkToken
    )
      return;

    const raw = window.sessionStorage.getItem('checkout-retry-prefill');
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as RetryPrefillData;

      if (parsed.productSlug !== activeProductSlug) return;
      if (retryOrder && parsed.orderNumber && parsed.orderNumber !== retryOrder)
        return;

      setFullName(parsed.billingData?.fullName || '');
      setEmail(parsed.billingData?.email || '');
      setPhone(parsed.billingData?.phone || '+');
      setCountry(parsed.billingData?.country || '');
      setTermsAgreed(true);
      setRetryReferralId(parsed.referralId || '');
      setRetryPrefill(parsed);
      setCouponCode(parsed.couponCode || '');
      setPaymentOption(parsed.paymentOption || 'full');

      if (parsed.paymentOption === 'custom') {
        setIsCustomPaymentMode(true);
        setCustomAmount(parsed.customAmount || 0);
      } else {
        setIsCustomPaymentMode(false);
      }

      window.sessionStorage.removeItem('checkout-retry-prefill');
    } catch {
      window.sessionStorage.removeItem('checkout-retry-prefill');
    }
  }, [retryMode, retryOrder, activeProductSlug, payLinkToken]);

  useEffect(() => {
    if (selectedCurrency?.countryCode && !country) {
      const countryData = getCountryByCode(selectedCurrency.countryCode);
      if (countryData) {
        setCountry(countryData.value);
      }
    }
  }, [selectedCurrency?.countryCode, country]);

  useEffect(() => {
    if (step !== 2) {
      setShowOptionalReservationFields(false);
    }
  }, [step]);

  useEffect(() => {
    if (!product || !retryPrefill || retryReservationApplied.current) return;

    const answerByKey = new Map(
      (retryPrefill.reservationData || []).map((entry) => [
        entry.key,
        entry.value,
      ]),
    );

    const nextValues: Record<number, string> = {};
    (product.reservationFields || []).forEach((field, index) => {
      const value = answerByKey.get(field.key);
      if (typeof value === 'string') {
        nextValues[index] = value;
      }
    });

    setReservationData((prev) => ({ ...prev, ...nextValues }));
    retryReservationApplied.current = true;
  }, [product, retryPrefill]);

  // Fetch product
  useEffect(() => {
    if (!activeProductSlug) {
      if (!payLinkToken) setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      try {
        const res = await fetch(
          `/api/products/${activeProductSlug}?platform=manasik`,
        );
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
  }, [activeProductSlug, t, payLinkToken]);

  useEffect(() => {
    const fetchBlockedDates = async () => {
      try {
        const res = await fetch('/api/booking/blocked-dates');
        const data = await res.json();
        if (!data.success) return;

        const dates = Array.isArray(data.data?.blockedExecutionDates)
          ? data.data.blockedExecutionDates.filter((item: unknown) =>
              typeof item === 'string'
                ? /^\d{4}-\d{2}-\d{2}$/.test(item)
                : false,
            )
          : [];

        setBlockedExecutionDates(dates);
      } catch {
        setBlockedExecutionDates([]);
      }
    };

    void fetchBlockedDates();
  }, []);

  // ── Upgrade modal: fetch upgrade product when product loads (show on pay click) ──
  useEffect(() => {
    if (!product || !product.upgradeTo) return;
    if (upgradeProductRef.current) return; // already fetched
    const upgradeTo = product.upgradeTo;

    const fetchUpgrade = async () => {
      const resolved = await fetchUpgradeProduct(upgradeTo);
      if (!resolved) return;
      upgradeProductRef.current = resolved;
    };

    fetchUpgrade();
  }, [product]);

  // ── Recommend modal: fetch recommend product when product loads ──
  useEffect(() => {
    if (
      !product ||
      !product.recommendProduct?.recommend ||
      !product.recommendProduct?.product
    )
      return;
    if (recommendProductRef.current) return;
    const recommendTo = product.recommendProduct.product;

    const fetchRecommend = async () => {
      const resolved = await fetchRecommendProduct(recommendTo);
      if (!resolved) return;
      recommendProductRef.current = resolved;
    };

    fetchRecommend();
  }, [product]);

  const applyAuthenticatedCheckoutUser = (user?: {
    name?: string;
    email?: string;
    phone?: string;
    country?: string;
    isBanned?: boolean;
  }) => {
    setIsAuthenticatedCheckout(true);
    setIsBillingLocked(true);
    setTermsAgreed(true);

    if (user) {
      setFullName((prev) => prev || user.name || '');
      setEmail((prev) => prev || user.email || '');
      setPhone((prev) =>
        prev && prev !== '+' ? prev : user.phone || prev || '+',
      );
      setCountry((prev) => prev || user.country || '');
      setIsBannedAccount(Boolean(user.isBanned));
    }

    window.dispatchEvent(new Event('auth-changed'));
  };

  const ensureCheckoutAccountAuthentication = async (): Promise<boolean> => {
    if (isAuthenticatedCheckout) return true;

    const normalizedPassword = accountPassword.trim();
    if (normalizedPassword.length < 6) {
      setShowForgotPasswordHint(false);
      setFormErrors((prev) => ({
        ...prev,
        accountPassword: t('accountPasswordRequired'),
      }));
      setError(t('accountPasswordRequired'));
      return false;
    }

    try {
      const referralId = retryReferralId || getStoredReferral(urlRef);

      const registerRes = await fetch('/api/auth/manasik/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          country: country.trim(),
          password: normalizedPassword,
          ref: referralId ?? null,
        }),
      });

      const registerData = await registerRes.json();

      if (registerRes.ok) {
        setShowForgotPasswordHint(false);
        applyAuthenticatedCheckoutUser(registerData?.data?.user);
        return true;
      }

      if (registerData?.code === 'PHONE_ALREADY_USED') {
        setShowForgotPasswordHint(false);
        setFormErrors((prev) => ({
          ...prev,
          phone: t('phoneAlreadyUsed'),
        }));
        setError(t('phoneAlreadyUsed'));
        return false;
      }

      if (registerData?.code === 'IP_BANNED') {
        setError(t('checkoutRegistrationFailed'));
        return false;
      }

      if (registerData?.code !== 'EMAIL_ALREADY_USED') {
        setShowForgotPasswordHint(false);
        setError(registerData?.error || t('accountAuthFailed'));
        return false;
      }

      const loginRes = await fetch('/api/auth/manasik/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: normalizedPassword,
        }),
      });

      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        setShowForgotPasswordHint(true);
        setFormErrors((prev) => ({
          ...prev,
          accountPassword: t('accountPasswordInvalid'),
        }));
        setError(t('accountLoginFailed'));
        return false;
      }

      setShowForgotPasswordHint(false);
      applyAuthenticatedCheckoutUser(loginData?.data?.user);
      return true;
    } catch {
      setShowForgotPasswordHint(false);
      setError(t('accountAuthFailed'));
      return false;
    }
  };

  const proceedAfterBilling = async (targetProduct: Product) => {
    if (isBannedAccount) {
      setError(t('accountBlockedError'));
      return;
    }

    const authenticated = await ensureCheckoutAccountAuthentication();
    if (!authenticated) return;

    if (getCheckoutReservationFields(targetProduct).length > 0) {
      setStep(2);
      return;
    }

    await submitCheckout(targetProduct);
  };

  // ── Try to show upgrade modal when user clicks pay ────────────────────────
  const handlePayClick = async (option: 'full' | 'half') => {
    setPaymentOption(option);
    setIsCustomPaymentMode(false);
    if (!validateStep1(option) || !validateStep2()) return;
    setError('');

    if (!product) return;

    let up = upgradeProductRef.current;
    const upgradeTo = product.upgradeTo;
    if (!up && upgradeTo) {
      up = await fetchUpgradeProduct(upgradeTo);
      if (up) {
        upgradeProductRef.current = up;
      }
    }

    if (up && !upgradeShown.current) {
      upgradeShown.current = true;
      const currCode = selectedCurrency?.code || 'SAR';
      const curSize = product!.sizes?.[sizeIndex ?? 0];
      const upSize = up.sizes?.[0];

      if (curSize && upSize) {
        let discountDeadlineMs: number | undefined;

        if (
          (product!.upgradeDiscount ?? 0) > 0 &&
          typeof window !== 'undefined'
        ) {
          const timerKey = getUpgradeDiscountTimerKey(product!._id, up._id);
          const now = Date.now();
          const storedDeadlineRaw = window.sessionStorage.getItem(timerKey);

          if (storedDeadlineRaw) {
            const storedDeadline = Number(storedDeadlineRaw);
            if (Number.isFinite(storedDeadline) && storedDeadline > now) {
              discountDeadlineMs = storedDeadline;
            } else if (
              Number.isFinite(storedDeadline) &&
              storedDeadline <= now
            ) {
              await proceedAfterBilling(product);
              return;
            } else {
              discountDeadlineMs = now + UPGRADE_DISCOUNT_DURATION_MS;
              window.sessionStorage.setItem(
                timerKey,
                String(discountDeadlineMs),
              );
            }
          } else {
            discountDeadlineMs = now + UPGRADE_DISCOUNT_DURATION_MS;
            window.sessionStorage.setItem(timerKey, String(discountDeadlineMs));
          }
        }

        const findPrice = (size: typeof curSize, code: string) => {
          const cp = size.prices?.find(
            (p) => p.currencyCode === code.toUpperCase(),
          );
          return cp
            ? { amount: cp.amount, currency: code }
            : { amount: size.price ?? 0, currency: product!.baseCurrency };
        };

        const curPrice = findPrice(curSize, currCode);
        const upPrice = findPrice(upSize, currCode);

        showUpgradeModal({
          currentName: product!.name,
          currentPrice: curPrice.amount * quantity,
          currentCurrency: curPrice.currency,
          currentFeedsUp: curSize.feedsUp ?? 0,
          currentFeatures: getLocalizedUpgradeFeatures(product!, isRTL),
          upgradeName: up.name,
          upgradePrice: upPrice.amount * quantity,
          upgradeCurrency: upPrice.currency,
          upgradeFeedsUp: upSize.feedsUp ?? 0,
          upgradeFeatures: getLocalizedUpgradeFeatures(up, isRTL),
          upgradeDiscount: product!.upgradeDiscount ?? 0,
          discountDeadlineMs,
          onAccept: () => {
            setProduct(up);
            // Track the accepted upgrade with discount from original product
            setAcceptedUpgrade({
              fromProductId: product!._id,
              discount: product!.upgradeDiscount ?? 0,
            });
            void proceedAfterBilling(up);
          },
          onDecline: () => {
            void proceedAfterBilling(product!);
          },
          onTimerExpire: () => {
            void proceedAfterBilling(product!);
          },
        });
        return;
      }
    }

    await proceedAfterBilling(product);
  };

  // ── FB Pixel: InitiateCheckout (fire once when product loads) ──────────────
  useEffect(() => {
    if (!product || checkoutTracked.current) return;
    checkoutTracked.current = true;

    const price = product.sizes?.[sizeIndex ?? 0]?.price ?? 0;
    trackEvent('InitiateCheckout', {
      content_ids: [product._id],
      content_type: 'product',
      content_name: isRTL ? product.name.ar : product.name.en,
      value: price * quantity,
      currency: product.baseCurrency || 'SAR',
      num_items: quantity,
    });
  }, [product, sizeIndex, quantity, isRTL]);

  // Get price in selected currency — always uses sizes
  const getPrice = (): { amount: number; currency: string } | null => {
    if (!product) return null;

    const currencyCode = selectedCurrency?.code || 'SAR';

    // Always use sizes — sizeIndex defaults to 0
    const activeSizeIndex =
      sizeIndex !== null && sizeIndex >= 0 && sizeIndex < product.sizes.length
        ? sizeIndex
        : 0;
    const selectedSizeObj = product.sizes[activeSizeIndex];

    const sizeCurrencyPrice = selectedSizeObj.prices?.find(
      (p) => p.currencyCode === currencyCode.toUpperCase(),
    );
    if (sizeCurrencyPrice) {
      return { amount: sizeCurrencyPrice.amount, currency: currencyCode };
    }
    const sizePrice = selectedSizeObj.price ?? 0;
    if (product.baseCurrency === currencyCode.toUpperCase()) {
      return { amount: sizePrice, currency: currencyCode };
    }
    return {
      amount: sizePrice,
      currency: product.baseCurrency,
    };
  };

  const priceInfo = getPrice();
  const subtotal = priceInfo ? priceInfo.amount * quantity : 0;
  // Calculate upgrade discount amount
  const upgradeDiscountAmount =
    acceptedUpgrade && acceptedUpgrade.discount > 0
      ? Math.round(subtotal * (acceptedUpgrade.discount / 100))
      : 0;
  const priceAfterUpgradeDiscount = subtotal - upgradeDiscountAmount;
  const couponDiscountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;

  // Calculate recommended product amount
  const recommendAddonAmount = useMemo(() => {
    if (!acceptedRecommendProductId || !recommendProductRef.current) return 0;
    const currCode = selectedCurrency?.code || 'SAR';
    const recSize = recommendProductRef.current.sizes?.[0];
    if (!recSize) return 0;
    const cp = recSize.prices?.find(
      (p) => p.currencyCode === currCode.toUpperCase(),
    );
    return cp ? cp.amount : (recSize.price ?? 0);
  }, [acceptedRecommendProductId, selectedCurrency?.code]);

  const totalAfterDiscount =
    priceAfterUpgradeDiscount - couponDiscountAmount + recommendAddonAmount;

  // Calculate payment amount
  const getPayAmount = (): number => {
    if (paymentOption === 'full') return totalAfterDiscount;
    if (paymentOption === 'half' && product?.supportsHalfPayment === false) {
      return totalAfterDiscount;
    }
    if (paymentOption === 'half') return Math.ceil(totalAfterDiscount / 2);
    if (paymentOption === 'custom') return customAmount || 0;
    return totalAfterDiscount;
  };

  const payAmount = getPayAmount();

  useEffect(() => {
    if (quantity === 1 || !isCustomPaymentMode) return;

    setIsCustomPaymentMode(false);
    setCustomAmount(0);
    if (paymentOption === 'custom') {
      setPaymentOption('full');
    }
  }, [isCustomPaymentMode, paymentOption, quantity]);

  useEffect(() => {
    if (paymentOption !== 'half') return;
    if (product?.supportsHalfPayment === false) {
      setPaymentOption('full');
    }
  }, [paymentOption, product?.supportsHalfPayment]);

  // ── FB Pixel: AddPaymentInfo (fire when user proceeds to billing step) ─────
  useEffect(() => {
    if (step !== 2 || !product || !priceInfo) return;

    trackEvent('AddPaymentInfo', {
      content_ids: [product._id],
      content_type: 'product',
      value: payAmount,
      currency: priceInfo.currency,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Get minimum payment amount
  const getMinPayment = (): number => {
    if (!product?.partialPayment?.isAllowed)
      return Math.ceil(totalAfterDiscount / 2);
    const currencyCode = (priceInfo?.currency || 'SAR').toUpperCase();
    const minimumType = product.partialPayment.minimumType || 'percentage';
    const currencyMinimum = product.partialPayment.minimumPayments?.find(
      (mp: { currencyCode: string; value: number }) =>
        mp.currencyCode === currencyCode,
    );
    if (currencyMinimum) {
      if (minimumType === 'percentage') {
        return Math.ceil((totalAfterDiscount * currencyMinimum.value) / 100);
      }
      return currencyMinimum.value;
    }
    return Math.ceil(totalAfterDiscount / 2);
  };

  useEffect(() => {
    if (
      !retryPrefill?.couponCode ||
      !priceInfo ||
      retryCouponApplied.current ||
      appliedCoupon
    ) {
      return;
    }

    retryCouponApplied.current = true;
    setCouponLoading(true);
    setCouponError('');

    fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: retryPrefill.couponCode,
        orderAmount: subtotal,
        currency: priceInfo.currency,
        productId: product?._id,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAppliedCoupon({
            code: data.data.code,
            discountAmount: data.data.discountAmount,
            type: data.data.type,
            value: data.data.value,
          });
        } else {
          setCouponError(
            t(`couponErrors.${data.error}`, {
              defaultValue: t('couponInvalid'),
            }),
          );
          setAppliedCoupon(null);
        }
      })
      .catch(() => {
        setCouponError(t('couponInvalid'));
      })
      .finally(() => {
        setCouponLoading(false);
      });
  }, [retryPrefill, priceInfo, appliedCoupon, subtotal, product?._id, t]);

  // Apply coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !priceInfo) return;

    setCouponLoading(true);
    setCouponError('');
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
        setCouponError('');
      } else {
        setCouponError(
          t(`couponErrors.${data.error}`, { defaultValue: t('couponInvalid') }),
        );
        setAppliedCoupon(null);
      }
    } catch {
      setCouponError(t('couponInvalid'));
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  useEffect(() => {
    if (appliedCoupon || couponError) {
      setIsCouponSectionOpen(true);
    }
  }, [appliedCoupon, couponError]);

  const validateStep1 = (option: PaymentOption = paymentOption): boolean => {
    if (formErrors.accountPassword) {
      setFormErrors((prev) => ({ ...prev, accountPassword: '' }));
    }

    if (!termsAgreed) {
      setError(t('termsRequired'));
      return false;
    }

    const requiresPassword = !isAuthenticatedCheckout;

    if (requiresPassword && accountPassword.trim().length < 6) {
      setFormErrors((prev) => ({
        ...prev,
        accountPassword: t('accountPasswordRequired'),
      }));
      setError('');
      return false;
    }

    if (option === 'half' && product?.supportsHalfPayment === false) {
      setError(t('halfPaymentNotAllowed'));
      return false;
    }

    if (option === 'custom') {
      if (!product?.partialPayment?.isAllowed) {
        setError(t('customPaymentNotAllowed'));
        return false;
      }
      if (quantity !== 1) {
        setError(t('customPaymentSingleQuantityMessage'));
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
    } else {
      try {
        if (!isValidPhoneNumber(phone)) {
          errors.phone = t('invalidWhatsAppPhone');
        }
      } catch {
        errors.phone = t('invalidWhatsAppPhone');
      }
    }
    if (!country.trim()) errors.country = t('required');

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep3 = (): boolean => {
    if (!product) return false;

    const checkoutReservationFields = getCheckoutReservationFields(product);

    for (let idx = 0; idx < checkoutReservationFields.length; idx += 1) {
      const field = checkoutReservationFields[idx];
      const value = (reservationData[idx] || '').trim();

      if (field.required && !value) {
        setError(t('reservationRequiredError'));
        return false;
      }

      if (
        value &&
        (field.type === 'text' || field.type === 'textarea') &&
        field.maxLength &&
        value.length > field.maxLength
      ) {
        setError(t('reservationMaxLengthError', { max: field.maxLength }));
        return false;
      }

      if (
        isExecutionDateKey(field.key) &&
        value &&
        blockedExecutionDates.includes(value)
      ) {
        setError(t('executionDateBlockedError'));
        return false;
      }

      if (isExecutionDateKey(field.key) && value) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayIso = toIsoLocalDate(today);
        if (value <= todayIso) {
          setError(t('executionDatePastError'));
          return false;
        }
      }
    }

    setError('');
    return true;
  };

  const submitCheckout = async (
    targetProduct: Product | null = product,
    explicitRecommendProductId?: string,
  ): Promise<void> => {
    if (!validateStep3() || !targetProduct || !priceInfo) return;

    setSubmitting(true);
    setError('');

    try {
      const referralId = retryReferralId || getStoredReferral(urlRef);

      const res = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: targetProduct._id,
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
          ref: referralId ?? null,
          referralId,
          sizeIndex: sizeIndex ?? 0,
          paymentOption,
          customPaymentAmount:
            paymentOption === 'custom' ? customAmount : undefined,
          createAccount: !isAuthenticatedCheckout,
          accountPassword: !isAuthenticatedCheckout
            ? accountPassword
            : undefined,
          termsAgreed,
          reservationData: getCheckoutReservationFields(targetProduct).map(
            (field, idx) => ({
              key: field.key,
              label: field.label,
              type: field.type,
              value: reservationData[idx] || '',
            }),
          ),
          source: 'manasik',
          // Include upgrade discount info if user accepted an upgrade
          isUpgrade: acceptedUpgrade ? true : undefined,
          fromProductId: acceptedUpgrade?.fromProductId,
          upgradeDiscount: acceptedUpgrade?.discount,
          recommendProductId:
            explicitRecommendProductId ||
            acceptedRecommendProductId ||
            undefined,
        }),
      });

      const data = await res.json();

      if (data.success && data.data.checkoutUrl) {
        window.location.href = data.data.checkoutUrl;
      } else if (data.success && !data.data.checkoutUrl) {
        setError(t('gatewayNotConfigured'));
        setSubmitting(false);
      } else if (data.code === 'EMAIL_ALREADY_USED') {
        setFormErrors((prev) => ({
          ...prev,
          email: t('emailAlreadyUsed'),
        }));
        setError(t('emailAlreadyUsed'));
        setSubmitting(false);
      } else if (data.code === 'PHONE_ALREADY_USED') {
        setFormErrors((prev) => ({
          ...prev,
          phone: t('phoneAlreadyUsed'),
        }));
        setError(t('phoneAlreadyUsed'));
        setSubmitting(false);
      } else if (data.code === 'ACCOUNT_PASSWORD_REQUIRED') {
        setFormErrors((prev) => ({
          ...prev,
          accountPassword: t('accountPasswordRequired'),
        }));
        setError(t('accountPasswordRequired'));
        setSubmitting(false);
      } else if (data.code === 'OUTSTANDING_BALANCE_EXISTS') {
        setError(t('outstandingBalanceBlockError'));
        setSubmitting(false);
      } else if (data.code === 'ACCOUNT_ACTION_BLOCKED') {
        setError(t('accountBlockedError'));
        setSubmitting(false);
      } else if (data.code === 'SAME_USER_PARTIAL_ORDER') {
        // Same user's partial payment order - show order number and link to history
        const orderNum = data.blockingOrderNumber;
        setError(
          orderNum
            ? t('sameUserPartialPaymentError', { orderNumber: orderNum })
            : t('partialPaymentOrderError'),
        );
        // Store blocking order number for potential link creation
        if (orderNum) {
          // Frontend can optionally create a link here if needed
          const historyLink = `/order-history?orderNum=${encodeURIComponent(orderNum)}`;
          console.log('Partial payment order:', orderNum, 'Link:', historyLink);
        }
        setSubmitting(false);
      } else if (data.code === 'OTHER_ACCOUNT_PARTIAL_ORDER') {
        // Different account's partial payment order
        setError(t('otherAccountPartialPaymentError'));
        setSubmitting(false);
      } else if (data.code === 'IP_BANNED' || data.code === 'BANNED_IP') {
        // Show generic message for IP ban
        setError(t('checkoutRegistrationFailed'));
        setSubmitting(false);
      } else if (
        data.code === 'REGISTERED_EMAIL_LOGIN_REQUIRED' &&
        typeof data.redirectTo === 'string'
      ) {
        window.location.href = data.redirectTo;
      } else {
        setError(data.error || t('checkoutError'));
        setSubmitting(false);
      }
    } catch {
      setError(t('checkoutError'));
      setSubmitting(false);
    }
  };

  const handlePictureChange = (idx: number, file: File | null) => {
    if (!file) {
      setReservationData((prev) => ({ ...prev, [idx]: '' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setReservationData((prev) => ({ ...prev, [idx]: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleReservationValueChange = (idx: number, value: string) => {
    setReservationData((prev) => ({
      ...prev,
      [idx]: value,
    }));
  };

  const handleReservationFileChange = (idx: number, file: File | null) => {
    handlePictureChange(idx, file);
  };

  const handleEnableCustomPayment = () => {
    setPaymentOption('custom');
    setIsCustomPaymentMode(true);
    setError('');
  };

  const handleProceedCustomPayment = async () => {
    if (validateStep1('custom') && validateStep2()) {
      setError('');
      await proceedAfterBilling(product!);
    }
  };

  const handleConfirmCustomQuantity = () => {
    setResolvedQuantity(1);
    setPaymentOption('custom');
    setIsCustomPaymentMode(true);
    setShowCustomPaymentQuantityModal(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product || !priceInfo) return;

    if (!validateStep3()) return;

    let recProdObj = recommendProductRef.current;
    if (
      !recProdObj &&
      product.recommendProduct?.recommend &&
      product.recommendProduct?.product
    ) {
      recProdObj = await fetchRecommendProduct(
        product.recommendProduct.product,
      );
      if (recProdObj) {
        recommendProductRef.current = recProdObj;
      }
    }

    if (recProdObj && !recommendShown.current) {
      recommendShown.current = true;
      const currCode = selectedCurrency?.code || 'SAR';
      const recSize = recProdObj.sizes?.[0];

      if (recSize) {
        const findPrice = (size: typeof recSize, code: string) => {
          const cp = size.prices?.find(
            (p) => p.currencyCode === code.toUpperCase(),
          );
          return cp
            ? { amount: cp.amount, currency: code }
            : { amount: size.price ?? 0, currency: recProdObj!.baseCurrency };
        };

        const recPrice = findPrice(recSize, currCode);

        showRecommendModal({
          productName: recProdObj.name,
          productPrice: recPrice.amount,
          productCurrency: recPrice.currency,
          productFeedsUp: recSize.feedsUp ?? 0,
          productContent: recProdObj.content,
          onAccept: () => {
            setAcceptedRecommendProductId(recProdObj!._id);
            void submitCheckout(product, recProdObj!._id);
          },
          onDecline: () => {
            void submitCheckout();
          },
        });
        return;
      }
    }

    await submitCheckout();
  };

  type ReservationField = NonNullable<Product['reservationFields']>[number];

  const getCheckoutReservationFields = useCallback(
    (targetProduct: Product | null): ReservationField[] => {
      return targetProduct?.reservationFields ?? [];
    },
    [],
  );

  useEffect(() => {
    if (product?.workAsSacrifice) return;

    const checkoutReservationFields = getCheckoutReservationFields(product);
    const intentionIndex = checkoutReservationFields.findIndex(
      (field) => field.key === 'intention',
    );

    if (intentionIndex < 0) return;

    const selectedIntention = reservationData[intentionIndex] || '';
    if (!isAqeeqahIntentionValue(selectedIntention)) return;

    setReservationData((prev) => ({
      ...prev,
      [intentionIndex]: '',
    }));
  }, [product, reservationData, getCheckoutReservationFields]);

  useEffect(() => {
    if (step !== 2) {
      setShowAqeeqahGuidanceModal(false);
      return;
    }

    const checkoutReservationFields = getCheckoutReservationFields(product);
    const intentionIndex = checkoutReservationFields.findIndex(
      (field) => field.key === 'intention',
    );
    const selectedIntention =
      intentionIndex >= 0 ? reservationData[intentionIndex] || '' : '';

    if (!isAqeeqahIntentionValue(selectedIntention)) {
      if (aqeeqahGuidanceAcknowledgedValue) {
        setAqeeqahGuidanceAcknowledgedValue('');
      }
      setShowAqeeqahGuidanceModal(false);
      return;
    }

    if (selectedIntention !== aqeeqahGuidanceAcknowledgedValue) {
      setShowAqeeqahGuidanceModal(true);
    }
  }, [
    step,
    product,
    reservationData,
    getCheckoutReservationFields,
    aqeeqahGuidanceAcknowledgedValue,
  ]);

  const toIsoLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // No product ID
  if (!productId) {
    return (
      <CheckoutEmptyState
        title={t('noProduct')}
        message={t('noProductMessage')}
        buttonLabel={t('browseProducts')}
        buttonHref="/products"
      />
    );
  }

  if (loading) {
    return <PageLoading />;
  }

  if (!product) {
    return (
      <CheckoutEmptyState
        title={t('productNotFound')}
        message={t('productNotFoundMessage')}
        buttonLabel={t('browseProducts')}
        buttonHref="/products"
      />
    );
  }

  const productName = locale === 'ar' ? product.name.ar : product.name.en;
  const productImage =
    getPrimaryProductImageUrl(product) || product.media[0].url;
  const selectedSizeName =
    sizeIndex !== null &&
    product.sizes &&
    sizeIndex >= 0 &&
    sizeIndex < product.sizes.length
      ? locale === 'ar'
        ? product.sizes[sizeIndex].name.ar
        : product.sizes[sizeIndex].name.en
      : null;

  const checkoutReservationFields = getCheckoutReservationFields(product);
  const reservationFieldEntries = checkoutReservationFields.map(
    (field, idx) => ({ field, idx }),
  );
  const intentionReservationEntry = reservationFieldEntries.find(
    ({ field }) => field.key === 'intention',
  );
  const selectedIntentionValue = intentionReservationEntry
    ? reservationData[intentionReservationEntry.idx] || ''
    : '';
  const hasHalfPaymentOption = product.supportsHalfPayment !== false;
  const hasCustomPaymentOption = Boolean(product.partialPayment?.isAllowed);
  const hasSinglePaymentOption =
    !hasHalfPaymentOption && !hasCustomPaymentOption;
  const singlePaymentPrimaryLabel =
    checkoutReservationFields.length > 0
      ? t('payFullSingleToReservation')
      : t('payFullSingleToPayment');
  const acceptedRecommendProduct =
    acceptedRecommendProductId && recommendProductRef.current
      ? recommendProductRef.current
      : null;

  return (
    <>
      <main className="grid-bg min-h-screen pt-28 pb-16">
        <div className="gbf gbf-right gbf-lg" />
        <Container>
          <div className="flex items-center justify-between  mb-8">
            <div className="flex items-center gap-3">
              <BackButton />
              <h1 className="text-2xl md:text-3xl font-bold">{t('title')}</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <CheckoutOrderSummary
              product={product}
              productName={productName}
              productImage={productImage}
              selectedSizeName={selectedSizeName}
              priceInfo={priceInfo}
              quantity={quantity}
              subtotal={subtotal}
              acceptedUpgrade={acceptedUpgrade}
              upgradeDiscountAmount={upgradeDiscountAmount}
              appliedCoupon={appliedCoupon}
              couponDiscountAmount={couponDiscountAmount}
              acceptedRecommendProduct={acceptedRecommendProduct}
              recommendAddonAmount={recommendAddonAmount}
              paymentOption={paymentOption}
              payAmount={payAmount}
              isCouponSectionOpen={isCouponSectionOpen}
              couponCode={couponCode}
              couponLoading={couponLoading}
              couponError={couponError}
              onToggleCouponSection={() =>
                setIsCouponSectionOpen((prev) => !prev)
              }
              onCouponCodeChange={(value) => {
                setCouponCode(value);
                if (couponError) setCouponError('');
              }}
              onApplyCoupon={handleApplyCoupon}
              onRemoveCoupon={handleRemoveCoupon}
            />

            <div className="lg:col-span-3">
              {step === 1 && (
                <CheckoutBillingStep
                  fullName={fullName}
                  email={email}
                  phone={phone}
                  country={country}
                  accountPassword={accountPassword}
                  termsAgreed={termsAgreed}
                  isBillingLocked={isBillingLocked}
                  isAuthenticatedCheckout={isAuthenticatedCheckout}
                  showForgotPasswordHint={showForgotPasswordHint}
                  formErrors={formErrors}
                  error={error}
                  submitting={submitting}
                  paymentOption={paymentOption}
                  isCustomPaymentMode={isCustomPaymentMode}
                  quantity={quantity}
                  customAmount={customAmount}
                  totalAfterDiscount={totalAfterDiscount}
                  priceCurrency={priceInfo?.currency}
                  minPayment={getMinPayment()}
                  hasHalfPaymentOption={hasHalfPaymentOption}
                  hasCustomPaymentOption={hasCustomPaymentOption}
                  hasSinglePaymentOption={hasSinglePaymentOption}
                  singlePaymentPrimaryLabel={singlePaymentPrimaryLabel}
                  onFullNameChange={setFullName}
                  onEmailChange={(value) => {
                    setEmail(value);
                    setShowForgotPasswordHint(false);
                    if (formErrors.email) {
                      setFormErrors((prev) => ({ ...prev, email: '' }));
                    }
                  }}
                  onPhoneChange={(value) => {
                    setPhone(value);
                    if (formErrors.phone) {
                      setFormErrors((prev) => ({ ...prev, phone: '' }));
                    }
                  }}
                  onCountryChange={(value) => {
                    setCountry(value);
                    if (formErrors.country) {
                      setFormErrors((prev) => ({ ...prev, country: '' }));
                    }
                  }}
                  onAccountPasswordChange={(value) => {
                    setAccountPassword(value);
                    setShowForgotPasswordHint(false);
                    if (formErrors.accountPassword) {
                      setFormErrors((prev) => ({
                        ...prev,
                        accountPassword: '',
                      }));
                    }
                  }}
                  onTermsAgreedChange={setTermsAgreed}
                  onPayClick={(option) => void handlePayClick(option)}
                  onOpenCustomQuantityModal={() =>
                    setShowCustomPaymentQuantityModal(true)
                  }
                  onEnableCustomPayment={handleEnableCustomPayment}
                  onCustomAmountChange={setCustomAmount}
                  onProceedCustomPayment={() => {
                    void handleProceedCustomPayment();
                  }}
                />
              )}

              {step === 2 && (
                <CheckoutReservationStep
                  product={product}
                  reservationData={reservationData}
                  blockedExecutionDates={blockedExecutionDates}
                  showOptionalReservationFields={showOptionalReservationFields}
                  error={error}
                  submitting={submitting}
                  payAmount={payAmount}
                  priceCurrency={priceInfo?.currency}
                  onBack={() => setStep(1)}
                  onToggleOptionalFields={() =>
                    setShowOptionalReservationFields((prev) => !prev)
                  }
                  onSubmit={handleSubmit}
                  onReservationValueChange={handleReservationValueChange}
                  onReservationFileChange={handleReservationFileChange}
                />
              )}
            </div>
          </div>
        </Container>
      </main>
      <Footer />
      <GoToTop />
      <WhatsAppButton />
      <CheckoutUpgradeModal info={upgradeInfo} onClose={hideUpgradeModal} />
      <CheckoutRecommendModal
        info={recommendInfo}
        onClose={hideRecommendModal}
      />
      <CheckoutCustomPaymentQuantityModal
        isOpen={showCustomPaymentQuantityModal}
        onClose={() => setShowCustomPaymentQuantityModal(false)}
        onKeepCurrent={() => setShowCustomPaymentQuantityModal(false)}
        onSetOne={handleConfirmCustomQuantity}
      />
      <CheckoutAqeeqahGuidanceModal
        isOpen={showAqeeqahGuidanceModal}
        onClose={() => setShowAqeeqahGuidanceModal(false)}
        onUnderstood={() => {
          setAqeeqahGuidanceAcknowledgedValue(selectedIntentionValue);
          setShowAqeeqahGuidanceModal(false);
        }}
      />
    </>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Header />
      <CheckoutContent />
    </Suspense>
  );
}
