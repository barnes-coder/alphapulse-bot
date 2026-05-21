import { MiddlewareFn } from 'telegraf';
import { AlphaContext } from '../types';
import { logger } from '../utils/logger';

/**
 * Redis-based rate limiting middleware.
 * @param limit Number of allowed requests per window
 * @param windowSeconds Duration of the window in seconds
 */
export function rateLimitMiddleware(limit = 10, windowSeconds = 60): MiddlewareFn<AlphaContext> {
  return async (ctx, next) => {
    // Only limit actual messages/commands from users
    if (!ctx.from || !ctx.message) return next();

    const userId = ctx.from.id;
    const redis = ctx.container.redis;
    const key = `ratelimit:user:${userId}`;

    try {
      const current = await redis.incr(key);

      // Set expiration on the first request in the window
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      if (current > limit) {
        const ttl = await redis.ttl(key);
        // Notify user if they are spamming commands
        if ('text' in ctx.message && ctx.message.text.startsWith('/')) {
          await ctx.reply(`⚠️ Too many requests. Please wait ${ttl}s before trying again.`);
        }
        return; // Halt execution
      }
    } catch (error) {
      logger.error({ error, userId }, 'Rate limit check failed');
      // Fallback: allow the request to proceed if Redis is down
    }

    return next();
  };
}