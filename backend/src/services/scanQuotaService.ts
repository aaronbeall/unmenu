import { PrismaClient, User } from '@prisma/client';

function hasMonthElapsed(lastResetAt: Date, now: Date): boolean {
  const nextResetAt = new Date(lastResetAt);
  nextResetAt.setMonth(nextResetAt.getMonth() + 1);
  return now >= nextResetAt;
}

export async function refreshFreeTierScanQuota(
  prisma: PrismaClient,
  user: User
): Promise<User> {
  if (user.subscription_tier !== 'free') {
    return user;
  }

  const now = new Date();
  if (!hasMonthElapsed(user.scans_reset_at, now)) {
    return user;
  }

  const monthlyFreeScans = parseInt(process.env.FREE_TIER_MONTHLY_SCANS || '1', 10);

  return prisma.user.update({
    where: { id: user.id },
    data: {
      scans_remaining: monthlyFreeScans,
      scans_reset_at: now,
    },
  });
}
