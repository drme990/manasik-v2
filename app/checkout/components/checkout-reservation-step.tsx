'use client';

import { FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertCircle, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { LuChevronDown } from 'react-icons/lu';
import { Product } from '@/types/Product';
import Button from '@/components/ui/button';
import CheckoutReservationFieldInput from './checkout-reservation-field-input';

type CheckoutReservationStepProps = {
  product: Product;
  reservationData: Record<number, string>;
  blockedExecutionDates: string[];
  showOptionalReservationFields: boolean;
  error: string;
  submitting: boolean;
  payAmount: number;
  priceCurrency: string | undefined;
  onBack: () => void;
  onToggleOptionalFields: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onReservationValueChange: (idx: number, value: string) => void;
  onReservationFileChange: (idx: number, file: File | null) => void;
};

export default function CheckoutReservationStep({
  product,
  reservationData,
  blockedExecutionDates,
  showOptionalReservationFields,
  error,
  submitting,
  payAmount,
  priceCurrency,
  onBack,
  onToggleOptionalFields,
  onSubmit,
  onReservationValueChange,
  onReservationFileChange,
}: CheckoutReservationStepProps) {
  const t = useTranslations('checkout');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const checkoutReservationFields = product.reservationFields ?? [];
  const reservationFieldEntries = checkoutReservationFields.map(
    (field, idx) => ({
      field,
      idx,
    }),
  );
  const requiredReservationFieldEntries = reservationFieldEntries.filter(
    ({ field }) => field.required,
  );
  const optionalReservationFieldEntries = reservationFieldEntries.filter(
    ({ field }) => !field.required,
  );

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-secondary hover:text-foreground transition-colors"
      >
        {isRTL ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
        {t('backToStep2')}
      </button>

      <div className="bg-card-bg border border-stroke rounded-site p-6">
        <h2 className="text-lg font-semibold mb-6">{t('step3Title')}</h2>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {checkoutReservationFields.length > 0 && (
            <div className="space-y-4">
              {requiredReservationFieldEntries.length > 0 && (
                <div className="space-y-4">
                  {requiredReservationFieldEntries.map(({ field, idx }) => {
                    const label = isRTL ? field.label.ar : field.label.en;

                    return (
                      <div key={idx} className="space-y-1">
                        <label className="block text-sm font-medium mb-1.5">
                          {label}
                          <span className="text-error ml-1">*</span>
                        </label>

                        <CheckoutReservationFieldInput
                          field={field}
                          label={label}
                          value={reservationData[idx] || ''}
                          locale={locale}
                          blockedExecutionDates={blockedExecutionDates}
                          hideAqeeqahIntentionOptions={!product.workAsSacrifice}
                          onValueChange={(value) =>
                            onReservationValueChange(idx, value)
                          }
                          onFileChange={(file) =>
                            onReservationFileChange(idx, file)
                          }
                        />

                        {(field.type === 'text' || field.type === 'textarea') &&
                          field.maxLength && (
                            <p className="text-xs text-secondary mt-1">
                              {t('reservationMaxChars', {
                                max: field.maxLength,
                              })}
                            </p>
                          )}
                      </div>
                    );
                  })}
                </div>
              )}

              {optionalReservationFieldEntries.length > 0 && (
                <div className="pt-2 border-t border-stroke/70 space-y-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full md:w-auto mx-auto"
                    onClick={onToggleOptionalFields}
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

                      {optionalReservationFieldEntries.map(({ field, idx }) => {
                        const label = isRTL ? field.label.ar : field.label.en;
                        const optionalClass = isRTL ? 'mr-2' : 'ml-2';

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

                            <CheckoutReservationFieldInput
                              field={field}
                              label={label}
                              value={reservationData[idx] || ''}
                              locale={locale}
                              blockedExecutionDates={blockedExecutionDates}
                              hideAqeeqahIntentionOptions={
                                !product.workAsSacrifice
                              }
                              onValueChange={(value) =>
                                onReservationValueChange(idx, value)
                              }
                              onFileChange={(file) =>
                                onReservationFileChange(idx, file)
                              }
                            />

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
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {checkoutReservationFields.length === 0 && (
            <p className="text-sm text-secondary">{t('reservationNoFields')}</p>
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
            data-ref-track-action="proceed_to_payment"
            data-ref-track-button-label={t('payNow', {
              amount: payAmount.toLocaleString(),
              currency: priceCurrency || '',
            })}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                {t('processing')}
              </span>
            ) : (
              t('payNow', {
                amount: payAmount.toLocaleString(),
                currency: priceCurrency || '',
              })
            )}
          </Button>
          <span className="text-secondary text-xs text-center">
            {t('payNowNote')}
          </span>
        </form>
      </div>
    </div>
  );
}
