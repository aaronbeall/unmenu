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

    // Check if cancelled after OCR
    const scanAfterOCR = await prisma.scan.findUnique({ where: { id: scanId } });
    if (scanAfterOCR && scanAfterOCR.status === 'failed') {
      console.log(`Scan ${scanId} was cancelled after OCR`);
      return;
    }

    await prisma.scan.update({
      where: { id: scanId },
      data: { ocr_text: ocrText, progress: 30 },
    });

    // Simulate progress during AI processing (which takes 10-30 seconds)
    // Also check if scan was cancelled
    let isCancelled = false;
    const progressInterval = setInterval(async () => {
      const currentScan = await prisma.scan.findUnique({ where: { id: scanId } });
      
      // Check if scan was cancelled (status changed to failed by cancel endpoint)
      if (currentScan && currentScan.status === 'failed') {
        isCancelled = true;
        clearInterval(progressInterval);
        return;
      }
      
      if (currentScan && currentScan.progress < 85) {
        await prisma.scan.update({
          where: { id: scanId },
          data: { progress: Math.min(85, currentScan.progress + 10) },
        });
      }
    }, 3000); // Update every 3 seconds

    try {
      // Process with AI
      const processedMenu = await processMenuWithAI(base64Image, mimeType, ocrText, userLanguage, subscriptionTier);
      clearInterval(progressInterval);
      
      // If cancelled during processing, don't save results
      if (isCancelled) {
        console.log(`Scan ${scanId} was cancelled, skipping result save`);
        return;
      }

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
    } catch (aiError) {
      clearInterval(progressInterval);
      throw aiError;
    }
  } catch (error) {
    console.error('Scan processing error:', error);
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        progress: 0,
      },
    });
  }
}
