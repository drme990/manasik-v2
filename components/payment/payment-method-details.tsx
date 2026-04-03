interface PaymentMethodDetailsProps {
  t: (key: string) => string;
  isCustomPayLinkPayment: boolean;
  gatewayAmount: string | null;
  gatewayCurrency: string | null;
  providerRefNum: string | null;
  customerReference: string | null;
}

export default function PaymentMethodDetails({
  t,
  isCustomPayLinkPayment,
  gatewayAmount,
  gatewayCurrency,
  providerRefNum,
  customerReference,
}: PaymentMethodDetailsProps) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between gap-4">
        <span className="text-secondary">{t('paymentMethod')}</span>
        <span className="font-medium">{t('paymentMethodPayLink')}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-secondary">{t('paymentType')}</span>
        <span className="font-medium">
          {isCustomPayLinkPayment
            ? t('paymentTypeCustomPayLink')
            : t('paymentTypeOrderPayLink')}
        </span>
      </div>
      {gatewayAmount && gatewayCurrency ? (
        <div className="flex justify-between gap-4">
          <span className="text-secondary">{t('paidNow')}</span>
          <span className="font-medium ltr">
            {gatewayAmount} {gatewayCurrency}
          </span>
        </div>
      ) : null}
      {providerRefNum ? (
        <div className="flex justify-between gap-4">
          <span className="text-secondary">{t('providerReference')}</span>
          <span className="font-medium font-mono text-xs ltr">
            {providerRefNum}
          </span>
        </div>
      ) : null}
      {customerReference ? (
        <div className="flex justify-between gap-4">
          <span className="text-secondary">{t('transactionReference')}</span>
          <span className="font-medium font-mono text-xs ltr">
            {customerReference}
          </span>
        </div>
      ) : null}
    </div>
  );
}
