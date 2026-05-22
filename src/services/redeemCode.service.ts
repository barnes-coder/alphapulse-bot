import crypto from 'crypto';
import { SubscriptionPlan } from '@prisma/client';
import { RedeemCodeRepository } from '../database/repositories/redeemCode.repository';
import { SubscriptionService } from './subscription.service';

export class RedeemCodeService {
  constructor(
    private readonly redeemCodes: RedeemCodeRepository,
    private readonly subscriptions: SubscriptionService
  ) {}

  private codeFor(plan: SubscriptionPlan) {
    const prefix = plan === SubscriptionPlan.PREMIUM ? 'PREM' : plan === SubscriptionPlan.PRO ? 'PRO' : 'FREE';
    const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}-${suffix}`;
  }

  async generateCodes(createdById: string, plan: SubscriptionPlan, days: number, count = 1) {
    const codes = [] as string[];
    for (let i = 0; i < Math.max(1, count); i += 1) {
      const code = this.codeFor(plan);
      await this.redeemCodes.create(code, plan, days, createdById);
      codes.push(code);
    }
    return codes;
  }

  async redeemCode(userId: string, code: string) {
    const normalized = code.trim().toUpperCase();
    const record = await this.redeemCodes.findActiveByCode(normalized);
    if (!record) {
      return { ok: false, reason: 'That redemption code is invalid or has already been used.' };
    }

    await this.subscriptions.grant(userId, record.plan, record.days);
    await this.redeemCodes.markRedeemed(record.id, userId);

    return {
      ok: true,
      plan: record.plan,
      days: record.days
    };
  }

  listActiveCodes() {
    return this.redeemCodes.listActive();
  }
}
