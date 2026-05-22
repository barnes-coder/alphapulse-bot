import { env } from './config/env';
import { createContainer } from './container';
import { createServer } from './server/express';
import { createBot } from './bot/bot';
import { prisma } from './database/prisma';
import { logger } from './utils/logger';
import { startWalletPollingJob } from './jobs/walletPolling.job';
import { startDailyDigestJob } from './jobs/dailyDigest.job';

async function main() {
  try {
    logger.info('🚀 Starting CoinRadar Bot initialization...');
    
    logger.info('Creating container with dependencies...');
    const container = createContainer();
    logger.info('✅ Container created');

    logger.info('Creating bot with container...');
    const bot = createBot(container);
    logger.info('✅ Bot created');

    const server = createServer(bot, container);
    server.listen(env.PORT, () => {
      logger.info(`✅ Express server ready on port ${env.PORT}`);
    });

    if (env.BOT_MODE === 'polling') {
      logger.info('Launching bot (polling)...');
      await bot.launch();
      logger.info('✅ Bot launched and polling for updates');
    } else {
      logger.info('Bot running in webhook mode (no polling launch)');
    }

    // start background jobs
    const stopWalletPolling = startWalletPollingJob(bot, container);
    const stopDaily = startDailyDigestJob(bot, container);

    // Graceful shutdown
    process.once('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully...');
      bot.stop();
      stopWalletPolling && stopWalletPolling();
      stopDaily && stopDaily();
      await prisma.$disconnect();
      process.exit(0);
    });

    process.once('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      bot.stop();
      stopWalletPolling && stopWalletPolling();
      stopDaily && stopDaily();
      await prisma.$disconnect();
      process.exit(0);
    });
  } catch (error) {
    logger.error({ error }, '❌ Failed to start bot');
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();