import { SubscriptionPlan } from '@prisma/client';
import { env } from '../config/env';
import { SubscriptionRepository } from '../database/repositories/subscription.repository';

export class SubscriptionService {
  constructor(private readonly subscriptions: SubscriptionRepository) {}

  async isPremium(userId: string): Promise<boolean> {
    return this.subscriptions.isPremium(userId);
  }

  async walletLimit(userId: string): Promise<number> {
    return (await this.isPremium(userId)) ? env.PREMIUM_WALLET_LIMIT : env.FREE_WALLET_LIMIT;
  }

  grantPremium(userId: string, days = 30) {
    return this.subscriptions.grant(userId, SubscriptionPlan.PREMIUM, days);
  }
}
