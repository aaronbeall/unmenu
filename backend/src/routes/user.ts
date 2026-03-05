import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { refreshFreeTierScanQuota } from '../services/scanQuotaService';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const existingUser = await prisma.user.findUnique({ where: { id: userId } });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await refreshFreeTierScanQuota(prisma, existingUser);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        subscription_tier: user.subscription_tier,
        scans_remaining: user.scans_remaining,
        scans_reset_at: user.scans_reset_at,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

router.post('/upgrade', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        subscription_tier: 'pro',
        scans_remaining: parseInt(process.env.PRO_TIER_SCANS || '35'),
      },
    });

    res.json({
      message: 'Upgraded to Pro successfully',
      user: {
        id: user.id,
        subscription_tier: user.subscription_tier,
        scans_remaining: user.scans_remaining,
      },
    });
  } catch (error) {
    console.error('Upgrade error:', error);
    res.status(500).json({ error: 'Failed to upgrade' });
  }
});

export default router;
