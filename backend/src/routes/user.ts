import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        subscription_tier: true,
        scans_remaining: true,
        scans_reset_at: true,
        created_at: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
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
        scans_remaining: parseInt(process.env.PRO_TIER_SCANS || '999999'),
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
