import PaymentMethodDetails from './payment-method-details';
import { OrderData, StatusViewConfig } from '@/types/payment';
import { Package, User } from 'lucide-react';

interface PaymentOrderCardProps {
  orderData: OrderData | null;
  displayOrderNumber: string | null;
  amount: string | null;
  currency: string | null;
  isRTL: boolean;
  statusConfig: StatusViewConfig;
  t: (key: string) => string;
  receiptDateTime: string;
  hijriDateString: string;
  isPayLinkPayment: boolean;
  isCustomPayLinkPayment: boolean;
  gatewayAmount: string | null;
  gatewayCurrency: string | null;
  providerRefNum: string | null;
  customerReference: string | null;
}

export default function PaymentOrderCard({
  orderData,
  displayOrderNumber,
  amount,
  currency,
  isRTL,
  statusConfig,
  t,
  receiptDateTime,
  hijriDateString,
  isPayLinkPayment,
  isCustomPayLinkPayment,
  gatewayAmount,
  gatewayCurrency,
  providerRefNum,
  customerReference,
}: PaymentOrderCardProps) {
  return (
    <div className="bg-card-bg border border-stroke rounded-site overflow-hidden">
      <div
        className={`px-5 py-4 flex items-center justify-between gap-4 ${statusConfig.bgColor} border-b ${statusConfig.borderColor}`}
      >
        <div className="flex flex-col gap-1">
          {displayOrderNumber ? (
            <span className="text-xs font-mono text-secondary">
              #{displayOrderNumber}
            </span>
          ) : null}
        </div>
        {amount && currency ? (
          <span className={`text-xl font-bold ${statusConfig.color} ltr`}>
            {amount} {currency}
          </span>
        ) : null}
      </div>

      {orderData ? (
        <>
          <div className="p-5 border-b border-stroke">
            <div className="flex items-center gap-2 mb-4">
              <Package size={16} className="text-secondary" />
              <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide">
                {t('orderItems')}
              </h3>
            </div>
            <div className="space-y-2.5">
              {orderData.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium">
                    {isRTL ? item.productName.ar : item.productName.en}
                    {item.quantity > 1 ? (
                      <span className="text-secondary font-normal">
                        {' '}
                        ×{item.quantity}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-secondary ltr">
                    {(item.price * item.quantity).toLocaleString()}{' '}
                    {item.currency}
                  </span>
                </div>
              ))}
            </div>

            {orderData.couponDiscount > 0 || orderData.isPartialPayment ? (
              <div className="mt-3 pt-3 border-t border-stroke/50 space-y-1.5 text-sm">
                {orderData.couponDiscount > 0 ? (
                  <div className="flex justify-between text-success">
                    <span>
                      {t('discount')}
                      {orderData.couponCode ? (
                        <span className="text-xs opacity-60 ms-1">
                          ({orderData.couponCode})
                        </span>
                      ) : null}
                    </span>
                    <span className="ltr">
                      -{orderData.couponDiscount.toLocaleString()}{' '}
                      {orderData.currency}
                    </span>
                  </div>
                ) : null}
                {orderData.isPartialPayment ? (
                  <>
                    <div className="flex justify-between text-secondary">
                      <span>{t('fullAmount')}</span>
                      <span className="ltr">
                        {orderData.fullAmount.toLocaleString()}{' '}
                        {orderData.currency}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>{t('paidNow')}</span>
                      <span className="ltr">
                        {orderData.paidAmount.toLocaleString()}{' '}
                        {orderData.currency}
                      </span>
                    </div>
                    <div className="flex justify-between text-yellow-500">
                      <span>{t('remaining')}</span>
                      <span className="ltr">
                        {orderData.remainingAmount.toLocaleString()}{' '}
                        {orderData.currency}
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="p-5 border-b border-stroke">
            <div className="flex items-center gap-2 mb-4">
              <User size={16} className="text-secondary" />
              <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide">
                {t('customerInfo')}
              </h3>
            </div>
            <div className="space-y-2 text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
              <div className="flex justify-between gap-4">
                <span className="text-secondary shrink-0">{t('name')}</span>
                <span className="font-medium text-end">
                  {orderData.billingData.fullName}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-secondary shrink-0">{t('email')}</span>
                <span className="font-medium ltr text-end break-all">
                  {orderData.billingData.email}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-secondary shrink-0">{t('phone')}</span>
                <span className="font-medium ltr">
                  {orderData.billingData.phone}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-secondary shrink-0">{t('country')}</span>
                <span className="font-medium text-end">
                  {orderData.billingData.country}
                </span>
              </div>
            </div>
          </div>

          {orderData.reservationData?.length > 0 ? (
            <div className="p-5">
              <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide mb-3">
                {t('reservationTitle')}
              </h3>
              <div className="space-y-2.5">
                {orderData.reservationData.map((field, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-4 text-sm"
                  >
                    <span className="text-secondary shrink-0">
                      {isRTL ? field.label.ar : field.label.en}
                    </span>
                    {field.type === 'picture' ? (
                      <a
                        href={field.value}
                        target="_blank"
                        rel="noreferrer"
                        className="text-success underline break-all"
                      >
                        {t('viewImage')}
                      </a>
                    ) : (
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {field.value
                          .split('\n')
                          .map((entry) => entry.trim())
                          .filter(Boolean)
                          .map((entry, valueIdx) => (
                            <span
                              key={`${field.key}-${valueIdx}`}
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-success/10 text-success"
                            >
                              {entry}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="p-5 border-t border-stroke/50 flex flex-col gap-4 text-xs">
            <div className="flex justify-between gap-4">
              <span className="font-extralight">{receiptDateTime}</span>
              <span className="font-extralight">{hijriDateString}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="font-extralight">{t('ref')}</span>
              <span className="font-extralight">
                {orderData.referralId || 'Default'}
              </span>
            </div>
          </div>

          {isPayLinkPayment ? (
            <div className="p-5 border-t border-stroke/50">
              <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide mb-3">
                {t('paymentMethod')}
              </h3>
              <PaymentMethodDetails
                t={t}
                isCustomPayLinkPayment={isCustomPayLinkPayment}
                gatewayAmount={gatewayAmount}
                gatewayCurrency={gatewayCurrency}
                providerRefNum={providerRefNum}
                customerReference={customerReference}
              />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
