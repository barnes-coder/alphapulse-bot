import { Telegraf } from 'telegraf';
import { env } from '../config/env';
import { AlphaContext } from '../types';
import { isHttpsUrl } from '../utils/validators';

export function registerAppCommand(bot: Telegraf<AlphaContext>) {
  bot.command('app', async (ctx) => {
    if (!env.WEB_APP_URL || !isHttpsUrl(env.WEB_APP_URL)) {
      await ctx.reply(
        'The web app is not available in this environment. Set a secure HTTPS WEB_APP_URL in your .env if you want an inline app button.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    await ctx.reply(
      '*Open AlphaPulse Mini App*',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: 'Launch App', web_app: { url: env.WEB_APP_URL } }]]
        }
      }
    );
  });
}
