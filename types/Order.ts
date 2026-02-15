export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export type PaymentMethod = 'card' | 'wallet' | 'bank_transfer' | 'other';

export interface OrderItem {
  productId: string;
  productName: {
    ar: string;
    en: string;
  };
  price: number;
  currency: string;
  quantity: number;
}

export interface BillingData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  state?: string;
  street?: string;
  building?: string;
  floor?: string;
  apartment?: string;
  postalCode?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  billingData: BillingData;
  paymobOrderId?: number;
  paymobIntentionId?: string;
  paymobTransactionId?: number;
  // Coupon
  couponCode?: string;
  couponDiscount?: number;
  // Partial payment
  fullAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  isPartialPayment?: boolean;
  // Terms
  termsAgreedAt?: string;
  notes?: string;
  countryCode?: string;
  locale?: string;
  createdAt: string;
  updatedAt: string;
}
