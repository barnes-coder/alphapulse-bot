import { Telegraf } from 'telegraf';
import { AlphaContext } from '../types';

export function registerSettingsCommand(bot: Telegraf<AlphaContext>) {
  bot.command('settings', async (ctx) => {
    const wallets = await ctx.container.wallets.countByUser(ctx.user!.id);
    const premium = await ctx.container.subscriptions.isPremium(ctx.user!.id);
    await ctx.reply(
      [
        '*Account Settings*',
        '',
        `Username: ${ctx.user!.username ? `@${ctx.user!.username}` : 'n/a'}`,
        `Plan: ${premium ? 'Premium' : 'Free'}`,
        `Tracked wallets: ${wallets}`,
        `Referral code: ${ctx.user!.referralCode}`,
        `XP: ${ctx.user!.xp}`
      ].join('\n'),
      { parse_mode: 'Markdown' }
    );
  });
}
