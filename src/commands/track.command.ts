import { Prisma } from '@prisma/client';
import { Telegraf } from 'telegraf';
import { AlphaContext } from '../types';
import { parseCommandArg, solanaAddressSchema } from '../utils/validators';

export function registerTrackCommand(bot: Telegraf<AlphaContext>) {
  bot.command('track', async (ctx) => {
    const address = parseCommandArg(ctx.message.text);
    const parsed = solanaAddressSchema.safeParse(address);
    if (!parsed.success) {
      await ctx.reply('Usage: `/track <solanaWalletAddress>`', { parse_mode: 'Markdown' });
      return;
    }

    const user = ctx.user!;
    const count = await ctx.container.wallets.countByUser(user.id);
    const limit = await ctx.container.subscriptions.walletLimit(user.id);
    if (count >= limit) {
      await ctx.reply(`Wallet limit reached. Free users can track ${limit} wallets. Use /upgrade to unlock more.`);
      return;
    }

    try {
      await ctx.container.wallets.create(user.id, parsed.data);
      await ctx.container.leaderboard.awardXp(user.id, 10);
      await ctx.reply(`Tracking wallet:\n\`${parsed.data}\``, { parse_mode: 'Markdown' });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        await ctx.reply('That wallet is already in your watchlist.');
        return;
      }
      throw error;
    }
  });
}
