/**
 * Compress an image File to a data URL if it exceeds the given threshold.
 *
 * - If the file is smaller than `thresholdBytes`, it is returned as-is
 *   (read directly as a data URL — no re-encoding).
 * - If the file is larger, it is drawn onto a canvas and re-encoded as
 *   JPEG at the given quality level. The max dimension is capped at
 *   `maxDimension` px (preserving aspect ratio) to further reduce size.
 *
 * @returns A data URL string (either the original or the compressed version).
 */
export async function compressImageToDataUrl(
  file: File,
  thresholdBytes: number = 500 * 1024, // 500 KB
  maxDimension: number = 1920,
  quality: number = 0.8,
): Promise<string> {
  // Small files — just read directly, no compression needed
  if (file.size <= thresholdBytes) {
    return fileToDataUrl(file);
  }

  // Load the image into an HTMLImageElement
  const img = await loadImage(file);

  // Calculate scaled dimensions (preserve aspect ratio)
  let { width, height } = img;
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  // Draw to canvas and export as JPEG
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Canvas not available — fall back to raw data URL
    return fileToDataUrl(file);
  }
  ctx.drawImage(img, 0, 0, width, height);

  // Try progressively lower quality until under threshold, min 0.3
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  let currentQuality = quality;
  while (dataUrl.length > thresholdBytes * 1.5 && currentQuality > 0.3) {
    currentQuality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', currentQuality);
  }

  return dataUrl;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
