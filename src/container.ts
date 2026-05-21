import Redis from 'ioredis';
import { prisma } from './database/prisma';
import { UserRepository } from './database/repositories/user.repository';
import { WalletRepository } from './database/repositories/wallet.repository';
import { SubscriptionRepository } from './database/repositories/subscription.repository';
import { AlertRepository } from './database/repositories/alert.repository';
import { DexScreenerService } from './services/dexscreener.service';
import { HeliusService } from './services/helius.service';
import { TokenService } from './services/token.service';
import { SubscriptionService } from './services/subscription.service';
import { AlertService } from './services/alert.service';
import { WalletMonitorService } from './services/walletMonitor.service';
import { BirdeyeService } from './services/birdeye.service';
import { AiService } from './services/ai.service';
import { PaymentService } from './services/payment.service';
import { PriceService } from './services/price.service';
import { LeaderboardService } from './services/leaderboard.service';

export function createContainer() {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  const users = new UserRepository(prisma);
  const wallets = new WalletRepository(prisma);
  const subscriptionRepo = new SubscriptionRepository(prisma);
  const alertsRepo = new AlertRepository(prisma);
  const dex = new DexScreenerService();
  const birdeye = new BirdeyeService();
  const helius = new HeliusService();
  const prices = new PriceService(redis);
  const subscriptions = new SubscriptionService(subscriptionRepo);
  const alerts = new AlertService(alertsRepo);
  const tokens = new TokenService(dex, birdeye);
  const ai = new AiService();
  const payments = new PaymentService(prisma, prices);
  const walletMonitor = new WalletMonitorService(wallets, helius, alerts);
  const leaderboard = new LeaderboardService(prisma);

  return {
    prisma,
    redis,
    users,
    wallets,
    subscriptionRepo,
    alertsRepo,
    dex,
    birdeye,
    helius,
    subscriptions,
    alerts,
    tokens,
    ai,
    prices,
    payments,
    walletMonitor,
    leaderboard
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
