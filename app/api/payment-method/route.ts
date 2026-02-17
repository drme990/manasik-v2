import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import PaymentSettings from '@/models/PaymentSettings';

export async function GET() {
  try {
    await dbConnect();

    let settings = await PaymentSettings.findOne().lean();

    if (!settings) {
      // Default to paymob if no settings exist
      settings = await PaymentSettings.create({ paymentMethod: 'paymob' });
      settings = settings.toObject();
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentMethod: settings.paymentMethod,
      },
    });
  } catch (error) {
    console.error('Error fetching payment method:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment method' },
      { status: 500 },
    );
  }
}
