import { Markup, Telegraf } from 'telegraf';
import { AlphaContext } from '../types';
import { shortAddress } from '../utils/formatters';

export function registerWalletsCommand(bot: Telegraf<AlphaContext>) {
  async function showWallets(ctx: AlphaContext) {
    const wallets = await ctx.container.wallets.listByUser(ctx.user!.id);
    if (!wallets.length) {
      await ctx.reply('No wallets tracked yet. Add one with `/track <wallet>`.', { parse_mode: 'Markdown' });
      return;
    }

    await ctx.reply(
      ['*Tracked Wallets*', '', ...wallets.map((wallet, index) => `${index + 1}. \`${shortAddress(wallet.address)}\``)].join(
        '\n'
      ),
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(
          wallets.slice(0, 8).map((wallet) => [Markup.button.callback(`Remove ${shortAddress(wallet.address)}`, `rm_${wallet.address}`)])
        )
      }
    );
  }

  bot.command('wallets', showWallets);
  bot.action('wallets', showWallets);
  bot.action(/^rm_(.+)$/, async (ctx) => {
    const address = ctx.match[1];
    await ctx.container.wallets.remove(ctx.user!.id, address);
    await ctx.answerCbQuery('Wallet removed');
    await showWallets(ctx);
  });
}
