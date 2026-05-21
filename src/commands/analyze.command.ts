import { Telegraf } from 'telegraf';
import { AlphaContext } from '../types';
import { parseCommandArg, tokenAddressSchema } from '../utils/validators';

export function registerAnalyzeCommand(bot: Telegraf<AlphaContext>) {
  bot.command('analyze', async (ctx) => {
    if (!(await ctx.container.subscriptions.isPremium(ctx.user!.id))) {
      await ctx.reply('AI token analysis is premium-only. Use /upgrade to unlock it.');
      return;
    }

    const tokenAddress = parseCommandArg(ctx.message.text);
    const parsed = tokenAddressSchema.safeParse(tokenAddress);
    if (!parsed.success) {
      await ctx.reply('Usage: `/analyze <tokenAddress>`', { parse_mode: 'Markdown' });
      return;
    }

    const token = await ctx.container.tokens.marketData(parsed.data);
    if (!token) {
      await ctx.reply('No token data found for analysis.');
      return;
    }

    const risk = ctx.container.tokens.riskReport(token);
    const summary = await ctx.container.ai.summarizeToken(token, risk);
    await ctx.reply(
      [`*AI Token Risk Analysis*`, '', `Token: *${token.symbol}*`, `Risk Score: *${risk.score}/100*`, `Rug Probability: *${risk.rugProbability}%*`, '', summary].join(
        '\n'
      ),
      { parse_mode: 'Markdown' }
    );
  });
}
