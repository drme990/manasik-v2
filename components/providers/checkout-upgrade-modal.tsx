'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import BottomSheet from '@/components/ui/bottom-sheet';
import Button from '@/components/ui/button';
import { ArrowUpCircle, Check, Users } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

interface UpgradeInfo {
  currentName: { ar: string; en: string };
  currentPrice: number;
  currentCurrency: string;
  currentFeedsUp: number;
  currentFeatures?: string[];
  currentImage?: string;
  upgradeName: { ar: string; en: string };
  upgradeImage?: string;
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

  const upgradeFeatures = (info?.upgradeFeatures ?? []).filter(Boolean);

  useEffect(() => {
    handledExpireRef.current = false;
    if (!info?.discountDeadlineMs || info.upgradeDiscount <= 0) return;

    const interval = window.setInterval(() => {
      setRemainingMs(Math.max(0, info.discountDeadlineMs! - Date.now()));
    }, 1000);

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
  const roundedDiscountedPrice = Math.round(discountedPrice);
  const roundedCurrentPrice = Math.round(info.currentPrice);
  const amountToAdd = Math.max(0, roundedDiscountedPrice - roundedCurrentPrice);
  const timerParts = getTimerParts(remainingMs);

  const handleAccept = () => {
    info.onAccept();
    onClose();
  };

  const handleDecline = () => {
    info.onDecline();
    onClose();
  };

  // a plain function (not a component): the timer redraws every second and the pictures must not reload
  const card = ({
    tone,
    image,
    label,
    name,
    feeds,
    price,
    oldPrice,
    badge,
  }: {
    tone: 'mine' | 'up';
    image?: string;
    label: string;
    name: string;
    feeds: number;
    price: string;
    oldPrice?: string;
    badge?: string;
  }) => (
    <div
      className={`relative flex min-w-0 flex-col overflow-hidden rounded-[22px] p-2.5 ${tone === 'up' ? 'bg-success/[0.07] ring-2 ring-success shadow-[0_8px_30px_-12px] shadow-success/50' : 'bg-foreground/[0.04] ring-1 ring-foreground/10'}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-foreground/5">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" loading="eager" className="h-full w-full object-cover" />
        ) : null}
        {badge ? (
          <span className="absolute top-2 start-2 rounded-full bg-success px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">{badge}</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 px-1 pb-1 pt-2.5">
        <p className={`text-xs font-semibold ${tone === 'up' ? 'text-success' : 'text-secondary'}`}>{label}</p>
        <p className="text-[15px] font-bold leading-snug text-foreground">{name}</p>
        {feeds > 0 ? (
          <p className="flex items-center gap-1.5 text-xs text-secondary">
            <Users size={13} className="shrink-0" />
            <span>{t('feedsUp', { count: feeds })}</span>
          </p>
        ) : null}
        <div className="mt-auto pt-1.5">
          {oldPrice ? <p className="text-xs text-secondary line-through">{oldPrice}</p> : null}
          <p className={`text-lg font-extrabold tabular-nums ${tone === 'up' ? 'text-success' : 'text-foreground'}`}>{price}</p>
        </div>
      </div>
    </div>
  );

  const currentName = isAr ? info.currentName.ar : info.currentName.en;
  const upgradeName = isAr ? info.upgradeName.ar : info.upgradeName.en;

  return (
    <BottomSheet
      open={!!info}
      onClose={handleDecline}
      title={t('title')}
      footer={
        <div className="flex flex-col gap-1.5">
          <Button variant="primary" onClick={handleAccept} className="h-13 w-full rounded-2xl text-base font-bold">
            {t('accept')}
          </Button>
          <button type="button" onClick={handleDecline} className="h-11 w-full rounded-2xl text-sm font-bold text-success transition-colors hover:bg-success/10">
            {t('decline')}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {info.discountDeadlineMs && info.upgradeDiscount > 0 && remainingMs > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-success/10 px-4 py-3 ring-1 ring-success/20">
            <p className="text-sm font-semibold text-foreground">{t('offerEndsIn')}</p>
            <div className="flex items-center gap-1.5 font-extrabold tabular-nums text-success" dir="ltr">
              <span className="rounded-lg bg-background px-2 py-1 text-xl shadow-sm">{timerParts.minutes}</span>
              <span className="text-lg">:</span>
              <span className="rounded-lg bg-background px-2 py-1 text-xl shadow-sm">{timerParts.seconds}</span>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3 rounded-2xl bg-foreground/[0.04] p-3.5 ring-1 ring-foreground/10">
          <ArrowUpCircle className="mt-0.5 shrink-0 text-success" size={20} />
          <p className="text-sm leading-relaxed text-foreground">
            {t.rich('description', {
              amount: amountToAdd.toLocaleString('en-US'),
              currency: info.upgradeCurrency,
              name: upgradeName,
              strong: (chunks) => <strong className="text-success">{chunks}</strong>,
            })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {card({
            tone: 'mine',
            image: info.currentImage,
            label: t('currentProduct'),
            name: currentName,
            feeds: info.currentFeedsUp,
            price: `${info.currentPrice.toLocaleString('en-US')} ${info.currentCurrency}`,
          })}
          {card({
            tone: 'up',
            image: info.upgradeImage,
            label: t('upgradeProduct'),
            name: upgradeName,
            feeds: info.upgradeFeedsUp,
            badge: t('recommended'),
            oldPrice: info.upgradeDiscount > 0 ? `${info.upgradePrice.toLocaleString('en-US')} ${info.upgradeCurrency}` : undefined,
            price: `${(info.upgradeDiscount > 0 ? roundedDiscountedPrice : info.upgradePrice).toLocaleString('en-US')} ${info.upgradeCurrency}`,
          })}
        </div>

        {info.upgradeDiscount > 0 ? (
          <p className="text-center text-xs font-semibold text-success">{t('discount', { percent: info.upgradeDiscount })}</p>
        ) : null}

        {upgradeFeatures.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-bold text-foreground">{t('features')}</p>
            <ul className="space-y-2">
              {upgradeFeatures.map((feature) => (
                <li key={`upgrade-${feature}`} className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-white">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
