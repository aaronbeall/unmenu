import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

interface RevenueCatWebhookPayload {
  event?: {
    type?: string;
    app_user_id?: string;
    entitlement_ids?: string[];
    expiration_at_ms?: number;
    store?: string;
    product_id?: string;
    transaction_id?: string;
  };
}

function isProEntitlement(event: RevenueCatWebhookPayload['event']): boolean {
  const entitlements = event?.entitlement_ids ?? [];
  return entitlements.includes('pro');
}

function eventIndicatesActive(eventType: string): boolean {
  return [
    'INITIAL_PURCHASE',
    'NON_RENEWING_PURCHASE',
    'RENEWAL',
    'UNCANCELLATION',
    'SUBSCRIPTION_EXTENDED',
    'PRODUCT_CHANGE',
  ].includes(eventType);
}

function eventIndicatesInactive(eventType: string): boolean {
  return ['EXPIRATION', 'REFUND', 'SUBSCRIPTION_PAUSED'].includes(eventType);
}

router.post('/revenuecat/webhook', async (req, res) => {
  try {
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized webhook' });
    }

    const payload = req.body as RevenueCatWebhookPayload;
    const event = payload.event;

    if (!event?.app_user_id || !event.type) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const user = await prisma.user.findUnique({ where: { id: event.app_user_id } });
    if (!user) {
      return res.status(200).json({ received: true, ignored: 'user-not-found' });
    }

    const expirationDate = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
    const now = new Date();
    const hasProEntitlement = isProEntitlement(event);

    let nextTier = user.subscription_tier;
    if (hasProEntitlement && eventIndicatesActive(event.type)) {
      nextTier = 'pro';
    } else if (eventIndicatesInactive(event.type)) {
      if (!expirationDate || expirationDate <= now) {
        nextTier = 'free';
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscription_tier: nextTier,
        subscription_source: event.store ?? user.subscription_source ?? 'google_play',
        subscription_expires_at: expirationDate ?? user.subscription_expires_at,
        revenuecat_app_user_id: event.app_user_id,
        ...(nextTier === 'pro'
          ? { scans_remaining: parseInt(process.env.PRO_TIER_SCANS || '35', 10) }
          : {}),
      },
    });

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('RevenueCat webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

router.get('/subscription', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      subscription: {
        tier: user.subscription_tier,
        source: user.subscription_source,
        expires_at: user.subscription_expires_at,
      },
      management: {
        cancel_instructions:
          user.subscription_source === 'app_store'
            ? 'Cancel in Apple App Store subscriptions settings.'
            : 'Cancel in Google Play subscriptions settings.',
      },
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    return res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

export default router;
