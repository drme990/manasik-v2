import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import {
  verifyCallbackSignature,
  type EasykashCallbackPayload,
} from '@/lib/easykash';
import { trackPurchase } from '@/lib/fb-capi';

export const runtime = 'nodejs'; // uses mongoose + Node.js crypto

/**
 * POST /api/payment/webhook
 *
 * EasyKash Callback Service (webhook).
 * Receives payment status updates after every successful payment
 * and updates the order accordingly.
 *
 * EasyKash POSTs a JSON body with:
 * {
 *   ProductCode, PaymentMethod, ProductType, Amount,
 *   BuyerEmail, BuyerMobile, BuyerName, Timestamp,
 *   status, voucher, easykashRef, VoucherData,
 *   customerReference, signatureHash
 * }
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body: EasykashCallbackPayload = await request.json();

    // Verify HMAC signature
    if (process.env.EASYKASH_HMAC_SECRET) {
      const isValid = verifyCallbackSignature(body);
      if (!isValid) {
        console.error('Invalid signature in EasyKash webhook callback');
        return NextResponse.json(
          { success: false, error: 'Invalid signature' },
          { status: 403 },
        );
      }
    }

    const {
      customerReference,
      status,
      easykashRef,
      ProductCode,
      voucher,
      PaymentMethod,
      Amount,
    } = body;

    if (!customerReference) {
      console.error('No customerReference in EasyKash callback');
      return NextResponse.json(
        { success: false, error: 'No customerReference' },
        { status: 400 },
      );
    }

    // Find the order by orderNumber (used as customerReference)
    const order = await Order.findOne({ orderNumber: customerReference });

    if (!order) {
      console.error(
        `Order not found for customerReference: ${customerReference}`,
      );
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 },
      );
    }

    // Update EasyKash fields
    order.easykashRef = easykashRef;
    order.easykashProductCode = ProductCode;
    order.easykashVoucher = voucher;
    order.easykashResponse = {
      status,
      PaymentMethod,
      Amount,
      ProductCode,
      easykashRef,
      voucher,
      BuyerEmail: body.BuyerEmail,
      BuyerMobile: body.BuyerMobile,
      BuyerName: body.BuyerName,
      Timestamp: body.Timestamp,
    };

    // Map EasyKash payment method to our enum
    const methodLower = (PaymentMethod || '').toLowerCase();
    if (
      methodLower.includes('credit') ||
      methodLower.includes('debit') ||
      methodLower.includes('card')
    ) {
      order.paymentMethod = 'card';
    } else if (methodLower.includes('wallet')) {
      order.paymentMethod = 'wallet';
    } else if (methodLower.includes('fawry')) {
      order.paymentMethod = 'fawry';
    } else if (methodLower.includes('meeza')) {
      order.paymentMethod = 'meeza';
    } else if (methodLower.includes('valu')) {
      order.paymentMethod = 'valu';
    } else {
      order.paymentMethod = 'other';
    }

    // Update order status based on EasyKash status
    if (status === 'PAID') {
      order.status = 'paid';
    } else if (status === 'FAILED' || status === 'EXPIRED') {
      order.status = 'failed';
    } else if (status === 'REFUNDED') {
      order.status = 'refunded';
    } else if (status === 'NEW' || status === 'PENDING') {
      order.status = 'processing';
    } else {
      // Unknown status — keep current or mark processing
      order.status = 'processing';
    }

    await order.save();

    // ── FB Conversions API: Purchase (most critical event) ───────────────────
    if (order.status === 'paid' && order.items?.length > 0) {
      const item = order.items[0];
      const baseUrl = process.env.BASE_URL || 'https://www.manasik.net';

      trackPurchase({
        productId: item.productId,
        productName: item.productName?.en || item.productName?.ar || '',
        value: order.totalAmount ?? order.paidAmount ?? 0,
        currency: order.currency || 'SAR',
        numItems: item.quantity || 1,
        orderId: order.orderNumber,
        sourceUrl: `${baseUrl}/payment/status`,
        userData: {
          em: order.billingData?.email,
          ph: order.billingData?.phone,
          fn: order.billingData?.fullName?.split(' ')[0],
          ln:
            order.billingData?.fullName?.split(' ').slice(1).join(' ') ||
            order.billingData?.fullName?.split(' ')[0],
          country: order.billingData?.country || order.countryCode,
          external_id: order._id.toString(),
        },
      }).catch(() => {});
    }

    console.log(
      `EasyKash webhook: Order ${order.orderNumber} → ${order.status} (ref: ${easykashRef})`,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing EasyKash webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 },
    );
  }
}
