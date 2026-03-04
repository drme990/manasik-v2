/**
 * EasyKash Direct Payment API integration service.
 *
 * Uses the EasyKash Direct Pay v1 API for creating payment sessions,
 * HMAC SHA-512 verification for webhook callbacks, and payment inquiry.
 *
 * Required ENV variables:
 * - EASYKASH_API_KEY: Your API key from the EasyKash Integration Settings
 * - EASYKASH_HMAC_SECRET: Your HMAC secret for verifying callback signatures
 *
 * Endpoints:
 * - Pay:     POST https://back.easykash.net/api/directpayv1/pay
 * - Inquire: POST https://back.easykash.net/api/cash-api/inquire
 *
 * Callback: EasyKash POSTs to your configured callback URL after payment.
 */

import crypto from 'crypto';

// ─── Configuration ───────────────────────────────────────────────

const EASYKASH_BASE_URL = 'https://back.easykash.net/api';
const EASYKASH_API_KEY = process.env.EASYKASH_API_KEY || '';
const EASYKASH_HMAC_SECRET = process.env.EASYKASH_HMAC_SECRET || '';

// ─── Types ───────────────────────────────────────────────────────

/**
 * Payment options supported by EasyKash:
 * 2 = Fawry    3 = Credit/Debit    4 = Meeza   5 = Mobile Wallet   6 = ValU
 */
export type EasykashPaymentOptionId = 2 | 3 | 4 | 5 | 6;

export interface EasykashPayRequest {
  /** Amount to charge (e.g. 100.50) */
  amount: number;
  /** Currency code, e.g. "EGP" */
  currency: string;
  /** Array of payment option IDs. Default: [2, 3, 4, 5, 6] */
  paymentOptions?: EasykashPaymentOptionId[];
  /** Cash expiry in days (default: 3) */
  cashExpiry?: number;
  /** Customer full name */
  name: string;
  /** Customer email */
  email: string;
  /** Customer mobile number */
  mobile: string;
  /** URL to redirect customer back after payment */
  redirectUrl: string;
  /** Your unique order reference ID (e.g. order _id or orderNumber) */
  customerReference: string;
}

export interface EasykashPayResponse {
  /** The URL to redirect the customer to for completing payment */
  redirectUrl: string;
}

export interface EasykashCallbackPayload {
  ProductCode: string;
  PaymentMethod: string;
  ProductType: string;
  Amount: string;
  BuyerEmail: string;
  BuyerMobile: string;
  BuyerName: string;
  Timestamp: string;
  status: string;
  voucher: string;
  easykashRef: string;
  VoucherData: string;
  customerReference: string;
  signatureHash: string;
}

export interface EasykashInquiryResponse {
  PaymentMethod: string;
  Amount: string;
  BuyerName: string;
  BuyerEmail: string;
  BuyerMobile: string;
  status: string;
  voucher: string;
  easykashRef: string;
}

// ─── API Functions ───────────────────────────────────────────────

/**
 * Create a payment session via EasyKash Direct Pay API.
 * Returns a redirect URL where the customer completes their payment.
 */
export async function createPayment(
  params: EasykashPayRequest,
): Promise<EasykashPayResponse> {
  const body = {
    amount: params.amount,
    currency: params.currency.toUpperCase(),
    paymentOptions: params.paymentOptions ?? [2, 3, 4, 5, 6],
    cashExpiry: params.cashExpiry ?? 3,
    name: params.name,
    email: params.email,
    mobile: params.mobile,
    redirectUrl: params.redirectUrl,
    customerReference: params.customerReference,
  };

  const response = await fetch(`${EASYKASH_BASE_URL}/directpayv1/pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: EASYKASH_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('EasyKash create payment error:', errorText);
    throw new Error(`EasyKash API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// ─── HMAC Verification ──────────────────────────────────────────

/**
 * Verify the HMAC signature from an EasyKash callback payload.
 *
 * Verification steps:
 * 1. Concatenate values in order: ProductCode, Amount, ProductType,
 *    PaymentMethod, status, easykashRef, customerReference
 * 2. Compute HMAC-SHA512 with the secret key
 * 3. Compare hex digest with the signatureHash from the payload
 */
export function verifyCallbackSignature(
  payload: EasykashCallbackPayload,
): boolean {
  if (!EASYKASH_HMAC_SECRET) {
    console.warn('EASYKASH_HMAC_SECRET not set — skipping HMAC verification');
    return true;
  }

  const dataToSign = [
    payload.ProductCode,
    payload.Amount,
    payload.ProductType,
    payload.PaymentMethod,
    payload.status,
    payload.easykashRef,
    payload.customerReference,
  ].join('');

  const calculatedHash = crypto
    .createHmac('sha512', EASYKASH_HMAC_SECRET)
    .update(dataToSign)
    .digest('hex');

  return calculatedHash === payload.signatureHash;
}

// ─── Payment Inquiry ─────────────────────────────────────────────

/**
 * Look up a payment's status by customerReference.
 */
export async function inquirePayment(
  customerReference: string,
): Promise<EasykashInquiryResponse> {
  const response = await fetch(`${EASYKASH_BASE_URL}/cash-api/inquire`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: EASYKASH_API_KEY,
    },
    body: JSON.stringify({ customerReference }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('EasyKash inquiry error:', errorText);
    throw new Error(
      `EasyKash inquiry error: ${response.status} - ${errorText}`,
    );
  }

  return response.json();
}
