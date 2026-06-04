'use client';

import { useTranslations } from 'next-intl';
import Button from '@/components/ui/button';
import Modal from '@/components/ui/modal';

type CheckoutCustomPaymentQuantityModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onKeepCurrent: () => void;
  onSetOne: () => void;
};

export default function CheckoutCustomPaymentQuantityModal({
  isOpen,
  onClose,
  onKeepCurrent,
  onSetOne,
}: CheckoutCustomPaymentQuantityModalProps) {
  const t = useTranslations('checkout');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('customPaymentSingleQuantityTitle')}
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-sm text-success leading-relaxed">
          {t('customPaymentSingleQuantityMessage')}
        </p>
        <Button
          type="button"
          variant="primary"
          className="w-full"
          onClick={onKeepCurrent}
          data-ref-track-action="checkout_choice"
          data-ref-track-choice="custom_quantity_keep"
          data-ref-track-button-label={t(
            'customPaymentSingleQuantityKeepCurrent',
          )}
        >
          {t('customPaymentSingleQuantityKeepCurrent')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={onSetOne}
          data-ref-track-action="checkout_choice"
          data-ref-track-choice="custom_quantity_set_one"
          data-ref-track-button-label={t('customPaymentSingleQuantitySetOne')}
        >
          {t('customPaymentSingleQuantitySetOne')}
        </Button>
      </div>
    </Modal>
  );
}
