import { PrismaClient } from '@prisma/client';
import { extractTextFromImage } from './ocrService';
import { processMenuWithAI } from './aiService';

const prisma = new PrismaClient();

export async function processMenuScan(
  scanId: string,
  imageUrl: string,
  userLanguage: string,
  subscriptionTier: string
): Promise<void> {
  try {
    await prisma.scan.update({
      where: { id: scanId },
      data: { status: 'processing', progress: 10 },
    });

    const ocrText = await extractTextFromImage(imageUrl);

    await prisma.scan.update({
      where: { id: scanId },
      data: { ocr_text: ocrText, progress: 40 },
    });

    const processedMenu = await processMenuWithAI(imageUrl, ocrText, userLanguage, subscriptionTier);

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        processed_menu: processedMenu,
        status: 'completed',
        progress: 100,
        completed_at: new Date(),
      },
    });

    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    if (scan) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await prisma.cachedMenu.upsert({
        where: { image_hash: scan.image_hash },
        create: {
          image_hash: scan.image_hash,
          processed_menu: processedMenu,
          expires_at: expiresAt,
        },
        update: {
          processed_menu: processedMenu,
          hit_count: { increment: 1 },
          expires_at: expiresAt,
        },
      });
    }
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
