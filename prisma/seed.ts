import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminIds = (process.env.ADMIN_TELEGRAM_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  for (const id of adminIds) {
    await prisma.user.upsert({
      where: { telegramId: BigInt(id) },
      update: { isAdmin: true },
      create: {
        telegramId: BigInt(id),
        isAdmin: true,
        referralCode: `ADMIN${id.slice(-6)}`,
        adminProfile: { create: { role: 'owner', scopes: ['*'] } },
        alertSettings: { create: {} },
        subscriptions: { create: { plan: 'PRO', status: 'ACTIVE' } }
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
