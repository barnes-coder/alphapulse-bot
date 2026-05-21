import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { logger } from '../utils/logger';
import { env } from '../config/env';

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

export const prisma = new PrismaClient({
  adapter,
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' }
  ]
});

// Log Prisma version info on startup to help diagnose environment issues
try {
  logger.debug({ version: Prisma.prismaVersion.client }, 'Prisma Client initialized');
} catch (err) {
  logger.error({ err }, 'Critical error: Prisma Client is improperly installed');
}

prisma.$on('error', (event) => logger.error(event, 'Prisma error'));
prisma.$on('warn', (event) => logger.warn(event, 'Prisma warning'));
