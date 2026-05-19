'use client';

import { useState, useCallback } from 'react';
import Modal from '@/components/ui/modal';
import Button from '@/components/ui/button';
import { ShoppingBag, Users, Plus } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

interface RecommendInfo {
  productName: { ar: string; en: string };
  productPrice: number;
  productCurrency: string;
  productFeedsUp: number;
  productContent?: { ar: string; en: string };
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

  return (
    <Modal isOpen={!!info} onClose={handleDecline} title={t('title')} size="md">
      <div className="space-y-5">
        <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-site border border-primary/20">
          <ShoppingBag className="text-primary shrink-0" size={20} />
          <p className="text-sm text-foreground">
            {t.rich('description', {
              name: isAr ? info.productName.ar : info.productName.en,
              highlight: (chunks) => (
                <strong className="text-primary">{chunks}</strong>
              ),
            })}
          </p>
        </div>

        <div className="border-2 border-primary rounded-site p-4 space-y-3 bg-primary/5 relative">
          <div className="absolute -top-3 start-3 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            {t('recommendedProduct')}
          </div>
          <p className="font-semibold text-foreground text-sm pt-1">
            {isAr ? info.productName.ar : info.productName.en}
          </p>
          <div className="space-y-1.5">
            <p className="text-lg font-bold text-primary">
              {info.productPrice.toLocaleString()} {info.productCurrency}
            </p>
            {info.productFeedsUp > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-primary">
                <Users size={14} />
                <span>{t('feedsUp', { count: info.productFeedsUp })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <Button variant="primary" onClick={handleAccept} className="w-full">
            <Plus size={16} className={isAr ? 'ml-2' : 'mr-2'} />
            {t('accept')}
          </Button>
          <Button variant="outline" onClick={handleDecline} className="w-full">
            {t('decline')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
