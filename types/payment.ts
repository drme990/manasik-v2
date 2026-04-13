import { ReservationFieldKey } from '@/lib/reservation-fields';

export interface OrderItemData {
  productId: string;
  productSlug?: string;
  productName: { ar: string; en: string };
  price: number;
  currency: string;
  quantity: number;
}

export interface OrderData {
  orderNumber: string;
  status: string;
  totalAmount: number;
  currency: string;
  items: OrderItemData[];
  billingData: {
    fullName: string;
    email: string;
    phone: string;
    country: string;
  };
  couponCode: string | null;
  couponDiscount: number;
  isPartialPayment: boolean;
  fullAmount: number;
  paidAmount: number;
  remainingAmount: number;
  referralId: string | null;
  sizeIndex: number;
  reservationData: Array<{
    key: ReservationFieldKey;
    label: { ar: string; en: string };
    type:
      | 'text'
      | 'textarea'
      | 'number'
      | 'date'
      | 'select'
      | 'radio'
      | 'picture';
    value: string;
  }>;
  source: 'manasik' | 'ghadaq';
  referralInfo: { name: string; phone: string } | null;
  createdAt: string;
}

export type DisplayStatus = 'success' | 'pending' | 'failed';

export interface StatusViewConfig {
  color: string;
  bgColor: string;
  borderColor: string;
  title: string;
  message: string;
  anotherMessage?: string;
}
