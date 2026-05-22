import { env } from './config/env';
import { createContainer } from './container';
import { createServer } from './server/express';
import { createBot } from './bot/bot';
import { prisma } from './database/prisma';
import { logger } from './utils/logger';

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

    logger.info('Launching bot...');
    await bot.launch();
    logger.info('✅ Bot launched and polling for updates');

    // Graceful shutdown
    process.once('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully...');
      bot.stop();
      await prisma.$disconnect();
      process.exit(0);
    });

    process.once('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      bot.stop();
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