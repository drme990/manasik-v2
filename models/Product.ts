import mongoose from 'mongoose';

export interface ICurrencyPrice {
  currencyCode: string;
  amount: number;
  isManual: boolean; // true = admin set it manually, false = auto-converted
}

export interface IProductSection {
  title: {
    ar: string;
    en: string;
  };
  content: {
    ar: string;
    en: string;
  };
  type: 'text' | 'list';
}

export interface IProduct {
  _id?: string;
  name: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  features: {
    ar: string[];
    en: string[];
  };
  sections: IProductSection[];
  verify?: {
    ar: string;
    en: string;
  };
  receiving?: {
    ar: string;
    en: string;
  };
  implementationMechanism?: {
    ar: string;
    en: string;
  };
  implementationPeriod?: {
    ar: string;
    en: string;
  };
  implementationPlaces?: {
    ar: string;
    en: string;
  };
  // Legacy single-price fields (kept for backward compat)
  price: number;
  currency: string;
  // Multi-currency pricing
  mainCurrency: string; // The base currency for auto-conversion (e.g., "SAR")
  prices: ICurrencyPrice[]; // Per-currency pricing
  supportedCountries: string[]; // Country codes this product is available in
  inStock: boolean;
  image?: string;
  images?: string[];
  allowPartialPayment?: boolean;
  minimumPayment?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

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
    description: {
      ar: {
        type: String,
        required: [true, 'Arabic product description is required'],
        trim: true,
        maxlength: [
          1000,
          'Arabic product description cannot exceed 1000 characters',
        ],
      },
      en: {
        type: String,
        required: [true, 'English product description is required'],
        trim: true,
        maxlength: [
          1000,
          'English product description cannot exceed 1000 characters',
        ],
      },
    },
    features: {
      ar: [
        {
          type: String,
          trim: true,
          maxlength: [200, 'Arabic feature cannot exceed 200 characters'],
        },
      ],
      en: [
        {
          type: String,
          trim: true,
          maxlength: [200, 'English feature cannot exceed 200 characters'],
        },
      ],
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
    supportedCountries: [
      {
        type: String,
        uppercase: true,
        trim: true,
      },
    ],
    sections: [
      {
        title: {
          ar: { type: String, trim: true, default: '' },
          en: { type: String, trim: true, default: '' },
        },
        content: {
          ar: { type: String, trim: true, default: '' },
          en: { type: String, trim: true, default: '' },
        },
        type: {
          type: String,
          enum: ['text', 'list'],
          default: 'text',
        },
      },
    ],
    verify: {
      ar: { type: String, trim: true, default: '' },
      en: { type: String, trim: true, default: '' },
    },
    receiving: {
      ar: { type: String, trim: true, default: '' },
      en: { type: String, trim: true, default: '' },
    },
    implementationMechanism: {
      ar: { type: String, trim: true, default: '' },
      en: { type: String, trim: true, default: '' },
    },
    implementationPeriod: {
      ar: { type: String, trim: true, default: '' },
      en: { type: String, trim: true, default: '' },
    },
    implementationPlaces: {
      ar: { type: String, trim: true, default: '' },
      en: { type: String, trim: true, default: '' },
    },
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
  },
  {
    timestamps: true,
  },
);

// Prevent re-compilation of model in development
const Product =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
