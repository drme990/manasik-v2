import {
  normalizeReservationOptionValue,
  ReservationFieldKey,
} from '@/lib/reservation-fields';

import type {
  OrderItem,
  BillingData,
  ReservationOrderField,
} from '@/types/Order';

const MAIN_WHATSAPP = '201027282396';

export interface OrderWhatsappData {
  orderNumber: string;
  currency: string;
  remainingAmount?: number;

  items: OrderItem[];

  billingData: BillingData;

  reservationMap: Map<ReservationFieldKey, ReservationOrderField>;

  referralInfo?: {
    name: string;
    phone: string;
  } | null;
}

/**
 * Format execution date to Arabic readable format
 * Example: السبت 15/6/2025
 */
function formatExecutionDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  const weekday = date.toLocaleDateString('ar-EG', {
    weekday: 'long',
  });

  return `${weekday} ${day}/${month}/${year}`;
}

/**
 * Clean phone number for WhatsApp URL
 */
function cleanPhone(phone: string): string {
  return phone.replace(/[\s\-+()]/g, '').replace(/^0+/, '');
}

/**
 * Build WhatsApp message for order
 */
export function buildOrderWhatsappMessage(data: OrderWhatsappData): string {
  const { reservationMap } = data;

  const intention = normalizeReservationOptionValue(
    'intention',
    reservationMap.get('intention')?.value ?? '',
  );

  const sacrificeFor = reservationMap.get('sacrificeFor')?.value?.trim() ?? '';

  const gender = normalizeReservationOptionValue(
    'gender',
    reservationMap.get('gender')?.value ?? '',
  );

  const isAlive = normalizeReservationOptionValue(
    'isAlive',
    reservationMap.get('isAlive')?.value ?? '',
  );

  const shortDuaa = reservationMap.get('shortDuaa')?.value?.trim() ?? '';

  const photo = reservationMap.get('photo')?.value?.trim() ?? '';

  const executionDate =
    reservationMap.get('executionDate')?.value?.trim() ?? '';

  const firstItem = data.items?.[0];

  const productLine = firstItem
    ? `${firstItem.quantity} ${firstItem.productName.ar}${intention ? ` ${intention}` : ''}`
    : '';

  const remainingLine =
    (data.remainingAmount ?? 0) > 0
      ? `✅ باقي ${(data.remainingAmount ?? 0).toLocaleString('ar-EG')} ${data.currency}`
      : '✅ خالص';

  const lifeStatusText = isAlive === 'ميت' ? 'متوفي' : isAlive;

  const memorialLine =
    isAlive === 'ميت'
      ? `عن روح ${gender === 'انثى' ? 'المرحومة' : 'المرحوم'} بإذن الله`
      : '';

  const message = [
    productLine,
    '',
    ...(memorialLine ? [memorialLine, ''] : []),
    ...(sacrificeFor ? [sacrificeFor, ''] : []),
    ...(shortDuaa ? [shortDuaa, ''] : []),
    ...(photo ? [`صورة: ${photo}`, ''] : []),
    remainingLine,
    '',
    ...(executionDate
      ? [`*تنفيذ ${formatExecutionDate(executionDate)}*`, '']
      : []),
    ...(gender || lifeStatusText
      ? [`${gender || '-'}${lifeStatusText ? ` - ${lifeStatusText}` : ''}`, '']
      : []),
    `رقم الطلب: ${data.orderNumber}`,
    'صاحب الفاتورة:',
    data.billingData.fullName,
    `ايميل: ${data.billingData.email}`,
    `واتساب: ${data.billingData.phone}`,
  ]
    .filter(Boolean)
    .join('\n');

  return message;
}

/**
 * Build WhatsApp link with encoded message
 */
export function buildOrderWhatsappLink(data: OrderWhatsappData) {
  const message = buildOrderWhatsappMessage(data);

  const target = data.referralInfo?.phone || MAIN_WHATSAPP;
  const phone = cleanPhone(target);

  return {
    href: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    referralName: data.referralInfo?.name,
  };
}
