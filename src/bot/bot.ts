import { Telegraf } from 'telegraf';
import { env } from '../config/env';
import { AppContainer } from '../container';
import { errorMiddleware } from '../middleware/error.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware';
import { registerCommands } from '../commands';
import { AlphaContext } from '../types';

export async function createBot(container: AppContainer): Promise<Telegraf<AlphaContext>> {
  const bot = new Telegraf<AlphaContext>(env.BOT_TOKEN);

  bot.use(async (ctx, next) => {
    ctx.container = container;
    await next();
  });
  bot.use(errorMiddleware());
  bot.use(rateLimitMiddleware());
  bot.use(authMiddleware());

  registerCommands(bot);

  await bot.telegram.setMyCommands([
    { command: 'start', description: 'Show welcome message and main bot menu' },
    { command: 'help', description: 'Show available commands and usage' },
    { command: 'track', description: 'Track a wallet address' },
    { command: 'untrack', description: 'Stop tracking a wallet' },
    { command: 'wallets', description: 'List your tracked wallets' },
    { command: 'price', description: 'Get token price details' },
    { command: 'trending', description: 'Show trending tokens' },
    { command: 'analyze', description: 'Analyze a token risk profile' },
    { command: 'upgrade', description: 'Choose a subscription plan' },
    { command: 'dashboard', description: 'Open your account dashboard' },
    { command: 'app', description: 'Launch the mini app / web dashboard' },
    { command: 'stats', description: 'Show wallet and alert stats' },
    { command: 'alerts', description: 'List recent alerts' },
    { command: 'whales', description: 'Track whale activity' },
    { command: 'settings', description: 'Manage your user settings' },
    { command: 'refer', description: 'Get a referral link' },
    { command: 'restart', description: 'Restart your session' },
    { command: 'restartbot', description: 'Admin-only bot restart' }
  ]);

  bot.action('track_help', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Send `/track <walletAddress>` to add a Solana wallet to your radar.', { parse_mode: 'Markdown' });
  });

  return bot;
}
