import { Telegraf } from 'telegraf';
import { env } from '../config/env';
import { AlphaContext } from '../types';
import { homeKeyboard } from '../bot/keyboards';

export function registerStartCommand(bot: Telegraf<AlphaContext>) {
  bot.start(async (ctx) => {
    await ctx.reply(
      [
        '*AlphaPulse is online.*',
        '',
        'Track Solana wallets, watch whale activity, scan token risk, and monitor emerging meme coin momentum from Telegram.',
        '',
        'Start with `/track <wallet>` or `/suggest` for starter wallet ideas.',
        'Free users can track up to 5 wallets; premium users track unlimited wallets.',
        'Use `/help` to see the full list of commands, and `/app` to open the mini app when a secure URL is configured.'
      ].join('\n'),
      { parse_mode: 'Markdown', ...homeKeyboard(env.WEB_APP_URL) }
    );
  });
}

