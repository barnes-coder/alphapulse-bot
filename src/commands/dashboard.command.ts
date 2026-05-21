import { Markup, Telegraf } from 'telegraf';
import { env } from '../config/env';
import { AlphaContext } from '../types';
import { isHttpsUrl } from '../utils/validators';

export function registerDashboardCommand(bot: Telegraf<AlphaContext>) {
  bot.command('dashboard', async (ctx) => {
    const walletCount = await ctx.container.wallets.countByUser(ctx.user!.id);
    const alerts = await ctx.container.alertsRepo.recentForUser(ctx.user!.id, 3);
    const alertSummary = alerts.length
      ? alerts.map((alert, index) => `*${index + 1}.* ${alert.title}`).join('\n')
      : 'No recent alerts yet. Track a wallet to start receiving updates.';

    const message = [
      '*AlphaPulse Dashboard*',
      '',
      `Tracked wallets: *${walletCount}*`,
      `Recent alerts: *${alerts.length}*`,
      '',
      alertSummary,
      '',
      'Use the button below to open your Web App dashboard when available.'
    ].join('\n');

    const replyOptions: any = {
      parse_mode: 'Markdown'
    };

    if (isHttpsUrl(env.WEB_APP_URL)) {
      replyOptions.reply_markup = {
        inline_keyboard: [
          [{ text: 'Open Web Dashboard', web_app: { url: env.WEB_APP_URL } }],
          [{ text: 'Open App', callback_data: 'app_help' }]
        ]
      };
    } else {
      replyOptions.reply_markup = {
        inline_keyboard: [
          [{ text: 'Open App Info', callback_data: 'app_help' }]
        ]
      };
    }

    await ctx.reply(message, replyOptions);
  });

  bot.action('app_help', async (ctx) => {
    await ctx.answerCbQuery();
    if (isHttpsUrl(env.WEB_APP_URL)) {
      await ctx.reply(
        'Your Web App URL is configured and ready. Open the button above to launch the dashboard in Telegram.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    await ctx.reply(
      'Web App integration requires a secure HTTPS WEB_APP_URL. Set this in your .env and restart the bot, or use /app once the app is available.',
      { parse_mode: 'Markdown' }
    );
  });
}
