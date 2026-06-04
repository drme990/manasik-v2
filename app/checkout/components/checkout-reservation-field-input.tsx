'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Product } from '@/types/Product';
import Dropdown from '@/components/ui/dropdown';
import RadioButton from '@/components/ui/radio-button';
import Textarea from '@/components/ui/textarea';
import ImagePicker from '@/components/ui/image-picker';
import CustomDatePicker from '@/components/ui/custom-date-picker';
import MultiNameInput from '@/components/ui/multi-name-input';
import Input from '@/components/ui/input';
import { isExecutionDateKey } from '@/lib/reservation-fields';

type ReservationField = NonNullable<Product['reservationFields']>[number];
type ReservationOption = NonNullable<ReservationField['options']>[number];

type CheckoutReservationFieldInputProps = {
  field: ReservationField;
  label: string;
  value: string;
  locale: string;
  blockedExecutionDates?: string[];
  hideAqeeqahIntentionOptions?: boolean;
  onValueChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
};

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

function toIsoLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function CheckoutReservationFieldInput({
  field,
  label,
  value,
  locale,
  blockedExecutionDates,
  hideAqeeqahIntentionOptions = false,
  onValueChange,
  onFileChange,
}: CheckoutReservationFieldInputProps) {
  const t = useTranslations('checkout');
  const currentLocale = useLocale();
  const effectiveLocale = locale || currentLocale;
  const isRTL = effectiveLocale === 'ar';

  const getVisibleOptions = (options: ReservationOption[]) => {
    if (field.key !== 'intention' || !hideAqeeqahIntentionOptions) {
      return options;
    }

    return options.filter(
      (opt) => !isAqeeqahIntentionValue(`${opt.en} ${opt.ar}`),
    );
  };

  if (field.type === 'select') {
    const visibleOptions = getVisibleOptions(field.options ?? []);

    return (
      <Dropdown<string>
        value={value}
        onChange={onValueChange}
        options={visibleOptions.map((opt) => ({
          label: isRTL ? opt.ar : opt.en,
          value: isRTL ? opt.ar : opt.en,
        }))}
        placeholder="-"
      />
    );
  }

  if (field.type === 'radio') {
    const visibleOptions = getVisibleOptions(field.options ?? []);

    return (
      <div className="flex flex-wrap items-center gap-4">
        {visibleOptions.map((opt, oi) => {
          const optionValue = isRTL ? opt.ar : opt.en;
          const optionId = `reservation_${field.key}_${oi}`;

          return (
            <RadioButton
              key={optionId}
              id={optionId}
              name={`reservation_${field.key}`}
              value={optionValue}
              label={optionValue}
              checked={value === optionValue}
              onChange={onValueChange}
            />
          );
        })}
      </div>
    );
  }

  if (field.type === 'text' && field.supportsMulti) {
    return (
      <MultiNameInput
        value={value}
        onChange={onValueChange}
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
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        maxLength={field.maxLength}
        dir={isRTL ? 'rtl' : 'ltr'}
      />
    );
  }

  if (field.type === 'picture') {
    return (
      <ImagePicker
        label={label}
        value={value}
        onChange={onFileChange}
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
        value={value}
        onChange={onValueChange}
        placeholder={t('datePickerPlaceholder')}
        locale={effectiveLocale}
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
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      maxLength={field.type === 'text' ? field.maxLength : undefined}
      dir={isRTL ? 'rtl' : 'ltr'}
    />
  );
}
