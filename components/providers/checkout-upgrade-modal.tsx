'use client';

import React, { useState, useCallback } from 'react';
import Modal from '@/components/ui/modal';
import Button from '@/components/ui/button';
import { ArrowUpCircle, Users } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

interface UpgradeInfo {
  currentName: { ar: string; en: string };
  currentPrice: number;
  currentCurrency: string;
  currentFeedsUp: number;
  upgradeName: { ar: string; en: string };
  upgradePrice: number;
  upgradeCurrency: string;
  upgradeFeedsUp: number;
  upgradeDiscount: number;
  onAccept: () => void;
  onDecline: () => void;
}

export function useCheckoutUpgradeModal() {
  const [info, setInfo] = useState<UpgradeInfo | null>(null);

  const showUpgradeModal = useCallback((data: UpgradeInfo) => {
    setInfo(data);
  }, []);

  const hideUpgradeModal = useCallback(() => {
    setInfo(null);
  }, []);

  return { info, showUpgradeModal, hideUpgradeModal };
}

export function CheckoutUpgradeModal({
  info,
  onClose,
}: {
  info: UpgradeInfo | null;
  onClose: () => void;
}) {
  const t = useTranslations('checkout.upgrade');
  const locale = useLocale();
  const isAr = locale === 'ar';

  if (!info) return null;

  const discountedPrice =
    info.upgradeDiscount > 0
      ? info.upgradePrice * (1 - info.upgradeDiscount / 100)
      : info.upgradePrice;

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
        <div className="flex items-center gap-3 p-3 bg-success/10 rounded-site border border-success/20">
          <ArrowUpCircle className="text-success shrink-0" size={20} />
          <p className="text-sm text-foreground">{t('description')}</p>
        </div>

        {/* Comparison */}
        <div className="grid grid-cols-2 gap-3">
          {/* Current product */}
          <div className="border border-stroke rounded-site p-4 space-y-3 bg-background">
            <p className="text-xs font-medium text-secondary uppercase">
              {t('currentProduct')}
            </p>
            <p className="font-semibold text-foreground text-sm">
              {isAr ? info.currentName.ar : info.currentName.en}
            </p>
            <div className="space-y-1.5">
              <p className="text-lg font-bold text-foreground">
                {info.currentPrice.toLocaleString()} {info.currentCurrency}
              </p>
              {info.currentFeedsUp > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-secondary">
                  <Users size={14} />
                  <span>{t('feedsUp', { count: info.currentFeedsUp })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Upgrade product */}
          <div className="border-2 border-success rounded-site p-4 space-y-3 bg-success/5 relative">
            <div className="absolute -top-3 start-3 bg-success text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              {t('recommended')}
            </div>
            <p className="text-xs font-medium text-success uppercase">
              {t('upgradeProduct')}
            </p>
            <p className="font-semibold text-foreground text-sm">
              {isAr ? info.upgradeName.ar : info.upgradeName.en}
            </p>
            <div className="space-y-1.5">
              {info.upgradeDiscount > 0 ? (
                <div>
                  <p className="text-xs text-secondary line-through">
                    {info.upgradePrice.toLocaleString()} {info.upgradeCurrency}
                  </p>
                  <p className="text-lg font-bold text-success">
                    {Math.round(discountedPrice).toLocaleString()}{' '}
                    {info.upgradeCurrency}
                  </p>
                  <span className="inline-block text-[10px] font-semibold bg-success/20 text-success px-1.5 py-0.5 rounded-full">
                    {t('discount', { percent: info.upgradeDiscount })}
                  </span>
                </div>
              ) : (
                <p className="text-lg font-bold text-success">
                  {info.upgradePrice.toLocaleString()} {info.upgradeCurrency}
                </p>
              )}
              {info.upgradeFeedsUp > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-success">
                  <Users size={14} />
                  <span>{t('feedsUp', { count: info.upgradeFeedsUp })}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <Button variant="primary" onClick={handleAccept} className="w-full">
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
