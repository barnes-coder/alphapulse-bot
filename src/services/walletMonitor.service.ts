import { Telegraf } from 'telegraf';
import { env } from '../config/env';
import { WalletRepository } from '../database/repositories/wallet.repository';
import { HeliusService } from './helius.service';
import { AlertService } from './alert.service';
import { shortAddress, usd } from '../utils/formatters';
import { logger } from '../utils/logger';
import { AlphaContext } from '../types';

export class WalletMonitorService {
  constructor(
    private readonly wallets: WalletRepository,
    private readonly helius: HeliusService,
    private readonly alerts: AlertService
  ) {}

  async poll(bot: Telegraf<AlphaContext>) {
    const wallets = await this.wallets.activeWallets();
    logger.info({ wallets: wallets.length }, 'Polling tracked wallets');

    await Promise.allSettled(
      wallets.map(async (wallet) => {
        const transactions = await this.helius.walletTransactions(wallet.address, 3);
        const latest = transactions[0];
        if (!latest || latest.signature === wallet.lastSignature) return;

        await this.wallets.updateLastSignature(wallet.id, latest.signature);
        if (!wallet.lastSignature) return;

        const premium = wallet.user.subscriptions.some(
          (sub) => sub.status === 'ACTIVE' && ['PREMIUM', 'PRO'].includes(sub.plan)
        );
        const whale = (latest.amountUsd ?? 0) >= env.WHALE_USD_THRESHOLD;
        const type = whale ? 'WHALE_BUY' : 'WALLET_ACTIVITY';
        const delayMs = premium ? 0 : 5 * 60 * 1000;

        await this.alerts.send(bot, {
          telegramId: wallet.user.telegramId,
          userId: wallet.userId,
          walletId: wallet.id,
          type,
          title: whale ? 'Whale Activity Detected' : 'Wallet Activity Detected',
          delayMs,
          metadata: latest,
          message: [
            `Wallet: \`${shortAddress(wallet.address)}\``,
            `Network: Solana`,
            `Activity: ${latest.description ?? latest.type ?? 'New transaction'}`,
            latest.amountUsd ? `Estimated value: ${usd(latest.amountUsd)}` : undefined,
            latest.tokenSymbol ? `Token: ${latest.tokenSymbol}` : undefined,
            `Signature: \`${shortAddress(latest.signature)}\``,
            ``,
            `View on Solscan: https://solscan.io/tx/${latest.signature}`
          ]
            .filter(Boolean)
            .join('\n')
        });
      })
    );
  }
}
