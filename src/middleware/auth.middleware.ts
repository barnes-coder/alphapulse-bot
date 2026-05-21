import { MiddlewareFn } from 'telegraf';
import { AlphaContext } from '../types';
import { parseCommandArg } from '../utils/validators';

export function authMiddleware(): MiddlewareFn<AlphaContext> {
  return async (ctx, next) => {
    const from = ctx.from;
    if (!from) return;

    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : undefined;
    const referredByCode = text?.startsWith('/start') ? parseCommandArg(text) : undefined;
    const user = await ctx.container.users.upsertTelegramUser({
      telegramId: from.id,
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
      referredByCode
    });

    if (user.isBanned) {
      await ctx.reply('Access denied. This account is currently restricted.');
      return;
    }

    ctx.user = user;
    await next();
  };
}
