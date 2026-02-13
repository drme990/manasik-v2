import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product, { IProduct } from '@/models/Product';
import { requireAuth } from '@/lib/auth-middleware';
import { logActivity } from '@/lib/logger';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    // Connect to database
    await dbConnect();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const inStock = searchParams.get('inStock');

    // Build query
    const query: Partial<Pick<IProduct, 'inStock'>> = {};
    if (inStock !== null) {
      query.inStock = inStock === 'true';
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Fetch products with pagination
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Product.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Return response
    return NextResponse.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: page,
          totalPages,
          totalProducts: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products',
      },
      { status: 500 },
    );
  }
}

async function createProductHandler(
  request: NextRequest,
  context: { user: { userId: string; email: string } },
) {
  try {
    // Connect to database
    await dbConnect();

    // Parse request body
    const body: Omit<IProduct, '_id' | 'createdAt' | 'updatedAt'> =
      await request.json();

    // Validate required fields
    const { name, description, price, currency } = body;
    if (
      !name?.ar ||
      !name?.en ||
      !description?.ar ||
      !description?.en ||
      price === undefined ||
      !currency
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing required fields: name.ar, name.en, description.ar, description.en, price, currency',
        },
        { status: 400 },
      );
    }

    // Create new product
    const product = await Product.create(body);

    // Log activity
    const adminUser = await User.findById(context.user.userId);
    await logActivity({
      userId: context.user.userId,
      userName: adminUser?.name || '',
      userEmail: context.user.email,
      action: 'create',
      resource: 'product',
      resourceId: product._id.toString(),
      details: `Created product ${product.name.ar} (${product.price} ${product.currency})`,
    });

    // Return response
    return NextResponse.json(
      {
        success: true,
        data: product,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create product',
      },
      { status: 500 },
    );
  }
}

export const POST = requireAuth(createProductHandler);
