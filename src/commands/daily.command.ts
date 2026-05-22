import { Telegraf } from 'telegraf';
import { AlphaContext } from '../types';

const SUBSCRIBERS_SET = 'daily:subscribers';
const TIME_KEY = (telegramId: number | string) => `daily:time:${telegramId}`;

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export function registerDailyCommand(bot: Telegraf<AlphaContext>) {
  bot.command('daily', async (ctx) => {
    const telegramId = String(ctx.from!.id);
    const redis = ctx.container.redis;
    const isMember = await redis.sismember(SUBSCRIBERS_SET, telegramId);
    if (isMember) {
      await redis.srem(SUBSCRIBERS_SET, telegramId);
      await ctx.reply('✅ You have unsubscribed from the Daily Pulse. Use /daily to subscribe again.');
      return;
    }

    // subscribe with default time 08:00 UTC
    await redis.sadd(SUBSCRIBERS_SET, telegramId);
    await redis.set(TIME_KEY(telegramId), '08:00');
    await ctx.reply('✅ Subscribed to Daily Pulse at 08:00 UTC. Use /dailytime HH:MM to change delivery time.');
  });

  bot.command('dailytime', async (ctx) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const parts = text.split(' ').filter(Boolean);
    if (parts.length < 2) {
      await ctx.reply('Usage: /dailytime HH:MM (24-hour UTC). Example: /dailytime 07:30');
      return;
    }

    const time = parts[1].trim();
    if (!isValidTime(time)) {
      await ctx.reply('Invalid time format. Use HH:MM in 24-hour UTC format.');
      return;
    }

    const telegramId = String(ctx.from!.id);
    const redis = ctx.container.redis;
    const isMember = await redis.sismember(SUBSCRIBERS_SET, telegramId);
    if (!isMember) {
      await ctx.reply('You are not subscribed. Use /daily to subscribe first.');
      return;
    }

    await redis.set(TIME_KEY(telegramId), time);
    await ctx.reply(`✅ Daily Pulse delivery time updated to ${time} UTC.`);
  });
}
