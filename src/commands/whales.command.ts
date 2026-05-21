import { Telegraf } from 'telegraf';
import { AlphaContext } from '../types';
import { env } from '../config/env';
import { usd } from '../utils/formatters';

export function registerWhalesCommand(bot: Telegraf<AlphaContext>) {
  bot.command('whales', async (ctx) => {
    const premium = await ctx.container.subscriptions.isPremium(ctx.user!.id);
    await ctx.reply(
      [
        '*Whale Monitor*',
        '',
        `Threshold: ${usd(env.WHALE_USD_THRESHOLD)}`,
        `Status: ${premium ? 'real-time premium alerts enabled' : 'free delayed alerts enabled'}`,
        '',
        'Track high-signal wallets with `/track <wallet>` to receive whale activity notifications.'
      ].join('\n'),
      { parse_mode: 'Markdown' }
    );
  });
}
