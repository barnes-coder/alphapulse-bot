import { PrismaClient, User } from '@prisma/client';
import crypto from 'crypto';
import { adminTelegramIds } from '../../config/env';

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertTelegramUser(input: {
    telegramId: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    referredByCode?: string;
  }): Promise<User> {
    const telegramId = BigInt(input.telegramId);
    const existing = await this.prisma.user.findUnique({ where: { telegramId } });
    const referrer = input.referredByCode
      ? await this.prisma.user.findUnique({ where: { referralCode: input.referredByCode } })
      : null;

    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          username: input.username,
          firstName: input.firstName,
          lastName: input.lastName,
          isAdmin: existing.isAdmin || adminTelegramIds.has(String(input.telegramId))
        }
      });
    }

    const user = await this.prisma.user.create({
      data: {
        telegramId,
        username: input.username,
        firstName: input.firstName,
        lastName: input.lastName,
        referralCode: this.createReferralCode(input.telegramId),
        referredById: referrer?.id,
        isAdmin: adminTelegramIds.has(String(input.telegramId)),
        alertSettings: { create: {} },
        subscriptions: { create: { plan: 'FREE', status: 'ACTIVE' } }
      }
    });

    if (referrer && referrer.id !== user.id) {
      await this.prisma.referral.create({
        data: { referrerUserId: referrer.id, referredUserId: user.id }
      });
    }

    return user;
  }

  findByTelegramId(telegramId: number | string) {
    return this.prisma.user.findUnique({ where: { telegramId: BigInt(telegramId) } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async setBanned(userId: string, isBanned: boolean) {
    return this.prisma.user.update({ where: { id: userId }, data: { isBanned } });
  }

  async allActiveTelegramUsers() {
    return this.prisma.user.findMany({ where: { isBanned: false }, select: { telegramId: true } });
  }

  async stats() {
    const [users, premium, wallets, alerts] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.subscription.count({ where: { status: 'ACTIVE', plan: { in: ['PREMIUM', 'PRO'] } } }),
      this.prisma.trackedWallet.count({ where: { isActive: true } }),
      this.prisma.alert.count()
    ]);
    return { users, premium, wallets, alerts };
  }

  private createReferralCode(telegramId: number): string {
    return `AP${telegramId.toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }
}
