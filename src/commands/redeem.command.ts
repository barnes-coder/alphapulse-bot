import { Telegraf } from 'telegraf';
import { parseCommandArg } from '../utils/validators';
import { AlphaContext } from '../types';

export function registerRedeemCommand(bot: Telegraf<AlphaContext>) {
  bot.command('redeem', async (ctx) => {
    const code = parseCommandArg(ctx.message.text)?.trim();
    if (!code) {
      await ctx.reply('Usage: `/redeem <code>`', { parse_mode: 'Markdown' });
      return;
    }

    const result = await ctx.container.redeemCodes.redeemCode(ctx.user!.id, code);
    if (!result.ok) {
      await ctx.reply(result.reason, { parse_mode: 'Markdown' });
      return;
    }

    await ctx.reply(
      [`*Subscription Activated*`, '', `Plan: *${result.plan}*`, `Duration: *${result.days} days*`, '', 'Enjoy unlimited wallet tracking and premium features!'].join('\n'),
      { parse_mode: 'Markdown' }
    );
  });
}
