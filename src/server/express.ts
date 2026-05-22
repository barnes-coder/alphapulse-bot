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

  // Enhanced webapp routes
  app.post('/api/webapp/trending', async (req, res, next) => {
    try {
      const tokens = await container.tokens.trending();
      res.json({ ok: true, tokens: tokens.slice(0, 10) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/webapp/price', async (req, res, next) => {
    try {
      const { tokenAddress } = req.body;
      if (!tokenAddress) {
        res.status(400).json({ ok: false, error: 'tokenAddress required' });
        return;
      }
      const token = await container.tokens.marketData(tokenAddress);
      if (!token) {
        res.status(404).json({ ok: false, error: 'Token not found' });
        return;
      }
      res.json({ ok: true, token });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/webapp/track', async (req, res, next) => {
    try {
      const { initData, address, label } = req.body;
      if (!initData || !address) {
        res.status(400).json({ ok: false, error: 'initData and address required' });
        return;
      }
      const { verifyTelegramInitData, parseTelegramInitData } = await import('../utils/telegramWebApp');
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
      const user = await container.users.upsertTelegramUser({ telegramId });
      await container.wallets.create(user.id, address, label);
      await container.leaderboard.awardXp(user.id, 10);
      res.json({ ok: true, message: 'Wallet tracked' });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/webapp/untrack', async (req, res, next) => {
    try {
      const { initData, walletId } = req.body;
      if (!initData || !walletId) {
        res.status(400).json({ ok: false, error: 'initData and walletId required' });
        return;
      }
      const { verifyTelegramInitData, parseTelegramInitData } = await import('../utils/telegramWebApp');
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
      const user = await container.users.upsertTelegramUser({ telegramId });
      await container.wallets.delete(walletId, user.id);
      res.json({ ok: true, message: 'Wallet untracked' });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/webapp/stats', async (req, res, next) => {
    try {
      const { initData } = req.body;
      if (!initData) {
        res.status(400).json({ ok: false, error: 'initData required' });
        return;
      }
      const { verifyTelegramInitData, parseTelegramInitData } = await import('../utils/telegramWebApp');
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
      const user = await container.users.upsertTelegramUser({ telegramId });
      const walletCount = await container.wallets.countByUser(user.id);
      const alertCount = await container.alertsRepo.countByUser(user.id);
      const subscription = await container.subscriptions.getActive(user.id);
      res.json({ ok: true, walletCount, alertCount, subscription: subscription?.plan || 'FREE', xp: user.xp });
    } catch (error) {
      next(error);
    }
  });

  app.get('/webapp', (_req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>AlphaPulse Dashboard</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #e2e8f0;
            min-height: 100vh;
            padding-bottom: 80px;
          }
          .container { max-width: 600px; margin: 0 auto; padding: 1rem; }
          .header { 
            background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
            padding: 2rem 1rem;
            border-radius: 20px;
            margin-bottom: 1.5rem;
            box-shadow: 0 10px 30px rgba(6, 182, 212, 0.2);
          }
          .header h1 { font-size: 1.8rem; margin-bottom: 0.5rem; }
          .header p { opacity: 0.9; font-size: 0.9rem; }
          .nav-tabs {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
            overflow-x: auto;
            padding-bottom: 0.5rem;
          }
          .nav-tabs button {
            padding: 0.75rem 1.25rem;
            background: #1e293b;
            border: 2px solid #334155;
            color: #94a3b8;
            border-radius: 12px;
            cursor: pointer;
            font-weight: 600;
            white-space: nowrap;
            transition: all 0.3s;
          }
          .nav-tabs button.active {
            background: #0ea5e9;
            border-color: #0ea5e9;
            color: white;
          }
          .nav-tabs button:hover { border-color: #0ea5e9; }
          .tab-content { display: none; }
          .tab-content.active { display: block; animation: fadeIn 0.3s; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          .card {
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 16px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }
          .card h2 { font-size: 1.1rem; margin-bottom: 1rem; color: #f1f5f9; }
          .stat-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 1rem;
          }
          .stat-box {
            background: #1e293b;
            padding: 1rem;
            border-radius: 12px;
            text-align: center;
          }
          .stat-value { font-size: 1.8rem; font-weight: 700; color: #0ea5e9; }
          .stat-label { font-size: 0.8rem; color: #94a3b8; margin-top: 0.25rem; }
          .token-item, .wallet-item, .alert-item {
            background: #1e293b;
            padding: 1rem;
            border-radius: 12px;
            margin-bottom: 0.75rem;
            border-left: 4px solid #0ea5e9;
          }
          .token-item strong, .wallet-item strong { color: #f1f5f9; display: block; margin-bottom: 0.5rem; }
          .token-price { color: #0ea5e9; font-weight: 600; }
          .token-meta { font-size: 0.85rem; color: #94a3b8; margin-top: 0.5rem; }
          .input-group {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
          }
          .input-group input {
            flex: 1;
            padding: 0.75rem;
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 8px;
            color: #e2e8f0;
            font-size: 0.9rem;
          }
          .input-group input::placeholder { color: #64748b; }
          .btn {
            padding: 0.75rem 1.5rem;
            background: #0ea5e9;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s;
            font-size: 0.9rem;
          }
          .btn:hover { background: #0284c7; transform: translateY(-2px); }
          .btn-small {
            padding: 0.5rem 1rem;
            font-size: 0.8rem;
            margin-top: 0.5rem;
          }
          .btn-danger { background: #ef4444; }
          .btn-danger:hover { background: #dc2626; }
          .loading { text-align: center; padding: 2rem; color: #94a3b8; }
          .error { background: #7f1d1d; color: #fca5a5; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
          .success { background: #1f2937; color: #86efac; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
          .empty { text-align: center; color: #64748b; padding: 2rem; }
          .bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #0f172a;
            border-top: 1px solid #334155;
            display: flex;
            justify-content: space-around;
            padding: 0.5rem 0;
          }
          .bottom-nav button {
            flex: 1;
            padding: 0.75rem;
            background: none;
            border: none;
            color: #64748b;
            cursor: pointer;
            font-size: 0.8rem;
            transition: color 0.3s;
          }
          .bottom-nav button.active { color: #0ea5e9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>AlphaPulse</h1>
            <p id="user-greeting">Welcome to your dashboard</p>
          </div>

          <div class="nav-tabs">
            <button class="nav-btn active" data-tab="dashboard">Dashboard</button>
            <button class="nav-btn" data-tab="wallets">Wallets</button>
            <button class="nav-btn" data-tab="trending">Trending</button>
            <button class="nav-btn" data-tab="price">Price</button>
            <button class="nav-btn" data-tab="alerts">Alerts</button>
          </div>

          <!-- Dashboard Tab -->
          <div id="dashboard" class="tab-content active">
            <div class="card">
              <h2>Your Stats</h2>
              <div class="stat-grid">
                <div class="stat-box">
                  <div class="stat-value" id="stat-wallets">0</div>
                  <div class="stat-label">Wallets</div>
                </div>
                <div class="stat-box">
                  <div class="stat-value" id="stat-alerts">0</div>
                  <div class="stat-label">Alerts</div>
                </div>
                <div class="stat-box">
                  <div class="stat-value" id="stat-plan">FREE</div>
                  <div class="stat-label">Plan</div>
                </div>
                <div class="stat-box">
                  <div class="stat-value" id="stat-xp">0</div>
                  <div class="stat-label">XP</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Wallets Tab -->
          <div id="wallets" class="tab-content">
            <div class="card">
              <h2>Track Wallet</h2>
              <div class="input-group">
                <input type="text" id="wallet-address" placeholder="Solana wallet address" />
                <button class="btn" onclick="trackWallet()">Add</button>
              </div>
              <input type="text" id="wallet-label" placeholder="Label (optional)" style="width: 100%; padding: 0.75rem; background: #1e293b; border: 1px solid #334155; border-radius: 8px; color: #e2e8f0; margin-bottom: 1rem;" />
            </div>
            <div class="card">
              <h2>Your Wallets</h2>
              <div id="wallets-list" class="empty">Loading wallets...</div>
            </div>
          </div>

          <!-- Trending Tab -->
          <div id="trending" class="tab-content">
            <div class="card">
              <h2>Trending Tokens</h2>
              <div id="trending-list" class="empty">Loading trending tokens...</div>
            </div>
          </div>

          <!-- Price Tab -->
          <div id="price" class="tab-content">
            <div class="card">
              <h2>Check Price</h2>
              <div class="input-group">
                <input type="text" id="token-address" placeholder="Token address" />
                <button class="btn" onclick="checkPrice()">Search</button>
              </div>
              <div id="price-result"></div>
            </div>
          </div>

          <!-- Alerts Tab -->
          <div id="alerts" class="tab-content">
            <div class="card">
              <h2>Recent Alerts</h2>
              <div id="alerts-list" class="empty">Loading alerts...</div>
            </div>
          </div>
        </div>

        <div class="bottom-nav">
          <button class="nav-btn active" data-tab="dashboard">📊 Dashboard</button>
          <button class="nav-btn" data-tab="wallets">👛 Wallets</button>
          <button class="nav-btn" data-tab="trending">🔥 Trending</button>
          <button class="nav-btn" data-tab="price">💰 Price</button>
          <button class="nav-btn" data-tab="alerts">🔔 Alerts</button>
        </div>

        <script>
          let initData = null;
          let userData = null;

          async function init() {
            try {
              initData = window.Telegram?.WebApp?.initData;
              if (!initData) {
                document.querySelector('.container').innerHTML = '<div class="error">Please open this app from Telegram</div>';
                return;
              }

              const response = await fetch('/api/webapp/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData })
              });

              if (!response.ok) throw new Error('Failed to load session');
              const data = await response.json();
              if (!data.ok) throw new Error(data.error);

              userData = data;
              document.getElementById('user-greeting').textContent = 'Welcome back, ' + (data.user.firstName || data.user.username || 'Trader');
              
              loadDashboard();
              loadWallets();
              loadTrending();
              loadAlerts();
            } catch (error) {
              console.error(error);
              document.querySelector('.container').innerHTML = '<div class="error">Error: ' + error.message + '</div>';
            }
          }

          async function loadDashboard() {
            try {
              const response = await fetch('/api/webapp/stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData })
              });
              const data = await response.json();
              if (data.ok) {
                document.getElementById('stat-wallets').textContent = data.walletCount;
                document.getElementById('stat-alerts').textContent = data.alertCount;
                document.getElementById('stat-plan').textContent = data.subscription;
                document.getElementById('stat-xp').textContent = data.xp;
              }
            } catch (error) {
              console.error('Error loading stats:', error);
            }
          }

          async function loadWallets() {
            const list = document.getElementById('wallets-list');
            if (!userData?.wallets?.length) {
              list.innerHTML = '<div class="empty">No wallets tracked yet</div>';
              return;
            }
            list.innerHTML = userData.wallets.map(w => \`
              <div class="wallet-item">
                <strong>\${w.label || 'Wallet'}</strong>
                <code style="color: #94a3b8; font-size: 0.8rem;">\${w.address.slice(0, 8)}...\${w.address.slice(-8)}</code>
                <button class="btn btn-small btn-danger" onclick="untrackWallet('\${w.id}')">Remove</button>
              </div>
            \`).join('');
          }

          async function loadTrending() {
            try {
              const response = await fetch('/api/webapp/trending', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
              });
              const data = await response.json();
              if (data.ok && data.tokens?.length) {
                document.getElementById('trending-list').innerHTML = data.tokens.map((t, i) => \`
                  <div class="token-item">
                    <strong>\${i + 1}. \${t.symbol}</strong>
                    <div class="token-price">\${t.priceUsd ? '$' + parseFloat(t.priceUsd).toFixed(6) : 'N/A'}</div>
                    <div class="token-meta">Liq: \${t.liquidityUsd ? '$' + (t.liquidityUsd / 1e6).toFixed(2) + 'M' : 'N/A'}</div>
                  </div>
                \`).join('');
              }
            } catch (error) {
              console.error('Error loading trending:', error);
            }
          }

          async function loadAlerts() {
            const list = document.getElementById('alerts-list');
            if (!userData?.alerts?.length) {
              list.innerHTML = '<div class="empty">No recent alerts</div>';
              return;
            }
            list.innerHTML = userData.alerts.map(a => \`
              <div class="alert-item">
                <strong>\${a.title}</strong>
                <p style="margin: 0.5rem 0; color: #cbd5e1;">\${a.message}</p>
                <div style="font-size: 0.8rem; color: #94a3b8;">\${new Date(a.createdAt).toLocaleString()}</div>
              </div>
            \`).join('');
          }

          async function trackWallet() {
            const address = document.getElementById('wallet-address').value;
            const label = document.getElementById('wallet-label').value;
            if (!address) {
              alert('Please enter a wallet address');
              return;
            }
            try {
              const response = await fetch('/api/webapp/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData, address, label })
              });
              const data = await response.json();
              if (data.ok) {
                document.getElementById('wallet-address').value = '';
                document.getElementById('wallet-label').value = '';
                loadWallets();
                loadDashboard();
              } else {
                alert('Error: ' + data.error);
              }
            } catch (error) {
              alert('Error tracking wallet: ' + error.message);
            }
          }

          async function untrackWallet(walletId) {
            if (!confirm('Remove this wallet?')) return;
            try {
              const response = await fetch('/api/webapp/untrack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData, walletId })
              });
              const data = await response.json();
              if (data.ok) {
                loadWallets();
                loadDashboard();
              } else {
                alert('Error: ' + data.error);
              }
            } catch (error) {
              alert('Error: ' + error.message);
            }
          }

          async function checkPrice() {
            const tokenAddress = document.getElementById('token-address').value;
            if (!tokenAddress) {
              alert('Please enter a token address');
              return;
            }
            try {
              const response = await fetch('/api/webapp/price', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tokenAddress })
              });
              const data = await response.json();
              if (data.ok) {
                const t = data.token;
                document.getElementById('price-result').innerHTML = \`
                  <div class="card">
                    <h2>\${t.name} (\${t.symbol})</h2>
                    <div class="stat-grid">
                      <div class="stat-box">
                        <div class="stat-value">\${t.priceUsd ? '$' + parseFloat(t.priceUsd).toFixed(6) : 'N/A'}</div>
                        <div class="stat-label">Price</div>
                      </div>
                      <div class="stat-box">
                        <div class="stat-value">\${t.liquidityUsd ? '$' + (t.liquidityUsd / 1e6).toFixed(2) + 'M' : 'N/A'}</div>
                        <div class="stat-label">Liquidity</div>
                      </div>
                    </div>
                  </div>
                \`;
              } else {
                document.getElementById('price-result').innerHTML = '<div class="error">Token not found</div>';
              }
            } catch (error) {
              document.getElementById('price-result').innerHTML = '<div class="error">Error: ' + error.message + '</div>';
            }
          }

          // Tab switching
          document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const tab = btn.dataset.tab;
              document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
              document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
              btn.classList.add('active');
              document.getElementById(tab).classList.add('active');
            });
          });

          window.addEventListener('DOMContentLoaded', init);
        </script>
      </body>
      </html>
    `);
  });

  if (env.BOT_MODE === 'webhook') {
    app.use(bot.webhookCallback(\`/telegram/\${env.WEBHOOK_SECRET}\`));
  }

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ error }, 'Express error');
    res.status(500).json({ error: 'internal server error' });
  });

  return app;
}
