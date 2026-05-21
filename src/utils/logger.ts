import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: ['BOT_TOKEN', 'HELIUS_API_KEY', 'BIRDEYE_API_KEY', 'AI_API_KEY', 'req.headers.authorization'],
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: true }
        }
      : undefined
});
