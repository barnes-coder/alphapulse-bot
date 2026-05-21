import { Telegraf } from 'telegraf';
import { AlphaContext } from '../types';
import { parseCommandArg, solanaAddressSchema } from '../utils/validators';

export function registerUntrackCommand(bot: Telegraf<AlphaContext>) {
  bot.command('untrack', async (ctx) => {
    const address = parseCommandArg(ctx.message.text);
    const parsed = solanaAddressSchema.safeParse(address);
    if (!parsed.success) {
      await ctx.reply('Usage: `/untrack <solanaWalletAddress>`', { parse_mode: 'Markdown' });
      return;
    }

    const result = await ctx.container.wallets.remove(ctx.user!.id, parsed.data);
    await ctx.reply(result.count ? 'Wallet removed from tracking.' : 'That wallet was not found in your watchlist.');
  });
}
