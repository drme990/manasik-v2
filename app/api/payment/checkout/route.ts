import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import {
  createPaymentIntention,
  getCheckoutUrl,
  type PaymobBillingData,
} from '@/lib/paymob';
import { validateCoupon, applyCoupon } from '@/lib/coupon';

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
 *   locale?: string,
 *   couponCode?: string,
 *   paymentOption?: 'full' | 'half' | 'custom',
 *   customPaymentAmount?: number,
 *   termsAgreed?: boolean,
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
      couponCode,
      paymentOption = 'full',
      customPaymentAmount,
      termsAgreed,
    } = body;

    // Validate terms agreement
    if (!termsAgreed) {
      return NextResponse.json(
        { success: false, error: 'Terms and conditions must be agreed to' },
        { status: 400 },
      );
    }

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

    if (!billingData.firstName || !billingData.email || !billingData.phone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Billing data must include: firstName, email, phone',
        },
        { status: 400 },
      );
    }

    // Ensure lastName has a default value if not provided
    if (!billingData.lastName) {
      billingData.lastName = billingData.firstName;
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

    // Apply coupon discount
    let couponDiscount = 0;
    let appliedCouponCode: string | undefined;
    if (couponCode) {
      const couponResult = await validateCoupon(
        couponCode,
        totalAmount,
        currencyUpper,
        productId,
      );
      if (!couponResult.valid) {
        return NextResponse.json(
          { success: false, error: couponResult.error },
          { status: 400 },
        );
      }
      couponDiscount = couponResult.discountAmount || 0;
      appliedCouponCode = couponResult.coupon?.code;
    }

    const amountAfterDiscount = totalAmount - couponDiscount;

    // Calculate payment amount based on payment option
    let payAmount = amountAfterDiscount;
    let isPartialPayment = false;

    // Handle payment options
    if (paymentOption === 'half') {
      // Half payment is always allowed
      isPartialPayment = true;
      payAmount = Math.ceil(amountAfterDiscount / 2);
    } else if (paymentOption === 'custom' && customPaymentAmount) {
      // Custom payment only allowed if product allows partial payment
      if (!product.allowPartialPayment) {
        return NextResponse.json(
          {
            success: false,
            error: 'This product does not support custom payment amounts',
          },
          { status: 400 },
        );
      }

      // Validate custom amount meets minimum
      let minPayment = Math.ceil(amountAfterDiscount / 2);
      if (product.minimumPayment) {
        if (product.minimumPayment.type === 'percentage') {
          minPayment = Math.ceil(
            (amountAfterDiscount * product.minimumPayment.value) / 100,
          );
        } else {
          minPayment = product.minimumPayment.value;
        }
      }
      if (customPaymentAmount < minPayment) {
        return NextResponse.json(
          {
            success: false,
            error: `Minimum payment amount is ${minPayment} ${currencyUpper}`,
          },
          { status: 400 },
        );
      }
      if (customPaymentAmount >= amountAfterDiscount) {
        payAmount = amountAfterDiscount;
        isPartialPayment = false;
      } else {
        isPartialPayment = true;
        payAmount = customPaymentAmount;
      }
    }

    // Amount in cents for Paymob
    const amountCents = Math.round(payAmount * 100);

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
      totalAmount: payAmount,
      fullAmount: amountAfterDiscount,
      paidAmount: payAmount,
      remainingAmount: isPartialPayment ? amountAfterDiscount - payAmount : 0,
      isPartialPayment,
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
      couponCode: appliedCouponCode,
      couponDiscount,
      termsAgreedAt: new Date(),
      countryCode: billingData.country || '',
      locale,
    });

    // Increment coupon usage
    if (appliedCouponCode) {
      await applyCoupon(appliedCouponCode);
    }

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
            totalAmount: payAmount,
            fullAmount: amountAfterDiscount,
            remainingAmount: isPartialPayment
              ? amountAfterDiscount - payAmount
              : 0,
            isPartialPayment,
            couponDiscount,
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
            (locale === 'ar' ? product.content?.ar : product.content?.en)
              ?.replace(/<[^>]*>/g, '')
              .slice(0, 160)
              .trim() || (locale === 'ar' ? product.name.ar : product.name.en),
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
          totalAmount: payAmount,
          fullAmount: amountAfterDiscount,
          remainingAmount: isPartialPayment
            ? amountAfterDiscount - payAmount
            : 0,
          isPartialPayment,
          couponDiscount,
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
