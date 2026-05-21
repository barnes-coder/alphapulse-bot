import { PrismaClient } from '@prisma/client';

export class WalletRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(userId: string, address: string, label?: string) {
    return this.prisma.trackedWallet.create({ data: { userId, address, label } });
  }

  listByUser(userId: string) {
    return this.prisma.trackedWallet.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  countByUser(userId: string) {
    return this.prisma.trackedWallet.count({ where: { userId, isActive: true } });
  }

  remove(userId: string, address: string) {
    return this.prisma.trackedWallet.updateMany({ where: { userId, address }, data: { isActive: false } });
  }

  activeWallets() {
    return this.prisma.trackedWallet.findMany({
      where: { isActive: true, user: { isBanned: false } },
      include: { user: { include: { subscriptions: true, alertSettings: true } } }
    });
  }

  updateLastSignature(id: string, signature: string) {
    return this.prisma.trackedWallet.update({ where: { id }, data: { lastSignature: signature } });
  }
}
