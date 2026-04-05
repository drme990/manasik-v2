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
  referenceCode?: string | null;

  items: OrderItem[];

  billingData: BillingData;

  reservationMap: Map<ReservationFieldKey, ReservationOrderField>;

  referralInfo?: {
    name: string;
    phone: string;
  } | null;
  referralId?: string | null;
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

function isNextDayExecutionDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const executionDate = new Date(year, month - 1, day);
  executionDate.setHours(0, 0, 0, 0);

  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return executionDate.getTime() === tomorrow.getTime();
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
  console.log(data);

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

  const memorialLine =
    isAlive === 'متوفي'
      ? `عن روح ${gender === 'انثى' ? 'المرحومة' : gender === 'ذكور و اناث' ? 'المرحومين' : 'المرحوم'} بإذن الله`
      : '';

  const DIVIDER = '------------------';
  const genderEmoji =
    gender === 'انثى' ? '♀️' : gender === 'ذكور و اناث' ? '♂️♀️' : '♂️';

  const lines: string[] = [productLine, ''];

  if (memorialLine) {
    lines.push(memorialLine, '');
  }
  if (sacrificeFor) {
    lines.push(sacrificeFor, '');
  }
  if (shortDuaa) {
    lines.push(shortDuaa, '');
  }
  if (photo) {
    lines.push(`🤳🏻صورة: ${photo}`);
    lines.push(DIVIDER);
  }
  lines.push(remainingLine);
  lines.push(DIVIDER);
  if (executionDate && !isNextDayExecutionDate(executionDate)) {
    lines.push(`🗓️  *تنفيذ ${formatExecutionDate(executionDate)}*`);
    lines.push(DIVIDER);
  }
  lines.push(
    `${genderEmoji} ${gender || '-'}${isAlive ? ` - ${isAlive}` : ''}`,
  );
  lines.push(DIVIDER);
  lines.push(`🎟️رقم الطلب: ${data.orderNumber}`);
  lines.push(`📋صاحب الفاتورة:`);
  lines.push(data.billingData.fullName);
  lines.push(`📨ايميل: ${data.billingData.email}`);
  lines.push(`واتساب: ${data.billingData.phone}`);
  if (data.referralId?.trim()) {
    lines.push(DIVIDER);
    lines.push(`Ref Code: ${data.referralId.trim()}`);
  } else {
    lines.push(DIVIDER);
    lines.push('Ref Code: Pure');
  }

  if (firstItem && firstItem.quantity === 1 && lines[0].startsWith('1 ')) {
    lines[0] = lines[0].replace(/^1 /, '');
  }

  return lines.join('\n');
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

/**
 * Build a support WhatsApp link without prefilled text.
 */
export function buildSupportWhatsappLink(): string {
  const phone = cleanPhone(MAIN_WHATSAPP);
  return `https://wa.me/${phone}`;
}
