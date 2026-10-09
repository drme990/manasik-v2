/**
 * Whether Next.js may resize and re-encode this image (smaller AVIF/WebP at the size shown). Only the hosts listed in
 * next.config.ts `images.remotePatterns` and the site's own files: any other host would make <Image> throw, so it is
 * shown as it is.
 */
export function canOptimizeImage(src: string): boolean {
  if (src.startsWith('/')) return true;
  try {
    const host = new URL(src).hostname;
    return host === 'storage.manasik.net' || host === 'res.cloudinary.com';
  } catch {
    return false;
  }
}
