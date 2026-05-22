const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  try {
    const user = await prisma.user.create({
      data: {
        telegramId: BigInt(123456789),
        username: 'local_test_user',
        firstName: 'Local',
        lastName: 'Tester',
        referralCode: 'LOCALTEST',
        alertSettings: { create: {} },
        subscriptions: { create: { plan: 'FREE', status: 'ACTIVE' } }
      }
    });
    console.log('Created user:', user.id);
  } catch (err) {
    console.error('Create user failed:', err.message || err);
  } finally {
    await prisma.$disconnect();
  }
})();