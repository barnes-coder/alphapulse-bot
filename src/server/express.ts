import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { Telegraf } from 'telegraf';
import { env } from '../config/env';
import { AppContainer } from '../container';
import { paymentRoutes } from '../api/payment.routes';
import { webappRoutes } from '../api/webapp.routes';
import { logger } from '../utils/logger';

export function createServer(bot: Telegraf<any>, container: AppContainer) {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'alphapulse', mode: env.BOT_MODE });
  });

  app.use('/api', paymentRoutes(container));
  app.use('/api/webapp', webappRoutes(container));

  app.get('/webapp', (_req, res) => {
    const debugEnabled = process.env.NODE_ENV === 'development';
    const debugTelegramId = process.env.TEST_TELEGRAM_ID || '';

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>AlphaPulse Mini App</title>
        <style>
          body { margin: 0; font-family: system-ui, sans-serif; background: #020617; color: #e2e8f0; }
          .page { max-width: 900px; margin: 0 auto; padding: 2rem; }
          h1, h2 { margin: 0 0 0.75rem 0; }
          p { line-height: 1.65; margin: 0.75rem 0; }
          .card { background: #0f172a; border: 1px solid #334155; border-radius: 18px; padding: 1.5rem; margin-top: 1rem; }
          .tile { display: inline-flex; align-items: center; justify-content: space-between; width: 100%; padding: 1rem; background: #111827; border-radius: 16px; margin-top: 0.75rem; }
          .tile strong { color: #f8fafc; }
          .button { display: inline-block; padding: 0.85rem 1.25rem; background: #38bdf8; color: #020617; border-radius: 999px; text-decoration: none; font-weight: 700; margin-top: 1rem; }
          .badge { color: #94a3b8; }
          .list { margin: 0; padding: 0; list-style: none; }
          .list-item { padding: 1rem 0; border-bottom: 1px solid #334155; }
          .list-item:last-child { border-bottom: none; }
          .list-item code { background: rgba(148, 163, 184, 0.12); padding: 0.15rem 0.35rem; border-radius: 6px; }
          .status { margin-top: 1rem; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="page">
          <h1>AlphaPulse Dashboard</h1>
          <p>Welcome to your personal Telegram dashboard. It shows your tracked wallets and recent alerts in one place.</p>

          <div class="card" id="summary-card">
            <h2>Loading your data…</h2>
            <p class="status">Please open this page from Telegram if you want the app to identify you automatically.</p>
            ${debugEnabled ? `<p><button id="load-demo">Load demo user</button></p>` : ''}
          </div>

          <div class="card" id="wallets-card" style="display:none;">
            <h2>Tracked Wallets</h2>
            <div id="wallets-list"></div>
          </div>

          <div class="card" id="alerts-card" style="display:none;">
            <h2>Recent Alerts</h2>
            <ul id="alerts-list" class="list"></ul>
          </div>

          <p class="status" id="webapp-status"></p>
        </div>
        <script>
          const statusEl = document.getElementById('webapp-status');
          const summaryCard = document.getElementById('summary-card');
          const walletsCard = document.getElementById('wallets-card');
          const alertsCard = document.getElementById('alerts-card');
          const walletsList = document.getElementById('wallets-list');
          const alertsList = document.getElementById('alerts-list');

          async function renderDashboard(data) {
            const userName = data.user.firstName || data.user.username || 'Trader';
            summaryCard.innerHTML =
              '<h2>Welcome back, ' + userName + '</h2>' +
              '<div class="tile"><strong>Tracked wallets</strong><span>' + data.wallets.length + '</span></div>' +
              '<div class="tile"><strong>Recent alerts</strong><span>' + data.alerts.length + '</span></div>' +
              '<p class="badge">Opened using Telegram Web App authentication.</p>';

            walletsList.innerHTML = data.wallets.length
              ? data.wallets
                  .map(wallet =>
                    '<div class="list-item"><strong>' + (wallet.label || wallet.address) + '</strong>' +
                    '<div><code>' + wallet.address + '</code></div></div>'
                  )
                  .join('')
              : '<div class="list-item">No wallets are being tracked yet.</div>';
            alertsList.innerHTML = data.alerts.length
              ? data.alerts
                  .map(alert =>
                    '<li class="list-item"><strong>' + alert.title + '</strong>' +
                    '<p>' + alert.message + '</p>' +
                    '<p class="badge">' + new Date(alert.createdAt).toLocaleString() + '</p></li>'
                  )
                  .join('')
              : '<li class="list-item">No recent alerts yet.</li>';

            walletsCard.style.display = 'block';
            alertsCard.style.display = 'block';
            statusEl.textContent = 'Your dashboard is now live.';
          }

          async function loadDashboard() {
            try {
              const initData = window.Telegram?.WebApp?.initData;
              if (!initData) {
                statusEl.textContent = 'Open this from Telegram to access your personal dashboard.';
                return;
              }

              const response = await fetch('/api/webapp/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData })
              });

              if (!response.ok) {
                const error = await response.json().catch(() => null);
                statusEl.textContent = 'Unable to load dashboard: ' + (error?.error || response.statusText || 'unknown');
                return;
              }

              const json = await response.json();
              if (!json.ok) {
                statusEl.textContent = 'Unable to load dashboard: ' + (json.error || 'unknown error');
                return;
              }

              renderDashboard(json);
            } catch (error) {
              statusEl.textContent = 'Dashboard error: ' + (error.message || 'failed to load');
            }
          }

          // debug helper: load demo user via server-side debug endpoint (development only)
          async function loadDemo(telegramId) {
            try {
              const response = await fetch('/api/webapp/debug-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegramId })
              });
              if (!response.ok) {
                const err = await response.json().catch(()=>null);
                statusEl.textContent = 'Debug load failed: ' + (err?.error || response.statusText);
                return;
              }
              const json = await response.json();
              if (!json.ok) {
                statusEl.textContent = 'Debug load failed: ' + (json.error || 'unknown');
                return;
              }
              renderDashboard(json);
            } catch (err) {
              statusEl.textContent = 'Debug load error: ' + (err.message || err);
            }
          }

          window.addEventListener('DOMContentLoaded', loadDashboard);
          const loadBtn = document.getElementById('load-demo');
          if (loadBtn) {
            loadBtn.addEventListener('click', () => loadDemo('${debugTelegramId || ''}'));
          }
        </script>
      </body>
      </html>
    `);
  });

  if (env.BOT_MODE === 'webhook') {
    app.use(bot.webhookCallback(`/telegram/${env.WEBHOOK_SECRET}`));
  }

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ error }, 'Express error');
    res.status(500).json({ error: 'internal server error' });
  });

  return app;
}
