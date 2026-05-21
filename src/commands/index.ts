import { Telegraf } from 'telegraf';
import { AlphaContext } from '../types';
import { registerAdminCommand } from './admin.command';
import { registerAlertsCommand } from './alerts.command';
import { registerAnalyzeCommand } from './analyze.command';
import { registerHelpCommand } from './help.command';
import { registerPriceCommand } from './price.command';
import { registerReferCommand } from './refer.command';
import { registerSettingsCommand } from './settings.command';
import { registerStartCommand } from './start.command';
import { registerStatsCommand } from './stats.command';
import { registerTrackCommand } from './track.command';
import { registerTrendingCommand } from './trending.command';
import { registerUntrackCommand } from './untrack.command';
import { registerUpgradeCommand } from './upgrade.command';
import { registerWalletsCommand } from './wallets.command';
import { registerWhalesCommand } from './whales.command';
import { registerDashboardCommand } from './dashboard.command';
import { registerAppCommand } from './app.command';

export function registerCommands(bot: Telegraf<AlphaContext>) {
  registerStartCommand(bot);
  registerHelpCommand(bot);
  registerTrackCommand(bot);
  registerUntrackCommand(bot);
  registerWalletsCommand(bot);
  registerPriceCommand(bot);
  registerTrendingCommand(bot);
  registerAnalyzeCommand(bot);
  registerUpgradeCommand(bot);
  registerReferCommand(bot);
  registerSettingsCommand(bot);
  registerAlertsCommand(bot);
  registerWhalesCommand(bot);
  registerDashboardCommand(bot);
  registerAppCommand(bot);
  registerStatsCommand(bot);
  registerAdminCommand(bot);
}
