import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import {
  uploadImage,
  deleteImage,
  extractPublicId,
  isCloudinaryUrl,
} from '@/lib/cloudinary';
import { logActivity } from '@/lib/logger';

/**
 * POST /api/upload/image
 * Upload an image to Cloudinary
 * Protected route - requires authentication
 */
async function uploadImageHandler(
  request: NextRequest,
  context: { user: { userId: string; email: string } },
) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'products';
    const oldImageUrl = formData.get('oldImageUrl') as string;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided',
        },
        { status: 400 },
      );
    }

    // Validate file type
    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.',
        },
        { status: 400 },
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: 'File size exceeds 5MB limit',
        },
        { status: 400 },
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Upload to Cloudinary
    const uploadResult = await uploadImage(base64, folder);

    if (!uploadResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: uploadResult.error || 'Failed to upload image',
        },
        { status: 500 },
      );
    }

    // Delete old image if exists and is from Cloudinary
    if (oldImageUrl && isCloudinaryUrl(oldImageUrl)) {
      const publicId = extractPublicId(oldImageUrl);
      if (publicId) {
        await deleteImage(publicId);
      }
    }

    // Log activity
    await logActivity({
      userId: context.user.userId,
      userName: context.user.name,
      userEmail: context.user.email,
      action: 'upload',
      resource: 'image',
      details: `Uploaded image to ${folder}: ${uploadResult.publicId}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
      },
    });
  } catch (error) {
    console.error('Error handling image upload:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/upload/image
 * Delete an image from Cloudinary
 * Protected route - requires authentication
 */
async function deleteImageHandler(
  request: NextRequest,
  context: { user: { userId: string; email: string } },
) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Image URL is required',
        },
        { status: 400 },
      );
    }

    // Check if it's a Cloudinary URL
    if (!isCloudinaryUrl(imageUrl)) {
      return NextResponse.json(
        {
          success: false,
          error: 'URL is not a Cloudinary image',
        },
        { status: 400 },
      );
    }

    // Extract public ID
    const publicId = extractPublicId(imageUrl);
    if (!publicId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Could not extract public ID from URL',
        },
        { status: 400 },
      );
    }

    // Delete from Cloudinary
    const deleteResult = await deleteImage(publicId);

    if (!deleteResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: deleteResult.error || 'Failed to delete image',
        },
        { status: 500 },
      );
    }

    // Log activity
    await logActivity({
      userId: context.user.userId,
      userName: context.user.name,
      userEmail: context.user.email,
      action: 'delete',
      resource: 'image',
      details: `Deleted image: ${publicId}`,
    });

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('Error handling image deletion:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}

// Export wrapped handlers
export const POST = requireAuth(uploadImageHandler);
export const DELETE = requireAuth(deleteImageHandler);
