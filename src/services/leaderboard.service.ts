import { PrismaClient } from '@prisma/client';

export class LeaderboardService {
  constructor(private readonly prisma: PrismaClient) {}

  topUsers(limit = 10) {
    return this.prisma.user.findMany({
      orderBy: { xp: 'desc' },
      take: limit,
      select: { username: true, firstName: true, xp: true }
    });
  }

  awardXp(userId: string, amount: number) {
    return this.prisma.user.update({ where: { id: userId }, data: { xp: { increment: amount } } });
  }
}
