import mongoose from 'mongoose';

export interface ICurrencyPrice {
  currencyCode: string;
  amount: number;
  isManual: boolean; // true = admin set it manually, false = auto-converted
}

export interface ICurrencyMinimumPayment {
  currencyCode: string;
  value: number;
  isManual: boolean;
}

export interface IEasykashLinks {
  fullPayment: string;
  halfPayment: string;
  customPayment: string;
}

export interface IProductSize {
  _id?: string;
  name: {
    ar: string;
    en: string;
  };
  price?: number;
  prices?: ICurrencyPrice[];
  easykashLinks: IEasykashLinks;
}

export interface IProduct {
  _id?: string;
  name: {
    ar: string;
    en: string;
  };
  content: {
    ar: string;
    en: string;
  };
  // Legacy single-price fields (kept for backward compat)
  price: number;
  currency: string;
  // Multi-currency pricing
  mainCurrency: string; // The base currency for auto-conversion (e.g., "SAR")
  prices: ICurrencyPrice[]; // Per-currency pricing
  inStock: boolean;
  image?: string;
  images?: string[];
  allowPartialPayment?: boolean;
  minimumPayment?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  minimumPaymentType?: 'percentage' | 'fixed';
  minimumPayments?: ICurrencyMinimumPayment[];
  sizes?: IProductSize[];
  easykashLinks?: IEasykashLinks;
  displayOrder?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const ProductSizeSchema = new mongoose.Schema({
  name: {
    ar: { type: String, required: true, trim: true },
    en: { type: String, required: true, trim: true },
  },
  price: { type: Number, min: 0, default: 0 },
  prices: [
    {
      currencyCode: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
      },
      amount: { type: Number, required: true, min: 0 },
      isManual: { type: Boolean, default: false },
    },
  ],
  easykashLinks: {
    fullPayment: { type: String, trim: true, default: '' },
    halfPayment: { type: String, trim: true, default: '' },
    customPayment: { type: String, trim: true, default: '' },
  },
});

const ProductSchema = new mongoose.Schema<IProduct>(
  {
    name: {
      ar: {
        type: String,
        required: [true, 'Arabic product name is required'],
        trim: true,
        maxlength: [100, 'Arabic product name cannot exceed 100 characters'],
      },
      en: {
        type: String,
        required: [true, 'English product name is required'],
        trim: true,
        maxlength: [100, 'English product name cannot exceed 100 characters'],
      },
    },
    content: {
      ar: {
        type: String,
        trim: true,
        default: '',
      },
      en: {
        type: String,
        trim: true,
        default: '',
      },
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      default: 'SAR',
      uppercase: true,
      trim: true,
    },
    mainCurrency: {
      type: String,
      default: 'SAR',
      uppercase: true,
      trim: true,
    },
    prices: [
      {
        currencyCode: {
          type: String,
          required: true,
          uppercase: true,
          trim: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        isManual: {
          type: Boolean,
          default: false,
        },
      },
    ],
    inStock: {
      type: Boolean,
      default: true,
    },
    image: {
      type: String,
      trim: true,
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    allowPartialPayment: {
      type: Boolean,
      default: false,
    },
    minimumPayment: {
      type: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: 'percentage',
      },
      value: {
        type: Number,
        min: 0,
        default: 50,
      },
    },
    minimumPaymentType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    minimumPayments: [
      {
        currencyCode: {
          type: String,
          required: true,
          uppercase: true,
          trim: true,
        },
        value: {
          type: Number,
          required: true,
          min: 0,
        },
        isManual: {
          type: Boolean,
          default: false,
        },
      },
    ],
    sizes: [ProductSizeSchema],
    easykashLinks: {
      fullPayment: { type: String, trim: true, default: '' },
      halfPayment: { type: String, trim: true, default: '' },
      customPayment: { type: String, trim: true, default: '' },
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent re-compilation of model in development
const Product =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
