import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { createPayment } from '@/lib/easykash';
import { validateCoupon, applyCoupon } from '@/lib/coupon';
import { trackInitiateCheckout } from '@/lib/fb-capi';

export const runtime = 'nodejs'; // uses mongoose + Node.js crypto

/**
 * POST /api/payment/checkout
 *
 * Creates a new order and initiates an EasyKash payment session.
 * Returns the EasyKash redirect URL for the customer.
 *
 * Body:
 * {
 *   productId: string,
 *   quantity?: number,
 *   currency: string,
 *   billingData: { fullName, email, phone, country },
 *   locale?: string,
 *   couponCode?: string,
 *   referralId?: string,
 *   sizeIndex?: number,
 *   paymentOption?: 'full' | 'half' | 'custom',
 *   customPaymentAmount?: number,
 *   termsAgreed?: boolean,
 *   notes?: string,
 *   source?: 'manasik' | 'ghadaq',
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
      referralId,
      sizeIndex,
      paymentOption = 'full',
      customPaymentAmount,
      termsAgreed,
      notes,
      source,
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

    if (!billingData.fullName || !billingData.email || !billingData.phone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Billing data must include: fullName, email, phone',
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

    // Always use sizes — sizeIndex defaults to 0
    const activeSizeIndex =
      sizeIndex !== undefined &&
      sizeIndex !== null &&
      sizeIndex >= 0 &&
      sizeIndex < product.sizes.length
        ? sizeIndex
        : 0;
    const selectedSize = product.sizes[activeSizeIndex];
    let unitPrice = selectedSize.price ?? 0;

    const sizeCurrencyPrice = selectedSize.prices?.find(
      (p: { currencyCode: string; amount: number }) =>
        p.currencyCode === currencyUpper,
    );
    if (sizeCurrencyPrice) {
      unitPrice = sizeCurrencyPrice.amount;
    } else if (product.baseCurrency !== currencyUpper) {
      return NextResponse.json(
        {
          success: false,
          error: `Price not available in ${currencyUpper}. Available in: ${product.baseCurrency}`,
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
      isPartialPayment = true;
      payAmount = Math.ceil(amountAfterDiscount / 2);
    } else if (paymentOption === 'custom' && customPaymentAmount) {
      if (!product.partialPayment?.isAllowed) {
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
      const minimumPaymentType =
        product.partialPayment?.minimumType || 'percentage';
      const currencyMinimum = product.partialPayment?.minimumPayments?.find(
        (mp: { currencyCode: string; value: number }) =>
          mp.currencyCode === currencyUpper,
      );

      if (currencyMinimum) {
        if (minimumPaymentType === 'percentage') {
          minPayment = Math.ceil(
            (amountAfterDiscount * currencyMinimum.value) / 100,
          );
        } else {
          minPayment = currencyMinimum.value;
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
        fullName: billingData.fullName,
        email: billingData.email,
        phone: billingData.phone,
        country: billingData.country || 'N/A',
      },
      referralId: referralId || undefined,
      couponCode: appliedCouponCode,
      couponDiscount,
      termsAgreedAt: new Date(),
      notes: notes || undefined,
      source: source === 'ghadaq' ? 'ghadaq' : 'manasik',
      countryCode: billingData.country || '',
      locale,
    });

    // Increment coupon usage
    if (appliedCouponCode) {
      await applyCoupon(appliedCouponCode);
    }

    // ── FB Conversions API: InitiateCheckout (fire-and-forget) ───────────────
    const reqIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '';
    const reqUa = request.headers.get('user-agent') || '';

    trackInitiateCheckout({
      productId: product._id.toString(),
      productName: product.name.en || product.name.ar,
      value: payAmount,
      currency: currencyUpper,
      numItems: quantity,
      sourceUrl: `${process.env.BASE_URL || 'https://www.manasik.net'}/checkout`,
      userData: {
        em: billingData.email,
        ph: billingData.phone,
        fn: billingData.fullName.split(' ')[0],
        ln:
          billingData.fullName.split(' ').slice(1).join(' ') ||
          billingData.fullName.split(' ')[0],
        country: billingData.country,
        client_ip_address: reqIp,
        client_user_agent: reqUa,
        external_id: order._id.toString(),
      },
    }).catch(() => {});

    // ── EasyKash payment ─────────────────────────────────────────────────

    if (!process.env.EASYKASH_API_KEY) {
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

    const baseUrl = process.env.BASE_URL || 'https://www.manasik.net';

    // EasyKash only accepts these currencies; convert to EGP (using the
    // product's actual EGP price) when the user's currency isn't supported
    const EASYKASH_CURRENCIES = ['EGP', 'USD', 'SAR', 'EUR'];
    let easykashAmount = payAmount;
    let paymentCurrency = currencyUpper;

    if (!EASYKASH_CURRENCIES.includes(currencyUpper)) {
      // Look up the real EGP price for this size from the product's price list
      const egpPriceEntry = selectedSize.prices?.find(
        (p: { currencyCode: string; amount: number }) =>
          p.currencyCode === 'EGP',
      );
      const egpUnitPrice = egpPriceEntry?.amount ?? unitPrice;
      const egpTotal = egpUnitPrice * quantity;
      // Apply the same coupon discount ratio
      const couponRatio = totalAmount > 0 ? couponDiscount / totalAmount : 0;
      const egpAfterDiscount = egpTotal - egpTotal * couponRatio;
      // Apply the same partial-payment ratio
      const payRatio =
        amountAfterDiscount > 0 ? payAmount / amountAfterDiscount : 1;
      easykashAmount = Math.round(egpAfterDiscount * payRatio * 100) / 100;
      paymentCurrency = 'EGP';
    }

    const easykashResponse = await createPayment({
      amount: easykashAmount,
      currency: paymentCurrency,
      name: billingData.fullName,
      email: billingData.email,
      mobile: billingData.phone,
      redirectUrl: `${baseUrl}/payment/status?orderNumber=${order.orderNumber}`,
      customerReference: order.orderNumber,
    });

    // Update order status to processing
    order.status = 'processing';
    await order.save();

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
        checkoutUrl: easykashResponse.redirectUrl,
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
