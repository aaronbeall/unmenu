import express from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth';
import { scanLimiter } from '../middleware/rateLimiter';
import { processImage, computeContentHash } from '../services/uploadService';
import { processMenuScan } from '../services/scanService';
import { PrismaClient } from '@prisma/client';
import { refreshFreeTierScanQuota } from '../services/scanQuotaService';

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/upload', authenticate, scanLimiter, upload.single('image'), async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const file = req.file;
    const userLanguage = req.body.user_language || 'en';

    if (!file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await refreshFreeTierScanQuota(prisma, existingUser);

    if (user.scans_remaining <= 0 && user.subscription_tier === 'free') {
      return res.status(403).json({ 
        error: 'No scans remaining',
        message: 'Please upgrade to Pro for more scans'
      });
    }

    // Process image to base64
    const { base64Image, mimeType } = await processImage(file.buffer);

    // Create a temporary scan record
    const scan = await prisma.scan.create({
      data: {
        user_id: userId,
        content_hash: '', // Will be set after processing
        status: 'processing',
        progress: 0,
      },
    });

    // Process menu scan asynchronously
    processMenuScan(scan.id, base64Image, mimeType, userLanguage, user.subscription_tier, userId).catch(console.error);

    res.json({
      scan_id: scan.id,
      status: 'processing',
      progress: 0,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.get('/status/:scanId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { scanId } = req.params;
    const userId = req.userId!;

    const scan = await prisma.scan.findFirst({
      where: { id: scanId, user_id: userId },
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    res.json({
      scan_id: scan.id,
      status: scan.status,
      progress: scan.progress,
      menu: scan.processed_menu,
      error: scan.error_message,
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to get scan status' });
  }
});

router.post('/cancel/:scanId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { scanId } = req.params;
    const userId = req.userId!;

    const scan = await prisma.scan.findFirst({
      where: { id: scanId, user_id: userId },
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    // Only cancel if still processing
    if (scan.status === 'processing') {
      await prisma.scan.update({
        where: { id: scanId },
        data: {
          status: 'failed',
          error_message: 'Cancelled by user',
          progress: 0,
        },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel scan' });
  }
});

export default router;
