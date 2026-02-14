'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Product } from '@/types/Product';
import { usePriceInCurrency } from '@/hooks/currency-hook';
import { useTranslations, useLocale } from 'next-intl';
import Button from '@/components/ui/button';
import { Check, Minus, Plus } from 'lucide-react';

export default function ProductDetailsClient({
  product,
}: {
  product: Product;
}) {
  const [quantity, setQuantity] = useState(1);
  const locale = useLocale();
  const t = useTranslations('productDetails');
  const tCommon = useTranslations('common');
  const getPrice = usePriceInCurrency();
  const isAr = locale === 'ar';

  const { amount, currency } = getPrice(
    product.prices,
    product.price,
    product.currency,
  );

  const features = isAr
    ? (product.features?.ar ?? [])
    : (product.features?.en ?? []);

  const sections = product.sections ?? [];

  // Optional detail fields
  const detailFields = [
    {
      label: t('verify'),
      value: isAr ? product.verify?.ar : product.verify?.en,
    },
    {
      label: t('receiving'),
      value: isAr ? product.receiving?.ar : product.receiving?.en,
    },
    {
      label: t('implementationMechanism'),
      value: isAr
        ? product.implementationMechanism?.ar
        : product.implementationMechanism?.en,
    },
    {
      label: t('implementationPeriod'),
      value: isAr
        ? product.implementationPeriod?.ar
        : product.implementationPeriod?.en,
    },
    {
      label: t('implementationPlaces'),
      value: isAr
        ? product.implementationPlaces?.ar
        : product.implementationPlaces?.en,
    },
  ].filter((f) => f.value?.trim());

  const renderSectionContent = (content: string, type: 'text' | 'list') => {
    if (type === 'list') {
      const items = content
        .split('\n')
        .map((s) => s.replace(/^[-·•]\s*/, '').trim())
        .filter(Boolean);
      return (
        <ul className="flex flex-col gap-2">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-secondary"
            >
              <span className="text-secondary mt-0.5 shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    }
    return (
      <p className="text-secondary leading-relaxed text-sm whitespace-pre-line">
        {content}
      </p>
    );
  };

  return (
    <div
      className="flex flex-col gap-8 pb-20 max-w-2xl mx-auto"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Product Image */}
      {product.image ? (
        <div className="relative w-full aspect-4/3 rounded-site overflow-hidden border border-stroke">
          <Image
            src={product.image}
            alt={isAr ? product.name.ar : product.name.en}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            unoptimized
          />
        </div>
      ) : (
        <div className="w-full aspect-4/3 rounded-site bg-card-bg border border-stroke flex items-center justify-center">
          <span className="text-secondary">{tCommon('status.noImage')}</span>
        </div>
      )}

      {/* Price & Name */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold leading-tight">
          {isAr ? product.name.ar : product.name.en}
        </h1>
        <span className="text-success font-bold text-xl md:text-2xl whitespace-nowrap">
          {amount.toLocaleString()} {currency}
        </span>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-2">
        <h2 className="text-base font-bold">{t('description')}</h2>
        <p className="text-secondary leading-relaxed text-sm">
          {isAr ? product.description.ar : product.description.en}
        </p>
      </div>

      {/* Custom Sections */}
      {sections.map((section, index) => {
        const title = isAr ? section.title.ar : section.title.en;
        const content = isAr ? section.content.ar : section.content.en;
        if (!title && !content) return null;

        return (
          <div key={index} className="flex flex-col gap-2">
            {title && <h2 className="text-base font-bold">{title}</h2>}
            {content && renderSectionContent(content, section.type)}
          </div>
        );
      })}

      {/* Features */}
      {features.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-bold">{t('features')}</h2>
          <ul className="flex flex-col gap-2">
            {features.map((feature, index) => (
              <li
                key={index}
                className="flex items-center gap-2 text-sm text-secondary"
              >
                <Check size={18} className="text-success shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Optional Detail Fields */}
      {detailFields.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-stroke pt-4">
          {detailFields.map((field, index) => (
            <div key={index} className="flex flex-col gap-1">
              <h3 className="text-sm font-bold">{field.label}</h3>
              <p className="text-secondary text-sm">{field.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quantity */}
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-bold">{t('quantity')}</h2>
        <div className="flex items-center justify-center gap-4">
          <Button
            type="button"
            size="custom"
            className="p-2"
            onClick={() => setQuantity((q) => q + 1)}
          >
            <Plus size={18} />
          </Button>
          <span className="bg-black dark:bg-white text-success rounded-site min-w-36 py-1 text-lg font-bold text-center tabular-nums">
            {quantity}
          </span>
          <Button
            type="button"
            size="custom"
            className="p-2"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
          >
            <Minus size={18} />
          </Button>
        </div>
      </div>

      {/* CTA */}
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        href={`/checkout?product=${product._id}&qty=${quantity}`}
      >
        {t('payNow')}
      </Button>
    </div>
  );
}
