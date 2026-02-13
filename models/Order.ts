import mongoose from 'mongoose';

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export type PaymentMethod = 'card' | 'wallet' | 'bank_transfer' | 'other';

export interface IOrderItem {
  productId: string;
  productName: {
    ar: string;
    en: string;
  };
  price: number;
  currency: string;
  quantity: number;
}

export interface IBillingData {
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

export interface IOrder {
  _id?: string;
  orderNumber: string;
  items: IOrderItem[];
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  billingData: IBillingData;
  // Paymob fields
  paymobOrderId?: number;
  paymobIntentionId?: string;
  paymobTransactionId?: number;
  paymobPaymentKey?: string;
  paymobResponse?: mongoose.Schema.Types.Mixed;
  // Metadata
  notes?: string;
  countryCode?: string;
  locale?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const OrderItemSchema = new mongoose.Schema<IOrderItem>(
  {
    productId: {
      type: String,
      required: true,
    },
    productName: {
      ar: { type: String, required: true },
      en: { type: String, required: true },
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
  },
  { _id: false },
);

const BillingDataSchema = new mongoose.Schema<IBillingData>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    city: { type: String, default: 'N/A', trim: true },
    state: { type: String, default: 'N/A', trim: true },
    street: { type: String, default: 'N/A', trim: true },
    building: { type: String, default: 'N/A', trim: true },
    floor: { type: String, default: 'N/A', trim: true },
    apartment: { type: String, default: 'N/A', trim: true },
    postalCode: { type: String, default: '', trim: true },
  },
  { _id: false },
);

const OrderSchema = new mongoose.Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: (v: IOrderItem[]) => v.length > 0,
        message: 'Order must have at least one item',
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: [
        'pending',
        'processing',
        'paid',
        'failed',
        'refunded',
        'cancelled',
      ],
      default: 'pending',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'wallet', 'bank_transfer', 'other'],
    },
    billingData: {
      type: BillingDataSchema,
      required: true,
    },
    // Paymob integration fields
    paymobOrderId: { type: Number, index: true },
    paymobIntentionId: { type: String, index: true },
    paymobTransactionId: { type: Number, index: true },
    paymobPaymentKey: { type: String },
    paymobResponse: { type: mongoose.Schema.Types.Mixed },
    // Metadata
    notes: { type: String, trim: true },
    countryCode: { type: String, trim: true },
    locale: { type: String, trim: true, default: 'ar' },
  },
  {
    timestamps: true,
  },
);

// Generate order number before saving
OrderSchema.pre('save', async function () {
  if (!this.orderNumber) {
    const date = new Date();
    const prefix = `MNK-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const count = await mongoose.models.Order.countDocuments({
      orderNumber: { $regex: `^${prefix}` },
    });
    this.orderNumber = `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }
});

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });

const Order =
  mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
