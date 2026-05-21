import { AlertType, PrismaClient } from '@prisma/client';

export class AlertRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(input: {
    userId: string;
    walletId?: string;
    type: AlertType;
    title: string;
    message: string;
    metadata?: object;
    sentAt?: Date;
  }) {
    return this.prisma.alert.create({ data: input });
  }

  recentForUser(userId: string, limit = 10) {
    return this.prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}
