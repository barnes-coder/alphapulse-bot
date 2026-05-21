import { Telegraf } from 'telegraf';
import { AlphaContext } from '../types';
import { compact, usd } from '../utils/formatters';
import { parseCommandArg, tokenAddressSchema } from '../utils/validators';

export function registerPriceCommand(bot: Telegraf<AlphaContext>) {
  bot.command('price', async (ctx) => {
    const tokenAddress = parseCommandArg(ctx.message.text);
    const parsed = tokenAddressSchema.safeParse(tokenAddress);
    if (!parsed.success) {
      await ctx.reply('Usage: `/price <tokenAddress>`', { parse_mode: 'Markdown' });
      return;
    }

    const token = await ctx.container.tokens.marketData(parsed.data);
    if (!token) {
      await ctx.reply('No market data found for that token.');
      return;
    }

    await ctx.reply(
      [
        `*${token.name} (${token.symbol})*`,
        '',
        `Price: ${usd(token.priceUsd)}`,
        `Liquidity: ${usd(token.liquidityUsd)}`,
        `24h Volume: ${usd(token.volume24h)}`,
        `Market Cap: ${compact(token.marketCap)}`,
        `FDV: ${compact(token.fdv)}`,
        token.pairUrl ? `Chart: ${token.pairUrl}` : undefined
      ]
        .filter(Boolean)
        .join('\n'),
      { parse_mode: 'Markdown' }
    );
  });
}
