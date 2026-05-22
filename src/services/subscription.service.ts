import { SubscriptionPlan } from '@prisma/client';
import { env } from '../config/env';
import { SubscriptionRepository } from '../database/repositories/subscription.repository';
import { env } from '../config/env';

export class SubscriptionService {
  constructor(private readonly subscriptions: SubscriptionRepository) {}

  async isPremium(userId: string): Promise<boolean> {
    return this.subscriptions.isPremium(userId);
  }

  async walletLimit(userId: string): Promise<number> {
    return (await this.isPremium(userId)) ? Number.MAX_SAFE_INTEGER : env.FREE_WALLET_LIMIT;
  }

  async grant(userId: string, plan: SubscriptionPlan, days = 30) {
    return this.subscriptions.grant(userId, plan, days);
  }

  grantPremium(userId: string, days = 30) {
    return this.grant(userId, SubscriptionPlan.PREMIUM, days);
  }
}
