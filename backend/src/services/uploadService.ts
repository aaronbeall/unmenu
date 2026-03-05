import sharp from 'sharp';
import crypto from 'crypto';

/**
 * Process image for OpenAI Vision API
 * Returns base64 encoded JPEG and a hash of the content
 */
export async function processImage(buffer: Buffer): Promise<{ base64Image: string; mimeType: string }> {
  const processedImage = await sharp(buffer)
    .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const base64Image = processedImage.toString('base64');
  return { base64Image, mimeType: 'image/jpeg' };
}

/**
 * Compute content hash of processed menu JSON
 * Used for deduplication and caching
 */
export function computeContentHash(processedMenu: any): string {
  const jsonString = JSON.stringify(processedMenu);
  return crypto.createHash('sha256').update(jsonString).digest('hex');
}
