'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Modal from '@/components/ui/modal';
import Button from '@/components/ui/button';
import { ArrowUpCircle, Users } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

interface UpgradeInfo {
  currentName: { ar: string; en: string };
  currentPrice: number;
  currentCurrency: string;
  currentFeedsUp: number;
  currentFeatures?: string[];
  upgradeName: { ar: string; en: string };
  upgradePrice: number;
  upgradeCurrency: string;
  upgradeFeedsUp: number;
  upgradeFeatures?: string[];
  upgradeDiscount: number;
  discountDeadlineMs?: number;
  onAccept: () => void;
  onDecline: () => void;
  onTimerExpire?: () => void;
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function getTimerParts(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return { minutes, seconds };
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
  const [remainingMs, setRemainingMs] = useState(0);
  const handledExpireRef = useRef(false);

  const currentFeatures = (info?.currentFeatures ?? []).filter(Boolean);
  const upgradeFeatures = (info?.upgradeFeatures ?? []).filter(Boolean);

  useEffect(() => {
    handledExpireRef.current = false;
    if (!info?.discountDeadlineMs || info.upgradeDiscount <= 0) {
      setRemainingMs(0);
      return;
    }

    const tick = () => {
      setRemainingMs(Math.max(0, info.discountDeadlineMs! - Date.now()));
    };

    tick();
    const interval = window.setInterval(tick, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [info]);

  useEffect(() => {
    if (!info || info.upgradeDiscount <= 0 || !info.discountDeadlineMs) return;

    const isExpired = info.discountDeadlineMs <= Date.now();
    if (!isExpired || handledExpireRef.current) return;

    handledExpireRef.current = true;
    info.onTimerExpire?.();
    onClose();
  }, [info, onClose]);

  if (!info) return null;

  const discountedPrice =
    info.upgradeDiscount > 0
      ? info.upgradePrice * (1 - info.upgradeDiscount / 100)
      : info.upgradePrice;
  const timerParts = getTimerParts(remainingMs);

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
        {info.discountDeadlineMs &&
          info.upgradeDiscount > 0 &&
          remainingMs > 0 && (
            <div className="rounded-site border border-success/20 bg-success/5 p-4">
              <p className="text-center text-sm font-semibold text-foreground">
                {t('offerEndsIn', { time: formatRemaining(remainingMs) })}
              </p>
              <div className="mt-3 flex items-center justify-center gap-3">
                <div className="min-w-24 rounded-2xl bg-white py-3 text-center shadow-sm">
                  <p className="text-4xl font-extrabold leading-none text-success">
                    {timerParts.minutes}
                  </p>
                  <p className="mt-1 text-xs font-medium text-secondary">
                    {t('minute')}
                  </p>
                </div>
                <div className="min-w-24 rounded-2xl bg-white py-3 text-center shadow-sm">
                  <p className="text-4xl font-extrabold leading-none text-success">
                    {timerParts.seconds}
                  </p>
                  <p className="mt-1 text-xs font-medium text-secondary">
                    {t('second')}
                  </p>
                </div>
              </div>
            </div>
          )}

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
              {currentFeatures.length > 0 && (
                <div className="pt-1">
                  <p className="text-[11px] font-semibold text-secondary uppercase tracking-wide">
                    {t('features')}
                  </p>
                  <ul className="mt-1 space-y-1 text-xs text-secondary list-disc ps-4">
                    {currentFeatures.map((feature) => (
                      <li key={`current-${feature}`}>{feature}</li>
                    ))}
                  </ul>
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
              {upgradeFeatures.length > 0 && (
                <div className="pt-1">
                  <p className="text-[11px] font-semibold text-success uppercase tracking-wide">
                    {t('features')}
                  </p>
                  <ul className="mt-1 space-y-1 text-xs text-success list-disc ps-4">
                    {upgradeFeatures.map((feature) => (
                      <li key={`upgrade-${feature}`}>{feature}</li>
                    ))}
                  </ul>
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
