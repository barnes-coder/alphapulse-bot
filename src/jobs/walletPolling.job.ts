import { Telegraf } from 'telegraf';
import { AppContainer } from '../container';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AlphaContext } from '../types';

export function startWalletPollingJob(bot: Telegraf<AlphaContext>, container: AppContainer) {
  const run = async () => {
    try {
      await container.subscriptionRepo.expireOldSubscriptions();
      await container.walletMonitor.poll(bot);
    } catch (error) {
      logger.error({ error }, 'Wallet polling job failed');
    }
  };

  const interval = Math.max(10, env.POLLING_INTERVAL_SECONDS) * 1000;
  const timer = setInterval(() => void run(), interval);
  void run();
  return () => clearInterval(timer);
}
