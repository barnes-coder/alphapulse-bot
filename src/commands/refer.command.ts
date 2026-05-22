import { Telegraf } from 'telegraf';
import { AlphaContext } from '../types';

export function registerReferCommand(bot: Telegraf<AlphaContext>) {
  bot.command('refer', async (ctx) => {
    const from = ctx.from!;
    let user = ctx.user;
    if (!user) {
      // ensure user exists when middleware didn't run (extra safety)
      user = await ctx.container.users.upsertTelegramUser({
        telegramId: from.id,
        username: from.username,
        firstName: from.first_name,
        lastName: from.last_name
      });
    }

    const me = await ctx.telegram.getMe();
    const botName = me.username || String(me.id);
    const link = `https://t.me/${botName}?start=${user.referralCode}`;

    await ctx.reply(
      ['*Your Referral Link*', '', link, '', 'Invite users and earn referral credit when they activate premium.'].join('\n'),
      { parse_mode: 'Markdown' }
    );
  });
}
