import { PrismaClient } from '@prisma/client';
import { processMenuWithAI } from './aiService';
import { computeContentHash } from './uploadService';
import { preloadMenuImages } from './dishImageService';

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

    // Check if cancelled early
    const scanCheck = await prisma.scan.findUnique({ where: { id: scanId } });
    if (scanCheck && scanCheck.status === 'failed') {
      console.log(`Scan ${scanId} was cancelled before processing`);
      return;
    }

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
      
      if (currentScan && currentScan.progress < 90) {
        await prisma.scan.update({
          where: { id: scanId },
          data: { progress: Math.min(90, currentScan.progress + 15) },
        });
      }
    }, 3000); // Update every 3 seconds

    try {
      // Process with AI (single call now - no separate OCR step)
      const processedMenu = await processMenuWithAI(base64Image, mimeType, userLanguage, subscriptionTier);
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

      // Preload dish images in the background (don't await)
      preloadMenuImages(processedMenu).catch(err => 
        console.error('Image preload error:', err)
      );
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
