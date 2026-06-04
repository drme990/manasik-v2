'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { AlertCircle, Loader2 } from 'lucide-react';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Checkbox from '@/components/ui/checkbox';
import CountrySelector from '@/components/shared/country-selector';
import PhoneInput from '@/components/shared/phone-input';

type PaymentOption = 'full' | 'half' | 'custom';

type CheckoutBillingStepProps = {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  accountPassword: string;
  termsAgreed: boolean;
  isBillingLocked: boolean;
  isAuthenticatedCheckout: boolean;
  showForgotPasswordHint: boolean;
  formErrors: Record<string, string>;
  error: string;
  submitting: boolean;
  paymentOption: PaymentOption;
  isCustomPaymentMode: boolean;
  quantity: number;
  customAmount: number;
  totalAfterDiscount: number;
  priceCurrency: string | undefined;
  minPayment: number;
  hasHalfPaymentOption: boolean;
  hasCustomPaymentOption: boolean;
  hasSinglePaymentOption: boolean;
  singlePaymentPrimaryLabel: string;
  onFullNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onAccountPasswordChange: (value: string) => void;
  onTermsAgreedChange: (value: boolean) => void;
  onPayClick: (option: 'full' | 'half') => void;
  onOpenCustomQuantityModal: () => void;
  onEnableCustomPayment: () => void;
  onCustomAmountChange: (value: number) => void;
  onProceedCustomPayment: () => void;
};

export default function CheckoutBillingStep({
  fullName,
  email,
  phone,
  country,
  accountPassword,
  termsAgreed,
  isBillingLocked,
  isAuthenticatedCheckout,
  showForgotPasswordHint,
  formErrors,
  error,
  submitting,
  paymentOption,
  isCustomPaymentMode,
  quantity,
  customAmount,
  totalAfterDiscount,
  priceCurrency,
  minPayment,
  hasHalfPaymentOption,
  hasCustomPaymentOption,
  hasSinglePaymentOption,
  singlePaymentPrimaryLabel,
  onFullNameChange,
  onEmailChange,
  onPhoneChange,
  onCountryChange,
  onAccountPasswordChange,
  onTermsAgreedChange,
  onPayClick,
  onOpenCustomQuantityModal,
  onEnableCustomPayment,
  onCustomAmountChange,
  onProceedCustomPayment,
}: CheckoutBillingStepProps) {
  const t = useTranslations('checkout');
  const locale = useLocale();

  return (
    <div className="bg-card-bg border border-stroke rounded-site p-6 space-y-4">
      <h2 className="text-lg font-semibold">{t('billingInfo')}</h2>
      <p className="text-sm text-secondary">{t('billingInfoHint')}</p>

      <Input
        label={t('fullName')}
        value={fullName}
        onChange={(e) => {
          onFullNameChange(e.target.value);
        }}
        error={formErrors.fullName}
        placeholder={t('fullNamePlaceholder')}
        required
        disabled={isBillingLocked}
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
      />

      <Input
        label={t('email')}
        type="email"
        value={email}
        onChange={(e) => {
          onEmailChange(e.target.value);
        }}
        error={formErrors.email}
        placeholder={t('emailPlaceholder')}
        required
        disabled={isBillingLocked}
        dir="ltr"
      />

      <PhoneInput
        label={t('phoneWhatsApp')}
        value={phone}
        onChange={(value) => onPhoneChange(value)}
        error={formErrors.phone}
        placeholder={t('phonePlaceholder')}
        required
        disabled={isBillingLocked}
      />

      <CountrySelector
        value={country}
        onChange={(value) => onCountryChange(value)}
        error={formErrors.country}
        placeholder={t('countryPlaceholder')}
        disabled={isBillingLocked}
      />

      {isBillingLocked && (
        <p className="text-xs text-secondary">
          {locale === 'ar'
            ? 'تم تعبئة البيانات من حسابك. يمكنك تعديلها من '
            : 'Your information is pre-filled from your profile. You can edit it from '}
          <Link href="/user/settings" className="text-success hover:underline">
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
              onAccountPasswordChange(e.target.value);
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
              if (!isBillingLocked) onTermsAgreedChange(checked);
            }}
            disabled={isBillingLocked}
          />
          <span
            className="text-sm"
            onClick={() => {
              if (!isBillingLocked) onTermsAgreedChange(!termsAgreed);
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
        <h3 className="text-base font-semibold">{t('paymentOptions')}</h3>

        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => onPayClick('full')}
          disabled={submitting}
          data-ref-track-action="checkout_choice"
          data-ref-track-choice="full"
          data-ref-track-button-label={t('payFull')}
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
            onClick={() => onPayClick('half')}
            disabled={submitting}
            data-ref-track-action="checkout_choice"
            data-ref-track-choice="half"
            data-ref-track-button-label={t('payHalf')}
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
                    onOpenCustomQuantityModal();
                    return;
                  }
                  onEnableCustomPayment();
                }}
                disabled={submitting}
                data-ref-track-action="checkout_choice"
                data-ref-track-choice="custom"
                data-ref-track-button-label={t('payCustom')}
              >
                <span className="font-medium">{t('payCustom')}</span>
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
                    onCustomAmountChange(parseFloat(e.target.value) || 0)
                  }
                  min={minPayment}
                  max={totalAfterDiscount}
                  placeholder={t('customAmountPlaceholder', {
                    min: minPayment,
                  })}
                  helperText={t('minimumPayment', {
                    amount: minPayment,
                    currency: priceCurrency || '',
                  })}
                />

                <p className="text-center text-xs text-secondary">
                  {t('customPaymentNote')}
                </p>

                {customAmount >= minPayment &&
                  customAmount <= totalAfterDiscount && (
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      className="w-full"
                      onClick={onProceedCustomPayment}
                      disabled={submitting}
                      data-ref-track-action="checkout_choice"
                      data-ref-track-choice="custom_amount"
                      data-ref-track-button-label={t('payCustomWithAmount', {
                        amount: customAmount.toLocaleString(),
                        currency: priceCurrency || '',
                      })}
                    >
                      {t('payCustomWithAmount', {
                        amount: customAmount.toLocaleString(),
                        currency: priceCurrency || '',
                      })}
                    </Button>
                  )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
