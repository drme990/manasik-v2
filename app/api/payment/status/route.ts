import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Referral from '@/models/Referral';

export const runtime = 'nodejs';

/**
 * GET /api/payment/status?orderNumber=XXX
 *
 * Fetches full order details from the database for the payment status page.
 * EasyKash webhook will have already updated the order if payment completed.
 * Also resolves referral info if the order has a referralId.
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber');

    if (!orderNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing orderNumber parameter' },
        { status: 400 },
      );
    }

    const order = await Order.findOne({ orderNumber }).lean();

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 },
      );
    }

    // Resolve referral info if present
    let referralInfo: { name: string; phone: string } | null = null;
    if (order.referralId) {
      const referral = await Referral.findOne({
        referralId: order.referralId,
      }).lean();
      if (referral) {
        referralInfo = {
          name: referral.name as string,
          phone: referral.phone as string,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        currency: order.currency,
        items: order.items,
        billingData: order.billingData,
        couponCode: order.couponCode || null,
        couponDiscount: order.couponDiscount || 0,
        isPartialPayment: order.isPartialPayment || false,
        fullAmount: order.fullAmount || order.totalAmount,
        paidAmount: order.paidAmount || order.totalAmount,
        remainingAmount: order.remainingAmount || 0,
        notes: order.notes || null,
        source: order.source || 'manasik',
        referralInfo,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment status' },
      { status: 500 },
    );
  }
}
