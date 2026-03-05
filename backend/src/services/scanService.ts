import { PrismaClient } from '@prisma/client';
import { extractTextFromImage } from './ocrService';
import { processMenuWithAI } from './aiService';
import { computeContentHash } from './uploadService';

const prisma = new PrismaClient();

export async function processMenuScan(
  scanId: string,
  base64Image: string,
  mimeType: string,
  userLanguage: string,
  subscriptionTier: string,
  userId: string
): Promise<void> {
  try {
    await prisma.scan.update({
      where: { id: scanId },
      data: { status: 'processing', progress: 10 },
    });

    // Extract text from base64 image
    const dataUrl = `data:${mimeType};base64,${base64Image}`;
    const ocrText = await extractTextFromImage(dataUrl);

    await prisma.scan.update({
      where: { id: scanId },
      data: { ocr_text: ocrText, progress: 40 },
    });

    // Process with AI
    const processedMenu = await processMenuWithAI(base64Image, mimeType, ocrText, userLanguage, subscriptionTier);

    // Compute content hash of the processed menu
    const contentHash = computeContentHash(processedMenu);

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        processed_menu: processedMenu,
        content_hash: contentHash,
        status: 'completed',
        progress: 100,
        completed_at: new Date(),
      },
    });

    // Decrement scan count for free users ONLY after successful processing
    if (subscriptionTier === 'free') {
      await prisma.user.update({
        where: { id: userId },
        data: { scans_remaining: { decrement: 1 } },
      });
    }

    // Cache the processed menu by content hash
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.cachedMenu.upsert({
      where: { content_hash: contentHash },
      create: {
        content_hash: contentHash,
        processed_menu: processedMenu,
        expires_at: expiresAt,
      },
      update: {
        processed_menu: processedMenu,
        hit_count: { increment: 1 },
        expires_at: expiresAt,
      },
    });
  } catch (error) {
    console.error('Scan processing error:', error);
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
