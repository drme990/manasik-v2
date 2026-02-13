/**
 * Paymob payment integration service.
 *
 * Uses the Paymob Intention API (v1) for creating payment intentions
 * and HMAC verification for webhook callbacks.
 *
 * Required ENV variables:
 * - PAYMOB_SECRET_KEY: Your secret key from the Paymob dashboard
 * - PAYMOB_PUBLIC_KEY: Your public key from the Paymob dashboard
 * - PAYMOB_INTEGRATION_ID: Your integration ID for card payments
 * - PAYMOB_HMAC_SECRET: Your HMAC secret for verifying callbacks
 * - PAYMOB_BASE_URL: Base URL (default: https://accept.paymob.com)
 */

import crypto from 'crypto';

// ─── Configuration ───────────────────────────────────────────────

const PAYMOB_BASE_URL =
  process.env.PAYMOB_BASE_URL || 'https://accept.paymob.com';
const PAYMOB_SECRET_KEY = process.env.PAYMOB_SECRET_KEY || '';
const PAYMOB_HMAC_SECRET = process.env.PAYMOB_HMAC_SECRET || '';

// ─── Types ───────────────────────────────────────────────────────

export interface PaymobItem {
  name: string;
  amount: number; // in cents
  description: string;
  quantity: number;
}

export interface PaymobBillingData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  country: string;
  city: string;
  state: string;
  street: string;
  building: string;
  floor: string;
  apartment: string;
  postal_code: string;
}

export interface CreateIntentionParams {
  amount: number; // in cents (e.g., 1000 = 10.00 EGP)
  currency: string;
  paymentMethods: (number | string)[];
  items: PaymobItem[];
  billingData: PaymobBillingData;
  specialReference?: string;
  extras?: Record<string, unknown>;
  notificationUrl?: string;
  redirectionUrl?: string;
  expiration?: number; // seconds
}

export interface PaymobIntentionResponse {
  id: string;
  intention_order_id: number;
  client_secret: string;
  payment_methods: {
    integration_id: number;
    alias: string | null;
    name: string;
    method_type: string;
    currency: string;
    live: boolean;
  }[];
  intention_detail: {
    amount: number;
    currency: string;
    items: PaymobItem[];
    billing_data: PaymobBillingData;
  };
  payment_keys: {
    integration: number;
    key: string;
    gateway_type: string;
    iframe_id: number | null;
    order_id: number;
  }[];
  special_reference: string;
  extras: Record<string, unknown>;
  confirmed: boolean;
  status: string;
  created: string;
}

export interface PaymobTransactionCallback {
  type: string;
  obj: {
    id: number;
    pending: boolean;
    amount_cents: number;
    success: boolean;
    is_auth: boolean;
    is_capture: boolean;
    is_standalone_payment: boolean;
    is_voided: boolean;
    is_refunded: boolean;
    is_3d_secure: boolean;
    integration_id: number;
    has_parent_transaction: boolean;
    order: {
      id: number;
      created_at: string;
      amount_cents: number;
      currency: string;
      merchant_order_id: string | null;
      paid_amount_cents: number;
    };
    created_at: string;
    currency: string;
    source_data: {
      pan: string;
      type: string;
      sub_type: string;
    };
    error_occured: boolean;
    owner: number;
    parent_transaction: number | null;
    payment_key_claims: {
      extra: Record<string, unknown>;
      order_id: number;
      amount_cents: number;
      currency: string;
      integration_id: number;
      billing_data: PaymobBillingData;
    };
  };
}

// ─── API Functions ───────────────────────────────────────────────

/**
 * Create a payment intention via Paymob API.
 * Returns the intention response with client_secret for checkout redirect.
 */
export async function createPaymentIntention(
  params: CreateIntentionParams,
): Promise<PaymobIntentionResponse> {
  const body: Record<string, unknown> = {
    amount: params.amount,
    currency: params.currency.toUpperCase(),
    payment_methods: params.paymentMethods,
    items: params.items,
    billing_data: params.billingData,
  };

  if (params.specialReference) {
    body.special_reference = params.specialReference;
  }
  if (params.extras) {
    body.extras = params.extras;
  }
  if (params.notificationUrl) {
    body.notification_url = params.notificationUrl;
  }
  if (params.redirectionUrl) {
    body.redirection_url = params.redirectionUrl;
  }
  if (params.expiration) {
    body.expiration = params.expiration;
  }

  const response = await fetch(`${PAYMOB_BASE_URL}/v1/intention/`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${PAYMOB_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Paymob create intention error:', errorText);
    throw new Error(`Paymob API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Get the Unified Checkout URL for redirecting the customer.
 */
export function getCheckoutUrl(clientSecret: string): string {
  return `${PAYMOB_BASE_URL}/unifiedcheckout/?publicKey=${process.env.PAYMOB_PUBLIC_KEY || ''}&clientSecret=${clientSecret}`;
}

// ─── HMAC Verification ──────────────────────────────────────────

/**
 * HMAC keys in lexicographical order for transaction callbacks.
 * (kept as documentation reference)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _HMAC_KEYS_PROCESSED = [
  'amount_cents',
  'created_at',
  'currency',
  'error_occured',
  'has_parent_transaction',
  'obj.id',
  'integration_id',
  'is_3d_secure',
  'is_auth',
  'is_capture',
  'is_refunded',
  'is_standalone_payment',
  'is_voided',
  'order.id',
  'owner',
  'pending',
  'source_data.pan',
  'source_data.sub_type',
  'source_data.type',
  'success',
] as const;

/**
 * Extract HMAC value from transaction callback data (POST - processed callback).
 */
function getHmacStringFromProcessed(data: PaymobTransactionCallback): string {
  const obj = data.obj;
  const values: string[] = [
    String(obj.amount_cents),
    obj.created_at,
    obj.currency,
    String(obj.error_occured),
    String(obj.has_parent_transaction),
    String(obj.id),
    String(obj.integration_id),
    String(obj.is_3d_secure),
    String(obj.is_auth),
    String(obj.is_capture),
    String(obj.is_refunded),
    String(obj.is_standalone_payment),
    String(obj.is_voided),
    String(obj.order.id),
    String(obj.owner),
    String(obj.pending),
    obj.source_data.pan,
    obj.source_data.sub_type,
    obj.source_data.type,
    String(obj.success),
  ];

  return values.join('');
}

/**
 * Extract HMAC value from transaction response callback (GET - redirect).
 */
export function getHmacStringFromResponse(
  params: Record<string, string>,
): string {
  const keys = [
    'amount_cents',
    'created_at',
    'currency',
    'error_occured',
    'has_parent_transaction',
    'id',
    'integration_id',
    'is_3d_secure',
    'is_auth',
    'is_capture',
    'is_refunded',
    'is_standalone_payment',
    'is_voided',
    'order',
    'owner',
    'pending',
    'source_data.pan',
    'source_data.sub_type',
    'source_data.type',
    'success',
  ];

  return keys.map((key) => params[key] || '').join('');
}

/**
 * Verify HMAC for a transaction processed callback (POST).
 */
export function verifyProcessedCallbackHmac(
  data: PaymobTransactionCallback,
  receivedHmac: string,
): boolean {
  const concatenatedString = getHmacStringFromProcessed(data);
  const calculatedHmac = crypto
    .createHmac('sha512', PAYMOB_HMAC_SECRET)
    .update(concatenatedString)
    .digest('hex');

  return calculatedHmac === receivedHmac;
}

/**
 * Verify HMAC for a transaction response callback (GET redirect).
 */
export function verifyResponseCallbackHmac(
  params: Record<string, string>,
  receivedHmac: string,
): boolean {
  const concatenatedString = getHmacStringFromResponse(params);
  const calculatedHmac = crypto
    .createHmac('sha512', PAYMOB_HMAC_SECRET)
    .update(concatenatedString)
    .digest('hex');

  return calculatedHmac === receivedHmac;
}
