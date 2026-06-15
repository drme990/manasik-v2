'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Button from '@/components/ui/button';
import Modal from '@/components/ui/modal';

type CheckoutAqeeqahGuidanceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUnderstood: () => void;
};

export default function CheckoutAqeeqahGuidanceModal({
  isOpen,
  onClose,
  onUnderstood,
}: CheckoutAqeeqahGuidanceModalProps) {
  const t = useTranslations('checkout');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('aqeeqahGuidance.title')}
      size="sm"
    >
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-foreground/90">
          {t('aqeeqahGuidance.hadithIntro')}
        </p>
        <blockquote className="text-sm leading-relaxed text-foreground border-s-2 border-success/40 ps-3">
          {t('aqeeqahGuidance.hadithText')}
        </blockquote>
        <ul className="list-disc ps-5 space-y-1 text-sm text-foreground/90">
          <li>{t('aqeeqahGuidance.boyRule')}</li>
          <li>{t('aqeeqahGuidance.girlRule')}</li>
        </ul>
        <p className="text-sm text-foreground/90">
          {t('aqeeqahGuidance.calculatePrefix')}{' '}
          <Link
            href="/calc-aqeqa"
            className="text-success font-semibold hover:underline"
          >
            {t('aqeeqahGuidance.calculateLink')}
          </Link>
        </p>
        <Button
          type="button"
          variant="primary"
          className="w-full"
          onClick={onUnderstood}
        >
          {t('aqeeqahGuidance.understood')}
        </Button>
      </div>
    </Modal>
  );
}
