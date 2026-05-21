import { Telegraf } from 'telegraf';
import { AlphaContext } from '../types';

export function registerStatsCommand(bot: Telegraf<AlphaContext>) {
  bot.command('stats', async (ctx) => {
    const stats = await ctx.container.users.stats();
    await ctx.reply(
      [
        '*AlphaPulse Network Stats*',
        '',
        `Users: ${stats.users}`,
        `Premium: ${stats.premium}`,
        `Tracked wallets: ${stats.wallets}`,
        `Alerts generated: ${stats.alerts}`
      ].join('\n'),
      { parse_mode: 'Markdown' }
    );
  });
}
