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
import Image from 'next/image';
import Link from 'next/link';
import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import CountrySelector from '@/components/shared/country-selector';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Checkbox from '@/components/ui/checkbox';
import Modal from '@/components/ui/modal';
import Dropdown from '@/components/ui/dropdown';
import RadioButton from '@/components/ui/radio-button';
import Textarea from '@/components/ui/textarea';
import CustomDatePicker from '@/components/ui/custom-date-picker';
import ImagePicker from '@/components/ui/image-picker';
import MultiNameInput from '@/components/ui/multi-name-input';
import { useCurrency } from '@/hooks/currency-hook';
import { useTranslations, useLocale } from 'next-intl';
import { Product, getPrimaryProductImageUrl } from '@/types/Product';
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
import BackButton from '@/components/shared/back-button';
import OutstandingBalanceWarning from '@/components/shared/outstanding-balance-warning';
import { LuChevronDown } from 'react-icons/lu';
import Header from '@/components/layout/header';

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

function CheckoutContent() {
  const searchParams = useSearchParams();
  const t = useTranslations('checkout');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { selectedCurrency } = useCurrency();
  const isRTL = locale === 'ar';

  const productId = searchParams.get('prod');
  const qtyParam = searchParams.get('qty');
  const refParam = searchParams.get('ref');
  const sizeParam = searchParams.get('size');
  const retryMode = searchParams.get('retry') === '1';
  const retryOrder = searchParams.get('retryOrder');
  const payLinkToken = searchParams.get('payLink');

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

  // Upgrade modal
  const {
    info: upgradeInfo,
    showUpgradeModal,
    hideUpgradeModal,
  } = useCheckoutUpgradeModal();
  const upgradeShown = useRef(false);
  const upgradeProductRef = useRef<Product | null>(null);

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
      const registerRes = await fetch('/api/auth/manasik/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          country: country.trim(),
          password: normalizedPassword,
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
  const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const totalAfterDiscount = subtotal - discount;

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
      const normalizedPhone = phone.replace(/[\s()-]/g, '');
      if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
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
  ): Promise<void> => {
    if (!validateStep3() || !targetProduct || !priceInfo) return;

    setSubmitting(true);
    setError('');

    try {
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
          referralId: retryReferralId || getStoredReferral(refParam),
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await submitCheckout();
  };

  type ReservationField = NonNullable<Product['reservationFields']>[number];

  const getCheckoutReservationFields = useCallback(
    (targetProduct: Product | null): ReservationField[] => {
      return targetProduct?.reservationFields ?? [];
    },
    [],
  );

  const getVisibleReservationOptions = (field: ReservationField) => {
    const options = field.options ?? [];

    if (field.key !== 'intention' || product?.workAsSacrifice) {
      return options;
    }

    return options.filter(
      (opt) => !isAqeeqahIntentionValue(`${opt.en} ${opt.ar}`),
    );
  };

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

  const renderReservationInput = (
    field: ReservationField,
    idx: number,
    label: string,
  ) => {
    if (field.type === 'select') {
      const visibleOptions = getVisibleReservationOptions(field);

      return (
        <Dropdown<string>
          value={reservationData[idx] || ''}
          onChange={(value) =>
            setReservationData((prev) => ({
              ...prev,
              [idx]: value,
            }))
          }
          options={visibleOptions.map((opt) => ({
            label: isRTL ? opt.ar : opt.en,
            value: isRTL ? opt.ar : opt.en,
          }))}
          placeholder="-"
        />
      );
    }

    if (field.type === 'radio') {
      const visibleOptions = getVisibleReservationOptions(field);

      return (
        <div className="flex flex-wrap items-center gap-4">
          {visibleOptions.map((opt, oi) => {
            const optionValue = isRTL ? opt.ar : opt.en;
            const optionId = `reservation_${idx}_${oi}`;

            return (
              <RadioButton
                key={optionId}
                id={optionId}
                name={`reservation_${idx}`}
                value={optionValue}
                label={optionValue}
                checked={reservationData[idx] === optionValue}
                onChange={(value) =>
                  setReservationData((prev) => ({
                    ...prev,
                    [idx]: value,
                  }))
                }
              />
            );
          })}
        </div>
      );
    }

    if (field.type === 'text' && field.supportsMulti) {
      return (
        <MultiNameInput
          value={reservationData[idx] || ''}
          onChange={(val) =>
            setReservationData((prev) => ({ ...prev, [idx]: val }))
          }
          placeholder={
            isRTL ? 'أدخل اسمًا ثم اضغط +' : 'Enter a name then press +'
          }
          maxLength={field.maxLength}
          isRTL={isRTL}
        />
      );
    }

    if (field.type === 'textarea') {
      return (
        <Textarea
          value={reservationData[idx] || ''}
          onChange={(e) =>
            setReservationData((prev) => ({
              ...prev,
              [idx]: e.target.value,
            }))
          }
          maxLength={field.maxLength}
          dir={isRTL ? 'rtl' : 'ltr'}
        />
      );
    }

    if (field.type === 'picture') {
      return (
        <ImagePicker
          label={label}
          value={reservationData[idx] || ''}
          onChange={(file) => handlePictureChange(idx, file)}
          placeholder={t('imagePickerPlaceholder')}
        />
      );
    }

    if (field.type === 'date') {
      const isExecutionField = isExecutionDateKey(field.key);
      const minDate = isExecutionField
        ? (() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return toIsoLocalDate(tomorrow);
          })()
        : undefined;
      return (
        <CustomDatePicker
          value={reservationData[idx] || ''}
          onChange={(nextValue) =>
            setReservationData((prev) => ({
              ...prev,
              [idx]: nextValue,
            }))
          }
          placeholder={t('datePickerPlaceholder')}
          locale={locale}
          blockedDates={isExecutionField ? blockedExecutionDates : undefined}
          minDate={minDate}
          required={field.required}
          dir={isRTL ? 'rtl' : 'ltr'}
        />
      );
    }

    return (
      <Input
        type={field.type}
        value={reservationData[idx] || ''}
        onChange={(e) =>
          setReservationData((prev) => ({
            ...prev,
            [idx]: e.target.value,
          }))
        }
        maxLength={field.type === 'text' ? field.maxLength : undefined}
        dir={isRTL ? 'rtl' : 'ltr'}
      />
    );
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

  if (loading) {
    return <PageLoading />;
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
  const productImage = getPrimaryProductImageUrl(product);
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
  const requiredReservationFieldEntries = reservationFieldEntries.filter(
    ({ field }) => field.required,
  );
  const optionalReservationFieldEntries = reservationFieldEntries.filter(
    ({ field }) => !field.required,
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

  return (
    <>
      <main className="grid-bg min-h-screen pt-28 pb-16">
        <div className="gbf gbf-right gbf-lg" />
        <Container>
          {/* Page Title */}
          <div className="flex items-center justify-between  mb-8">
            <div className="flex items-center gap-3">
              <BackButton />
              <h1 className="text-2xl md:text-3xl font-bold">{t('title')}</h1>
            </div>
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
                  {paymentOption !== 'full' &&
                    ((paymentOption === 'half' &&
                      product.supportsHalfPayment !== false) ||
                      (paymentOption === 'custom' &&
                        product.partialPayment?.isAllowed)) && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-secondary">{t('payingNow')}</span>
                        <span className="font-semibold text-success">
                          {payAmount.toLocaleString()} {priceInfo?.currency}
                        </span>
                      </div>
                    )}
                </div>

                <div className="pt-4 mt-4 border-t border-stroke space-y-3">
                  <h3 className="text-sm font-semibold">{t('couponTitle')}</h3>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-3 bg-success/10 border border-success/30 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <Tag size={14} className="text-success shrink-0" />
                        <span className="font-mono font-bold text-success truncate">
                          {appliedCoupon.code}
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
                    <div className="space-y-2">
                      <Input
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase());
                          if (couponError) setCouponError('');
                        }}
                        placeholder={t('couponPlaceholder')}
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        className="w-full px-4 py-2.5 bg-success text-white rounded-lg hover:bg-success/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {couponLoading ? (
                          <Loader2 size={18} className="animate-spin mx-auto" />
                        ) : (
                          t('applyCoupon')
                        )}
                      </button>
                      {couponError && (
                        <p className="text-xs text-error">{couponError}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              {/* STEP 1: Billing Information */}
              {step === 1 && (
                <div className="bg-card-bg border border-stroke rounded-site p-6 space-y-4">
                  <h2 className="text-lg font-semibold">{t('billingInfo')}</h2>
                  <p className="text-sm text-secondary">
                    {t('billingInfoHint')}
                  </p>

                  <Input
                    label={t('fullName')}
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (formErrors.fullName) {
                        setFormErrors((prev) => ({ ...prev, fullName: '' }));
                      }
                    }}
                    error={formErrors.fullName}
                    placeholder={t('fullNamePlaceholder')}
                    required
                    disabled={isBillingLocked}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />

                  <Input
                    label={t('email')}
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setShowForgotPasswordHint(false);
                      if (formErrors.email) {
                        setFormErrors((prev) => ({ ...prev, email: '' }));
                      }
                    }}
                    error={formErrors.email}
                    placeholder={t('emailPlaceholder')}
                    required
                    disabled={isBillingLocked}
                    dir="ltr"
                  />

                  <Input
                    label={t('phoneWhatsApp')}
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const next = raw.startsWith('+')
                        ? raw
                        : '+' + raw.replace(/^\++/, '');
                      setPhone(next);
                      if (formErrors.phone) {
                        setFormErrors((prev) => ({ ...prev, phone: '' }));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (
                        (e.key === 'Backspace' || e.key === 'Delete') &&
                        phone === '+'
                      ) {
                        e.preventDefault();
                      }
                    }}
                    error={formErrors.phone}
                    placeholder={t('phonePlaceholder')}
                    required
                    disabled={isBillingLocked}
                    dir="ltr"
                  />

                  <CountrySelector
                    value={country}
                    onChange={(value) => {
                      setCountry(value);
                      if (formErrors.country) {
                        setFormErrors((prev) => ({ ...prev, country: '' }));
                      }
                    }}
                    error={formErrors.country}
                    placeholder={t('countryPlaceholder')}
                    disabled={isBillingLocked}
                  />

                  {isBillingLocked && (
                    <p className="text-xs text-secondary">
                      {locale === 'ar'
                        ? 'تم تعبئة البيانات من حسابك. يمكنك تعديلها من '
                        : 'Your information is pre-filled from your profile. You can edit it from '}
                      <Link
                        href="/user/settings"
                        className="text-success hover:underline"
                      >
                        {locale === 'ar' ? 'صفحة الإعدادات' : 'Settings'}
                      </Link>
                      .
                    </p>
                  )}

                  {!isAuthenticatedCheckout && (
                    <div className="space-y-3 rounded-site border border-stroke bg-background/40 p-3">
                      <Input
                        id="checkout-account-password"
                        type="password"
                        label={t('accountPasswordLabel')}
                        value={accountPassword}
                        onChange={(e) => {
                          setAccountPassword(e.target.value);
                          setShowForgotPasswordHint(false);
                          if (formErrors.accountPassword) {
                            setFormErrors((prev) => ({
                              ...prev,
                              accountPassword: '',
                            }));
                          }
                        }}
                        placeholder={t('accountPasswordPlaceholder')}
                        error={formErrors.accountPassword}
                        showPasswordToggle
                        required
                      />

                      {showForgotPasswordHint && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-secondary">
                          <span>{t('accountForgotPasswordHint')}</span>
                          <Link
                            href={`/auth/forgot-password?email=${encodeURIComponent(email.trim())}`}
                            className="text-success underline underline-offset-2 hover:text-success/80"
                          >
                            {t('accountForgotPasswordLink')}
                          </Link>
                        </div>
                      )}

                      <p className="text-xs text-secondary">
                        {t('accountRequiredForCheckout')}
                      </p>
                    </div>
                  )}

                  <div>
                    <div
                      className={`flex items-start gap-3 ${isBillingLocked ? 'opacity-80' : ''}`}
                    >
                      <Checkbox
                        checked={termsAgreed}
                        onChange={(checked) => {
                          if (!isBillingLocked) setTermsAgreed(checked);
                        }}
                        disabled={isBillingLocked}
                      />
                      <span
                        className="text-sm"
                        onClick={() => {
                          if (!isBillingLocked) setTermsAgreed(!termsAgreed);
                        }}
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
                    </div>

                    {error && (
                      <div className="mt-4 flex items-center gap-2 p-3 rounded-site bg-error/10 border border-error/30 text-error text-sm">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-stroke space-y-3">
                    <h3 className="text-base font-semibold">
                      {t('paymentOptions')}
                    </h3>

                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      className="w-full"
                      onClick={() => void handlePayClick('full')}
                      disabled={submitting}
                    >
                      {submitting && paymentOption === 'full' ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 size={18} className="animate-spin" />
                          {t('processing')}
                        </span>
                      ) : hasSinglePaymentOption ? (
                        singlePaymentPrimaryLabel
                      ) : (
                        t('payFull')
                      )}
                    </Button>

                    {hasHalfPaymentOption && (
                      <Button
                        type="button"
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={() => void handlePayClick('half')}
                        disabled={submitting}
                      >
                        {submitting && paymentOption === 'half' ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 size={18} className="animate-spin" />
                            {t('processing')}
                          </span>
                        ) : (
                          t('payHalf')
                        )}
                      </Button>
                    )}

                    {hasCustomPaymentOption && (
                      <div className="space-y-3">
                        {!isCustomPaymentMode ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="lg"
                            className="w-full"
                            onClick={() => {
                              if (quantity > 1) {
                                setShowCustomPaymentQuantityModal(true);
                                return;
                              }
                              setPaymentOption('custom');
                              setIsCustomPaymentMode(true);
                              setError('');
                            }}
                            disabled={submitting}
                          >
                            <span className="font-medium">
                              {t('payCustom')}
                            </span>
                          </Button>
                        ) : quantity === 1 ? (
                          <div className="space-y-3 rounded-site border border-stroke bg-background/40 p-3">
                            <label className="block text-sm font-medium text-foreground">
                              {t('customAmountQuestion')}
                            </label>
                            <Input
                              type="number"
                              value={customAmount || ''}
                              onChange={(e) =>
                                setCustomAmount(parseFloat(e.target.value) || 0)
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

                            <p className="text-center text-xs text-secondary">
                              {t('customPaymentNote')}
                            </p>

                            {customAmount >= getMinPayment() &&
                              customAmount <= totalAfterDiscount && (
                                <Button
                                  type="button"
                                  variant="primary"
                                  size="lg"
                                  className="w-full"
                                  onClick={async () => {
                                    if (
                                      validateStep1('custom') &&
                                      validateStep2()
                                    ) {
                                      setError('');
                                      await proceedAfterBilling(product);
                                    }
                                  }}
                                  disabled={submitting}
                                >
                                  {t('payCustomWithAmount', {
                                    amount: customAmount.toLocaleString(),
                                    currency: priceInfo?.currency || '',
                                  })}
                                </Button>
                              )}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: Reservation */}
              {step === 2 && (
                <div className="space-y-6">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 text-sm text-secondary hover:text-foreground transition-colors"
                  >
                    {isRTL ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
                    {t('backToStep2')}
                  </button>

                  <div className="bg-card-bg border border-stroke rounded-site p-6">
                    <h2 className="text-lg font-semibold mb-6">
                      {t('step3Title')}
                    </h2>

                    <form
                      onSubmit={handleSubmit}
                      className="flex flex-col gap-4"
                    >
                      {checkoutReservationFields.length > 0 && (
                        <div className="space-y-4">
                          {requiredReservationFieldEntries.length > 0 && (
                            <div className="space-y-4">
                              {requiredReservationFieldEntries.map(
                                ({ field, idx }) => {
                                  const label = isRTL
                                    ? field.label.ar
                                    : field.label.en;

                                  return (
                                    <div key={idx} className="space-y-1">
                                      <label className="block text-sm font-medium mb-1.5">
                                        {label}
                                        <span className="text-error ml-1">
                                          *
                                        </span>
                                      </label>

                                      {renderReservationInput(
                                        field,
                                        idx,
                                        label,
                                      )}

                                      {(field.type === 'text' ||
                                        field.type === 'textarea') &&
                                        field.maxLength && (
                                          <p className="text-xs text-secondary mt-1">
                                            {t('reservationMaxChars', {
                                              max: field.maxLength,
                                            })}
                                          </p>
                                        )}
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          )}

                          {optionalReservationFieldEntries.length > 0 && (
                            <div className="pt-2 border-t border-stroke/70 space-y-3">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full md:w-auto mx-auto"
                                onClick={() =>
                                  setShowOptionalReservationFields(
                                    (prev) => !prev,
                                  )
                                }
                              >
                                {showOptionalReservationFields ? (
                                  <span>
                                    {t('hideMoreOptions')}{' '}
                                    <LuChevronDown className="inline-block mx-2 rotate-180" />
                                  </span>
                                ) : (
                                  <span>
                                    {t('showMoreOptions')}{' '}
                                    <LuChevronDown className="inline-block mx-2" />
                                  </span>
                                )}
                              </Button>

                              {showOptionalReservationFields && (
                                <div className="space-y-4">
                                  <p className="text-sm font-medium text-secondary">
                                    {t('optionalReservationTitle')}
                                  </p>

                                  {optionalReservationFieldEntries.map(
                                    ({ field, idx }) => {
                                      const label = isRTL
                                        ? field.label.ar
                                        : field.label.en;
                                      const optionalClass = isRTL
                                        ? 'mr-2'
                                        : 'ml-2';

                                      return (
                                        <div key={idx} className="space-y-1">
                                          <label className="block text-sm font-medium mb-1.5">
                                            {label}
                                            <span
                                              className={`text-secondary text-xs ${optionalClass}`}
                                            >
                                              ({t('optional')})
                                            </span>
                                          </label>

                                          {renderReservationInput(
                                            field,
                                            idx,
                                            label,
                                          )}

                                          {(field.type === 'text' ||
                                            field.type === 'textarea') &&
                                            field.maxLength && (
                                              <p className="text-xs text-secondary mt-1">
                                                {t('reservationMaxChars', {
                                                  max: field.maxLength,
                                                })}
                                              </p>
                                            )}
                                        </div>
                                      );
                                    },
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {checkoutReservationFields.length === 0 && (
                        <p className="text-sm text-secondary">
                          {t('reservationNoFields')}
                        </p>
                      )}

                      {error && (
                        <div className="flex items-center gap-2 p-3 rounded-site bg-error/10 border border-error/30 text-error text-sm">
                          <AlertCircle size={16} className="shrink-0" />
                          <span>{error}</span>
                        </div>
                      )}

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
                      <span className="text-secondary text-xs text-center">
                        {t('payNowNote')}
                      </span>
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
      <CheckoutUpgradeModal info={upgradeInfo} onClose={hideUpgradeModal} />
      <Modal
        isOpen={showCustomPaymentQuantityModal}
        onClose={() => setShowCustomPaymentQuantityModal(false)}
        title={t('customPaymentSingleQuantityTitle')}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary leading-relaxed">
            {t('customPaymentSingleQuantityMessage')}
          </p>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => {
              setResolvedQuantity(1);
              setPaymentOption('custom');
              setIsCustomPaymentMode(true);
              setShowCustomPaymentQuantityModal(false);
              setError('');
            }}
          >
            {t('customPaymentSingleQuantitySetOne')}
          </Button>
          <Button
            type="button"
            variant="primary"
            className="w-full"
            onClick={() => setShowCustomPaymentQuantityModal(false)}
          >
            {t('customPaymentSingleQuantityKeepCurrent')}
          </Button>
        </div>
      </Modal>
      <Modal
        isOpen={showAqeeqahGuidanceModal}
        onClose={() => setShowAqeeqahGuidanceModal(false)}
        title={t('aqeeqahGuidance.title')}
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-foreground/90">
            {t('aqeeqahGuidance.hadithIntro')}
          </p>
          <blockquote className="text-sm leading-relaxed text-foreground border-s-2 border-success/40 ps-3">
            {t('aqeeqahGuidance.hadithText')}
          </blockquote>
          <ul className="list-disc ps-5 space-y-1 text-sm text-foreground/90">
            <li>{t('aqeeqahGuidance.boyRule')}</li>
            <li>{t('aqeeqahGuidance.girlRule')}</li>
          </ul>
          <p className="text-sm text-foreground/90">
            {t('aqeeqahGuidance.calculatePrefix')}{' '}
            <Link
              href="/calc-aqeqa"
              className="text-success font-semibold hover:underline"
            >
              {t('aqeeqahGuidance.calculateLink')}
            </Link>
          </p>
          <Button
            type="button"
            variant="primary"
            className="w-full"
            onClick={() => {
              setAqeeqahGuidanceAcknowledgedValue(selectedIntentionValue);
              setShowAqeeqahGuidanceModal(false);
            }}
          >
            {t('aqeeqahGuidance.understood')}
          </Button>
        </div>
      </Modal>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Header />
      <OutstandingBalanceWarning />
      <CheckoutContent />
    </Suspense>
  );
}
