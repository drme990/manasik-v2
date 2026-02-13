import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import {
  createPaymentIntention,
  getCheckoutUrl,
  type PaymobBillingData,
} from '@/lib/paymob';

/**
 * POST /api/payment/checkout
 *
 * Creates a new order and initiates a Paymob payment intention.
 * Returns the checkout URL for redirecting the customer.
 *
 * Body:
 * {
 *   productId: string,
 *   quantity?: number,
 *   currency: string,
 *   billingData: { firstName, lastName, email, phone, country, city, ... },
 *   locale?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const {
      productId,
      quantity = 1,
      currency,
      billingData,
      locale = 'ar',
    } = body;

    // Validate
    if (!productId || !currency || !billingData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: productId, currency, billingData',
        },
        { status: 400 },
      );
    }

    if (
      !billingData.firstName ||
      !billingData.lastName ||
      !billingData.email ||
      !billingData.phone
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Billing data must include: firstName, lastName, email, phone',
        },
        { status: 400 },
      );
    }

    // Fetch product
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 },
      );
    }

    if (!product.inStock) {
      return NextResponse.json(
        { success: false, error: 'Product is out of stock' },
        { status: 400 },
      );
    }

    // Determine price in the selected currency
    const currencyUpper = currency.toUpperCase();
    let unitPrice = product.price;

    // Check if there's a specific price for this currency
    const currencyPrice = product.prices?.find(
      (p: { currencyCode: string; amount: number }) =>
        p.currencyCode === currencyUpper,
    );

    if (currencyPrice) {
      unitPrice = currencyPrice.amount;
    } else if (product.currency !== currencyUpper) {
      // If no matching price and not the default currency, use default
      return NextResponse.json(
        {
          success: false,
          error: `Price not available in ${currencyUpper}. Available in: ${product.currency}`,
        },
        { status: 400 },
      );
    }

    const totalAmount = unitPrice * quantity;

    // Amount in cents for Paymob
    const amountCents = Math.round(totalAmount * 100);

    // Create order in database
    const order = await Order.create({
      items: [
        {
          productId: product._id.toString(),
          productName: {
            ar: product.name.ar,
            en: product.name.en,
          },
          price: unitPrice,
          currency: currencyUpper,
          quantity,
        },
      ],
      totalAmount,
      currency: currencyUpper,
      status: 'pending',
      billingData: {
        firstName: billingData.firstName,
        lastName: billingData.lastName,
        email: billingData.email,
        phone: billingData.phone,
        country: billingData.country || 'N/A',
        city: billingData.city || 'N/A',
        state: billingData.state || 'N/A',
        street: billingData.street || 'N/A',
        building: billingData.building || 'N/A',
        floor: billingData.floor || 'N/A',
        apartment: billingData.apartment || 'N/A',
        postalCode: billingData.postalCode || '',
      },
      countryCode: billingData.country || '',
      locale,
    });

    // Prepare Paymob billing data
    const paymobBilling: PaymobBillingData = {
      first_name: billingData.firstName,
      last_name: billingData.lastName,
      email: billingData.email,
      phone_number: billingData.phone,
      country: billingData.country || 'N/A',
      city: billingData.city || 'N/A',
      state: billingData.state || 'N/A',
      street: billingData.street || 'N/A',
      building: billingData.building || 'N/A',
      floor: billingData.floor || 'N/A',
      apartment: billingData.apartment || 'N/A',
      postal_code: billingData.postalCode || '',
    };

    const baseUrl = process.env.BASE_URL || 'https://www.manasik.net';
    const integrationId = process.env.PAYMOB_INTEGRATION_ID;

    if (!integrationId) {
      // If Paymob not configured, still create the order
      return NextResponse.json({
        success: true,
        data: {
          order: {
            _id: order._id,
            orderNumber: order.orderNumber,
            totalAmount,
            currency: currencyUpper,
            status: order.status,
          },
          checkoutUrl: null,
          message:
            'Payment gateway not configured. Order created successfully.',
        },
      });
    }

    // Create Paymob intention
    const intention = await createPaymentIntention({
      amount: amountCents,
      currency: currencyUpper,
      paymentMethods: [parseInt(integrationId)],
      items: [
        {
          name: locale === 'ar' ? product.name.ar : product.name.en,
          amount: amountCents,
          description:
            locale === 'ar'
              ? product.description.ar
              : product.description.en,
          quantity,
        },
      ],
      billingData: paymobBilling,
      specialReference: order.orderNumber,
      notificationUrl: `${baseUrl}/api/payment/webhook`,
      redirectionUrl: `${baseUrl}/payment/status`,
      expiration: 3600,
    });

    // Update order with Paymob data
    order.paymobOrderId = intention.intention_order_id;
    order.paymobIntentionId = intention.id;
    order.status = 'processing';
    await order.save();

    const checkoutUrl = getCheckoutUrl(intention.client_secret);

    return NextResponse.json({
      success: true,
      data: {
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          totalAmount,
          currency: currencyUpper,
          status: order.status,
        },
        checkoutUrl,
        intentionId: intention.id,
      },
    });
  } catch (error) {
    console.error('Error creating checkout:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create checkout' },
      { status: 500 },
    );
  }
}
