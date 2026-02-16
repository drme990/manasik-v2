import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Referral from '@/models/Referral';

/**
 * GET /api/payment/referral-info?order_id=XXX
 *
 * Fetches the referral person's info (name, phone) for a given Paymob order ID.
 * Used on the payment success page to display a WhatsApp contact button.
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const paymobOrderId = searchParams.get('order_id');

    if (!paymobOrderId) {
      return NextResponse.json({ success: true, data: null });
    }

    // Find the order by Paymob order ID
    const order = await Order.findOne({
      paymobOrderId: Number(paymobOrderId),
    });

    if (!order || !order.referralId) {
      return NextResponse.json({ success: true, data: null });
    }

    // Find the referral person by referralId
    const referral = await Referral.findOne({ referralId: order.referralId });

    if (!referral) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({
      success: true,
      data: {
        name: referral.name,
        phone: referral.phone,
      },
    });
  } catch (error) {
    console.error('Error fetching referral info:', error);
    return NextResponse.json({ success: true, data: null });
  }
}
