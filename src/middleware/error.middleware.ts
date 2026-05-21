import { MiddlewareFn } from 'telegraf';
import { AlphaContext } from '../types';
import { logger } from '../utils/logger';

export function errorMiddleware(): MiddlewareFn<AlphaContext> {
  return async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      logger.error({ error }, 'Telegram command failed');
      await ctx.reply('Something went wrong while processing that request. Please try again shortly.');
    }
  };
}
