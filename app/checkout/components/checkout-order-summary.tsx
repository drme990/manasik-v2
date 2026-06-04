'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, Plus, Tag, X } from 'lucide-react';
import { LuChevronDown } from 'react-icons/lu';
import { Product } from '@/types/Product';
import Input from '@/components/ui/input';

type PriceInfo = { amount: number; currency: string } | null;

type AppliedCoupon = {
  code: string;
  discountAmount: number;
  type: string;
  value: number;
} | null;

type AcceptedUpgrade = {
  fromProductId: string;
  discount: number;
} | null;

type CheckoutOrderSummaryProps = {
  product: Product;
  productName: string;
  productImage: string;
  selectedSizeName: string | null;
  priceInfo: PriceInfo;
  quantity: number;
  subtotal: number;
  acceptedUpgrade: AcceptedUpgrade;
  upgradeDiscountAmount: number;
  appliedCoupon: AppliedCoupon;
  couponDiscountAmount: number;
  acceptedRecommendProduct: Product | null;
  recommendAddonAmount: number;
  paymentOption: 'full' | 'half' | 'custom';
  payAmount: number;
  isCouponSectionOpen: boolean;
  couponCode: string;
  couponLoading: boolean;
  couponError: string;
  onToggleCouponSection: () => void;
  onCouponCodeChange: (value: string) => void;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
};

export default function CheckoutOrderSummary({
  product,
  productName,
  productImage,
  selectedSizeName,
  priceInfo,
  quantity,
  subtotal,
  acceptedUpgrade,
  upgradeDiscountAmount,
  appliedCoupon,
  couponDiscountAmount,
  acceptedRecommendProduct,
  recommendAddonAmount,
  paymentOption,
  payAmount,
  isCouponSectionOpen,
  couponCode,
  couponLoading,
  couponError,
  onToggleCouponSection,
  onCouponCodeChange,
  onApplyCoupon,
  onRemoveCoupon,
}: CheckoutOrderSummaryProps) {
  const t = useTranslations('checkout');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  return (
    <div className="lg:col-span-2">
      <div className="bg-card-bg border border-stroke rounded-site p-6 lg:sticky lg:top-28">
        <h2 className="text-lg font-semibold mb-6">{t('orderSummary')}</h2>

        <div className="flex gap-4 pb-4 border-b border-stroke">
          <div className="relative w-20 h-20 rounded-site overflow-hidden shrink-0 bg-card-bg border border-stroke">
            <Image
              src={productImage}
              alt={productName}
              fill
              className="object-cover"
            />
          </div>
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

        <div className="flex items-center justify-between py-4 border-b border-stroke">
          <span className="text-sm font-medium">{t('quantity')}</span>
          <span className="text-sm font-semibold">{quantity}</span>
        </div>

        <div className="py-4 space-y-2 border-b border-stroke">
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary">{t('subtotal')}</span>
            <span>
              {subtotal.toLocaleString()} {priceInfo?.currency}
            </span>
          </div>
          {acceptedUpgrade && acceptedUpgrade.discount > 0 && (
            <div className="flex items-center justify-between text-sm text-warning">
              <span className="flex items-center gap-1">
                <Tag size={14} />
                {t('upgradeDiscount')} ({acceptedUpgrade.discount}%)
              </span>
              <span>
                -{upgradeDiscountAmount.toLocaleString()} {priceInfo?.currency}
              </span>
            </div>
          )}
          {appliedCoupon && (
            <div className="flex items-center justify-between text-sm text-success">
              <span className="flex items-center gap-1">
                <Tag size={14} />
                {t('couponDiscount')} ({appliedCoupon.code})
              </span>
              <span>
                -{couponDiscountAmount.toLocaleString()} {priceInfo?.currency}
              </span>
            </div>
          )}
          {acceptedRecommendProduct && (
            <div className="flex items-center justify-between text-sm text-primary">
              <span className="flex items-center gap-1">
                <Plus size={14} />
                {isRTL
                  ? acceptedRecommendProduct.name.ar
                  : acceptedRecommendProduct.name.en}
              </span>
              <span>
                +{recommendAddonAmount.toLocaleString()} {priceInfo?.currency}
              </span>
            </div>
          )}
        </div>

        <div className="pt-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{t('total')}</span>
            {priceInfo && (
              <span className="text-xl font-bold text-success">
                {(
                  subtotal -
                  upgradeDiscountAmount -
                  couponDiscountAmount +
                  recommendAddonAmount
                ).toLocaleString()}{' '}
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

        <div className="pt-4 mt-4 border-t border-stroke">
          <button
            type="button"
            onClick={onToggleCouponSection}
            className="w-full flex items-center justify-between gap-3 text-sm font-semibold"
          >
            <span>{t('couponQuestion')}</span>
            <LuChevronDown
              className={`shrink-0 transition-transform ${
                isCouponSectionOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isCouponSectionOpen && (
            <div className="mt-3 space-y-3">
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
                    onClick={onRemoveCoupon}
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
                      onCouponCodeChange(e.target.value.toUpperCase());
                    }}
                    placeholder={t('couponPlaceholder')}
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={onApplyCoupon}
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
          )}
        </div>
      </div>
    </div>
  );
}
