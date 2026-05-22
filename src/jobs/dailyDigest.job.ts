import { Telegraf } from 'telegraf';
import { AppContainer } from '../container';
import { logger } from '../utils/logger';
import { AlphaContext } from '../types';

const SUBSCRIBERS_SET = 'daily:subscribers';
const TIME_KEY = (telegramId: string) => `daily:time:${telegramId}`;

export function startDailyDigestJob(bot: Telegraf<AlphaContext>, container: AppContainer) {
  const runOnce = async () => {
    try {
      const redis = container.redis;
      const members: string[] = (await redis.smembers(SUBSCRIBERS_SET)) || [];
      if (members.length === 0) return;

      const now = new Date();
      const hh = String(now.getUTCHours()).padStart(2, '0');
      const mm = String(now.getUTCMinutes()).padStart(2, '0');
      const nowTime = `${hh}:${mm}`;

      for (const telegramId of members) {
        try {
          const time = (await redis.get(TIME_KEY(telegramId))) || '08:00';
          if (time !== nowTime) continue;

          // find user
          const user = await container.users.findByTelegramId(telegramId);
          let sendTarget: number | undefined;
          if (!user) {
            // Allow sending to numeric telegram IDs directly for local testing
            const parsed = Number(telegramId);
            if (!Number.isNaN(parsed) && parsed > 0) {
              sendTarget = parsed;
            } else {
              // cleanup: remove unknown non-numeric member
              await redis.srem(SUBSCRIBERS_SET, telegramId);
              continue;
            }
          } else {
            sendTarget = Number(user.telegramId);
          }

          // build digest
          const userId = user ? user.id : undefined;
          const walletsCount = userId ? await container.wallets.countByUser(userId) : 0;
          const recentAlerts = userId ? await container.alertsRepo.recentForUser(userId, 5) : [];
          const solPrice = await container.prices.getSolPrice().catch(() => null);

          // compute approximate total SOL balance across tracked wallets
          const tracked = userId ? await container.wallets.listByUser(userId) : [];
          let totalSol = 0;
          for (const w of tracked) {
            try {
              const b = await container.helius.getBalance(w.address);
              if (b && b.sol) totalSol += b.sol;
            } catch {
              // ignore per-wallet failures
            }
          }

          // top movers via TokenService trending (by volume)
          let movers: any[] = [];
          try {
            const trending = await container.tokens.trending();
            movers = trending
              .sort((a: any, b: any) => (b.volume24h || 0) - (a.volume24h || 0))
              .slice(0, 3);
          } catch {
            movers = [];
          }

          const parts: string[] = [];
          parts.push('*Daily Pulse*');
          parts.push('');
          parts.push(`Tracked wallets: ${walletsCount}`);
          if (solPrice) parts.push(`SOL price (USD): $${solPrice.toFixed(2)}`);
          if (totalSol) parts.push(`Estimated total SOL across wallets: ${totalSol.toFixed(4)} (~$${(
            (solPrice || 0) * totalSol
          ).toFixed(2)})`);

          parts.push('');
          parts.push('*Top movers (by 24h volume)*');
          if (movers.length === 0) {
            parts.push('_No trending tokens available right now._');
          } else {
            for (const t of movers) {
              parts.push(`- ${t.symbol} — $${t.priceUsd?.toFixed(4) ?? '0'} • Vol24h: $${(t.volume24h || 0).toFixed(0)}`);
            }
          }

          parts.push('');
          parts.push('*Recent alerts*');
          if (recentAlerts.length === 0) {
            parts.push('_No new alerts in the last period._');
          } else {
            for (const a of recentAlerts) {
              const timeStr = a.createdAt ? new Date(a.createdAt).toUTCString() : '';
              parts.push(`- ${a.title} (${timeStr})`);
            }
          }

          // AI summaries for top movers (if AI keys configured)
          if (movers.length > 0) {
            parts.push('');
            parts.push('*AI summaries*');
            for (const t of movers) {
              try {
                const risk = container.tokens.riskReport(t);
                const summary = await container.ai.summarizeToken(t as any, risk as any);
                const short = summary.split('\n')[0];
                parts.push(`- ${t.symbol}: ${short}`);
              } catch {
                parts.push(`- ${t.symbol}: AI summary unavailable`);
              }
            }
          }

          parts.push('');
          parts.push('Open the dashboard or use /help for more commands.');

          const message = parts.join('\n');

          await bot.telegram.sendMessage(sendTarget!, message, { parse_mode: 'Markdown' });
        } catch (err) {
          logger.error({ err, telegramId }, 'Failed to send daily digest to user');
        }
      }
    } catch (error) {
      logger.error({ error }, 'Daily digest job failed');
    }
  };

  // run every minute
  const timer = setInterval(() => void runOnce(), 60 * 1000);
  void runOnce();
  return () => clearInterval(timer);
}
