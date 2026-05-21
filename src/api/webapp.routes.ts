import express from 'express';
import { AppContainer } from '../container';
import { parseTelegramInitData, verifyTelegramInitData } from '../utils/telegramWebApp';

export function webappRoutes(container: AppContainer) {
  const router = express.Router();

  router.post('/session', async (req, res, next) => {
    try {
      const { initData } = req.body;
      if (!initData || typeof initData !== 'string') {
        res.status(400).json({ ok: false, error: 'initData is required' });
        return;
      }

      if (!verifyTelegramInitData(initData)) {
        res.status(401).json({ ok: false, error: 'invalid telegram init data' });
        return;
      }

      const parsed = parseTelegramInitData(initData);
      const userPayload = parsed.user as Record<string, unknown> | undefined;
      const telegramId = Number(userPayload?.id ?? parsed.user_id ?? parsed.userId ?? 0);
      if (!telegramId) {
        res.status(400).json({ ok: false, error: 'telegramId not found' });
        return;
      }

      const username = userPayload?.username as string | undefined;
      const firstName = userPayload?.first_name as string | undefined;
      const lastName = userPayload?.last_name as string | undefined;

      const user = await container.users.upsertTelegramUser({
        telegramId,
        username,
        firstName,
        lastName
      });

      const wallets = await container.wallets.listByUser(user.id);
      const alerts = await container.alertsRepo.recentForUser(user.id, 10);

      res.json({
        ok: true,
        user: {
          id: user.id,
          telegramId: user.telegramId.toString(),
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName
        },
        wallets: wallets.map((wallet) => ({ address: wallet.address, label: wallet.label, createdAt: wallet.createdAt })),
        alerts: alerts.map((alert) => ({ title: alert.title, message: alert.message, createdAt: alert.createdAt }))
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
