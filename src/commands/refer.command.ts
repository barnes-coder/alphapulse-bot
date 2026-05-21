import { Telegraf } from 'telegraf';
import { AlphaContext } from '../types';

export function registerReferCommand(bot: Telegraf<AlphaContext>) {
  bot.command('refer', async (ctx) => {
    const me = await ctx.telegram.getMe();
    await ctx.reply(
      [
        '*Your Referral Link*',
        '',
        `https://t.me/${me.username}?start=${ctx.user!.referralCode}`,
        '',
        'Invite users and earn referral credit when they activate premium.'
      ].join('\n'),
      { parse_mode: 'Markdown' }
    );
  });
}
