'use client';

import { useState, useCallback } from 'react';
import BottomSheet from '@/components/ui/bottom-sheet';
import Button from '@/components/ui/button';
import { Sparkles, Users, Plus } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

interface RecommendInfo {
  productName: { ar: string; en: string };
  productPrice: number;
  productCurrency: string;
  productFeedsUp: number;
  productContent?: { ar: string; en: string };
  productImage?: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function useCheckoutRecommendModal() {
  const [info, setInfo] = useState<RecommendInfo | null>(null);

  const showRecommendModal = useCallback((data: RecommendInfo) => {
    setInfo(data);
  }, []);

  const hideRecommendModal = useCallback(() => {
    setInfo(null);
  }, []);

  return { info, showRecommendModal, hideRecommendModal };
}

export function CheckoutRecommendModal({
  info,
  onClose,
}: {
  info: RecommendInfo | null;
  onClose: () => void;
}) {
  const t = useTranslations('checkout.recommend');
  const locale = useLocale();
  const isAr = locale === 'ar';

  if (!info) return null;

  const handleAccept = () => {
    info.onAccept();
    onClose();
  };

  const handleDecline = () => {
    info.onDecline();
    onClose();
  };

  const name = isAr ? info.productName.ar : info.productName.en;

  return (
    <BottomSheet
      open={!!info}
      onClose={handleDecline}
      title={t('title')}
      footer={
        <div className="flex flex-col gap-1.5">
          <Button variant="primary" onClick={handleAccept} className="h-13 w-full gap-2 rounded-2xl text-base font-bold">
            <Plus size={18} />
            {t('accept')}
          </Button>
          <button type="button" onClick={handleDecline} className="h-11 w-full rounded-2xl text-sm font-bold text-success transition-colors hover:bg-success/10">
            {t('decline')}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[20px] bg-foreground/5 ring-1 ring-foreground/10 shadow-lg">
            {info.productImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={info.productImage} alt={name} loading="eager" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-bold text-warning">
              <Sparkles size={12} />
              {t('recommendedProduct')}
            </span>
            <p className="mt-1.5 text-lg font-bold leading-snug text-foreground">{name}</p>
            <p className="mt-1 text-sm leading-relaxed text-secondary">
              {t.rich('description', {
                name,
                highlight: (chunks) => <strong className="text-success">{chunks}</strong>,
              })}
            </p>
          </div>
        </div>

        {info.productFeedsUp > 0 && (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-success/10 px-4 py-2.5 text-sm font-semibold text-success">
            <Users size={16} />
            <span>{t('feedsUp', { count: info.productFeedsUp })}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-foreground/10 pt-4">
          <span className="text-sm text-secondary">{t('addsToTotal')}</span>
          <span className="text-2xl font-extrabold tabular-nums text-success" dir="ltr">
            +{info.productPrice.toLocaleString('en-US')} {info.productCurrency}
          </span>
        </div>
      </div>
    </BottomSheet>
  );
}
