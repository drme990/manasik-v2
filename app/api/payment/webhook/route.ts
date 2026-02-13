import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import {
  verifyProcessedCallbackHmac,
  type PaymobTransactionCallback,
} from '@/lib/paymob';

/**
 * POST /api/payment/webhook
 *
 * Paymob Transaction Processed Callback (webhook).
 * Receives transaction status updates and updates order accordingly.
 *
 * Paymob sends this POST with:
 * - Query param: hmac
 * - Body: { type: "TRANSACTION", obj: { ... } }
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Get HMAC from query params
    const { searchParams } = new URL(request.url);
    const receivedHmac = searchParams.get('hmac') || '';

    // Parse body
    const body: PaymobTransactionCallback = await request.json();

    // Verify HMAC
    if (process.env.PAYMOB_HMAC_SECRET && receivedHmac) {
      const isValid = verifyProcessedCallbackHmac(body, receivedHmac);
      if (!isValid) {
        console.error('Invalid HMAC in Paymob webhook callback');
        return NextResponse.json(
          { success: false, error: 'Invalid HMAC' },
          { status: 403 },
        );
      }
    }

    const transaction = body.obj;
    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Invalid callback data' },
        { status: 400 },
      );
    }

    const paymobOrderId = transaction.order?.id;

    if (!paymobOrderId) {
      console.error('No order ID in Paymob callback');
      return NextResponse.json(
        { success: false, error: 'No order ID' },
        { status: 400 },
      );
    }

    // Find the order by Paymob order ID
    const order = await Order.findOne({ paymobOrderId });

    if (!order) {
      console.error(`Order not found for Paymob order ID: ${paymobOrderId}`);
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 },
      );
    }

    // Update order based on transaction status
    order.paymobTransactionId = transaction.id;
    order.paymobResponse = {
      success: transaction.success,
      pending: transaction.pending,
      amount_cents: transaction.amount_cents,
      currency: transaction.currency,
      error_occured: transaction.error_occured,
      is_voided: transaction.is_voided,
      is_refunded: transaction.is_refunded,
      source_data: transaction.source_data,
      created_at: transaction.created_at,
    };

    if (transaction.success && !transaction.is_voided && !transaction.is_refunded) {
      order.status = 'paid';
      order.paymentMethod = transaction.source_data?.type === 'card' ? 'card' : 'other';
    } else if (transaction.is_voided) {
      order.status = 'cancelled';
    } else if (transaction.is_refunded) {
      order.status = 'refunded';
    } else if (transaction.pending) {
      order.status = 'processing';
    } else {
      order.status = 'failed';
    }

    await order.save();

    console.log(
      `Paymob webhook: Order ${order.orderNumber} → ${order.status} (txn: ${transaction.id})`,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing Paymob webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 },
    );
  }
}
