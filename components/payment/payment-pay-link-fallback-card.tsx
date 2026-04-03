import PaymentMethodDetails from './payment-method-details';

interface PaymentPayLinkFallbackCardProps {
  t: (key: string) => string;
  isCustomPayLinkPayment: boolean;
  gatewayAmount: string | null;
  gatewayCurrency: string | null;
  providerRefNum: string | null;
  customerReference: string | null;
  receiptDateTime: string;
  hijriDateString: string;
}

export default function PaymentPayLinkFallbackCard({
  t,
  isCustomPayLinkPayment,
  gatewayAmount,
  gatewayCurrency,
  providerRefNum,
  customerReference,
  receiptDateTime,
  hijriDateString,
}: PaymentPayLinkFallbackCardProps) {
  return (
    <div className="bg-card-bg border border-stroke rounded-site p-5 space-y-3">
      <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide">
        {t('paymentMethod')}
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-secondary">Miladi</span>
          <span className="font-medium">{receiptDateTime}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-secondary">Hijri</span>
          <span className="font-medium">{hijriDateString}</span>
        </div>
        <div className="border-t border-stroke/50 pt-2 mt-2">
          <PaymentMethodDetails
            t={t}
            isCustomPayLinkPayment={isCustomPayLinkPayment}
            gatewayAmount={gatewayAmount}
            gatewayCurrency={gatewayCurrency}
            providerRefNum={providerRefNum}
            customerReference={customerReference}
          />
        </div>
      </div>
    </div>
  );
}
