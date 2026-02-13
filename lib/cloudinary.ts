/**
 * Cloudinary image upload service.
 *
 * Provides utilities for uploading and managing images in Cloudinary.
 *
 * Required ENV variables:
 * - CLOUDINARY_CLOUD_NAME: Your Cloudinary cloud name
 * - CLOUDINARY_API_KEY: Your Cloudinary API key
 * - CLOUDINARY_API_SECRET: Your Cloudinary API secret
 */

import { v2 as cloudinary } from 'cloudinary';

// ─── Configuration ───────────────────────────────────────────────

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Types ───────────────────────────────────────────────────────

export interface CloudinaryUploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
}

// ─── Upload Functions ────────────────────────────────────────────

/**
 * Upload an image to Cloudinary from a base64 string or file
 * @param file - Base64 encoded image string or file buffer
 * @param folder - Optional folder name in Cloudinary (default: 'products')
 * @param publicId - Optional custom public ID for the image
 * @returns Upload result with URL and public ID
 */
export async function uploadImage(
  file: string,
  folder: string = 'products',
  publicId?: string,
): Promise<CloudinaryUploadResult> {
  try {
    // Validate environment variables
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      console.error(
        'Cloudinary credentials are missing in environment variables',
      );
      return {
        success: false,
        error: 'Cloudinary configuration is missing',
      };
    }

    // Upload options
    const uploadOptions: Record<string, unknown> = {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 1000, height: 1000, crop: 'limit' }, // Max dimensions
        { quality: 'auto' }, // Auto quality
        { fetch_format: 'auto' }, // Auto format (WebP, etc.)
      ],
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file, uploadOptions);

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload image',
    };
  }
}

/**
 * Delete an image from Cloudinary
 * @param publicId - The public ID of the image to delete
 * @returns Success status
 */
export async function deleteImage(
  publicId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!publicId) {
      return { success: false, error: 'Public ID is required' };
    }

    await cloudinary.uploader.destroy(publicId);

    return { success: true };
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete image',
    };
  }
}

/**
 * Extract public ID from Cloudinary URL
 * @param url - Cloudinary image URL
 * @returns Public ID or null
 */
export function extractPublicId(url: string): string | null {
  try {
    // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/products/sample.jpg
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
}

/**
 * Validate if the URL is a Cloudinary URL
 * @param url - URL to validate
 * @returns Boolean indicating if URL is from Cloudinary
 */
export function isCloudinaryUrl(url: string): boolean {
  return url.includes('res.cloudinary.com');
}

export default cloudinary;
