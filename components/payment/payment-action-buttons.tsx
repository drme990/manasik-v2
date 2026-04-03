import Image from 'next/image';
import Button from '@/components/ui/button';
import { DisplayStatus } from '@/types/payment';

interface PaymentActionButtonsProps {
  status: DisplayStatus;
  whatsappHref: string | undefined;
  referralName: string | undefined;
  canRetryPayment: boolean;
  onRetryPayment: () => void;
  retryErrorMessage?: string;
  t: (key: string, values?: Record<string, string | number>) => string;
}

export default function PaymentActionButtons({
  status,
  whatsappHref,
  referralName,
  canRetryPayment,
  onRetryPayment,
  retryErrorMessage,
  t,
}: PaymentActionButtonsProps) {
  return (
    <div className="flex flex-col gap-3">
      {(status === 'success' || status === 'failed') && whatsappHref ? (
        <div className="space-y-1.5">
          <Button
            variant="primary"
            href={whatsappHref}
            target="_blank"
            className="bg-[#25D366]! hover:bg-[#1da851]! flex items-center justify-center gap-2"
          >
            <Image
              src="/icons/whatsapp.svg"
              alt="WhatsApp"
              width={20}
              height={20}
            />

            {status === 'failed'
              ? t('contactSupportWhatsApp')
              : referralName
                ? t('contactReferral', { name: referralName })
                : t('contactWhatsApp')}
          </Button>
          {status !== 'failed' ? (
            <p className="text-xs text-secondary text-center">
              {t('screenshotNote')}
            </p>
          ) : null}
        </div>
      ) : null}

      {canRetryPayment ? (
        <Button variant="secondary" onClick={onRetryPayment}>
          {t('retryPayment')}
        </Button>
      ) : (
        <Button variant="primary" href="/">
          {t('backHome')}
        </Button>
      )}

      {retryErrorMessage ? (
        <p className="text-xs text-error text-center">{retryErrorMessage}</p>
      ) : null}

      <Button variant="secondary" href="/products">
        {t('browseProducts')}
      </Button>
    </div>
  );
}
