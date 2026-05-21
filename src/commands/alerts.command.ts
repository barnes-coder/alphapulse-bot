import { Telegraf } from 'telegraf';
import { AlphaContext } from '../types';

export function registerAlertsCommand(bot: Telegraf<AlphaContext>) {
  bot.command('alerts', async (ctx) => {
    const alerts = await ctx.container.alertsRepo.recentForUser(ctx.user!.id);
    if (!alerts.length) {
      await ctx.reply('No alerts yet. Add wallets with /track to start receiving activity updates.');
      return;
    }
    await ctx.reply(
      ['*Recent Alerts*', '', ...alerts.map((alert, index) => `${index + 1}. ${alert.title} - ${alert.createdAt.toISOString()}`)].join(
        '\n'
      ),
      { parse_mode: 'Markdown' }
    );
  });
}
