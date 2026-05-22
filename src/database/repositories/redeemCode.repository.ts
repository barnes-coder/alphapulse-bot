import { PrismaClient, SubscriptionPlan } from '@prisma/client';

export class RedeemCodeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(code: string, plan: SubscriptionPlan, days: number, createdById: string) {
    return this.prisma.redeemCode.create({
      data: {
        code,
        plan,
        days,
        createdById
      }
    });
  }

  findActiveByCode(code: string) {
    return this.prisma.redeemCode.findFirst({
      where: { code, isActive: true }
    });
  }

  listActive() {
    return this.prisma.redeemCode.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  markRedeemed(id: string, redeemedById: string) {
    return this.prisma.redeemCode.update({
      where: { id },
      data: { isActive: false, redeemedById, redeemedAt: new Date() }
    });
  }
}
