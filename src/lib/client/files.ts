import {
  ALLOWED_UPLOAD_TYPES,
  DEFAULT_MAX_UPLOAD_MB,
  IMAGE_JPEG_QUALITY,
  IMAGE_MAX_DIMENSION_PX,
} from '@/lib/constants';

/** Friendly message when a chosen file cannot be used, or null when it is fine. */
export function checkFile(
  file: { type: string; size: number },
  maxMb: number = DEFAULT_MAX_UPLOAD_MB,
): string | null {
  if (!(ALLOWED_UPLOAD_TYPES as readonly string[]).includes(file.type)) {
    return 'We can only read JPG, PNG, WEBP photos and PDF files. Please choose another file.';
  }
  if (file.size === 0) return 'This file is empty. Please choose another file.';
  if (file.size > maxMb * 1024 * 1024) {
    return `The file is too large. Please use a file under ${maxMb} MB.`;
  }
  return null;
}

/** Scales a size down so the longer side is at most `max`, keeping the shape. */
export function fitWithin(
  width: number,
  height: number,
  max: number = IMAGE_MAX_DIMENSION_PX,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Shrinks a photo in the browser before upload: faster for the user and smaller for the server.
 * PDFs and anything that cannot be decoded are returned untouched. If the result would be
 * larger than the original, the original is kept.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', IMAGE_JPEG_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
