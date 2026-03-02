import express from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth';
import { scanLimiter } from '../middleware/rateLimiter';
import { uploadImage } from '../services/uploadService';
import { processMenuScan } from '../services/scanService';
import { PrismaClient } from '@prisma/client';

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

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.scans_remaining <= 0 && user.subscription_tier === 'free') {
      return res.status(403).json({ 
        error: 'No scans remaining',
        message: 'Please upgrade to Pro for unlimited scans'
      });
    }

    const { imageUrl, imageHash } = await uploadImage(file.buffer);

    const cachedMenu = await prisma.cachedMenu.findUnique({
      where: { image_hash: imageHash },
    });

    if (cachedMenu && new Date(cachedMenu.expires_at) > new Date()) {
      await prisma.cachedMenu.update({
        where: { id: cachedMenu.id },
        data: { hit_count: { increment: 1 } },
      });

      const scan = await prisma.scan.create({
        data: {
          user_id: userId,
          image_hash: imageHash,
          image_url: imageUrl,
          status: 'completed',
          progress: 100,
          processed_menu: cachedMenu.processed_menu,
        },
      });

      if (user.subscription_tier === 'free') {
        await prisma.user.update({
          where: { id: userId },
          data: { scans_remaining: { decrement: 1 } },
        });
      }

      return res.json({
        scan_id: scan.id,
        status: 'completed',
        progress: 100,
        menu: cachedMenu.processed_menu,
      });
    }

    const scan = await prisma.scan.create({
      data: {
        user_id: userId,
        image_hash: imageHash,
        image_url: imageUrl,
        status: 'processing',
        progress: 0,
      },
    });

    processMenuScan(scan.id, imageUrl, userLanguage, user.subscription_tier).catch(console.error);

    if (user.subscription_tier === 'free') {
      await prisma.user.update({
        where: { id: userId },
        data: { scans_remaining: { decrement: 1 } },
      });
    }

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

export default router;
