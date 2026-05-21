import { Markup, Telegraf } from 'telegraf';
import { AlphaContext } from '../types';
import { compact, usd } from '../utils/formatters';

export function registerTrendingCommand(bot: Telegraf<AlphaContext>) {
  async function showTrending(ctx: AlphaContext) {
    const tokens = await ctx.container.tokens.trending();
    if (!tokens.length) {
      await ctx.reply('Trending token data is unavailable right now.');
      return;
    }
    await ctx.reply(
      [
        '*Trending Solana Tokens*',
        '',
        ...tokens
          .slice(0, 8)
          .map((token, index) => `${index + 1}. *${token.symbol}* - ${usd(token.priceUsd)} | Liq ${compact(token.liquidityUsd)}`)
      ].join('\n'),
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('Refresh', 'trending')]]) }
    );
  }

  bot.command('trending', showTrending);
  bot.action('trending', async (ctx) => {
    await ctx.answerCbQuery();
    await showTrending(ctx);
  });
}
