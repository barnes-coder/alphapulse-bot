import { PrismaClient, SubscriptionPlan } from '@prisma/client';

export class SubscriptionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async activeForUser(userId: string) {
    const now = new Date();
    return this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async isPremium(userId: string): Promise<boolean> {
    const subscription = await this.activeForUser(userId);
    return subscription?.plan === 'PREMIUM' || subscription?.plan === 'PRO';
  }

  grant(userId: string, plan: SubscriptionPlan, days: number) {
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return this.prisma.subscription.create({
      data: { userId, plan, status: 'ACTIVE', expiresAt }
    });
  }

  expireOldSubscriptions() {
    return this.prisma.subscription.updateMany({
      where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED' }
    });
  }
}
