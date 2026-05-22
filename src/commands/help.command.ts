import { Telegraf } from 'telegraf';
import { AlphaContext } from '../types';

export function registerHelpCommand(bot: Telegraf<AlphaContext>) {
  bot.help(async (ctx) => {
    await ctx.reply(
      [
        '*AlphaPulse Command Guide*',
        '',
        '*Core Actions*',
        '`/track <wallet>` - follow a Solana wallet',
        '`/untrack <wallet>` - remove a tracked wallet',
        '`/wallets` - list your tracked wallets',
        '`/suggest` - get starter wallet ideas to track',
        '`/redeem <code>` - redeem an owner-issued premium code',
        '`/dashboard` - open your dashboard and Web App prompt',
        '`/app` - launch the mini app when a secure URL is configured',
        '',
        '*Market Intelligence*',
        '`/price <token>` - token market price and charts',
        '`/trending` - trending Solana tokens',
        '`/whales` - whale activity alerts',
        '`/alerts` - recent alert history',
        '`/analyze <token>` - premium token risk analysis',
        '',
        '*Account & Billing*',
        '`/upgrade` - choose a subscription plan',
        '`/settings` - account preferences',
        '`/stats` - usage and leaderboard stats',
        '`/refer` - get your referral link',
        '`/restart` - restart your session',
        '',
        '*Admin*',
        '`/restartbot` - restart the bot process',
        '`/admin` - admin-only management tools'
      ].join('\n'),
      { parse_mode: 'Markdown' }
    );
  });
}
