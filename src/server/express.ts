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

  app.post('/api/webapp/trending', async (req, res, next) => {
    try {
      const tokens = await container.tokens.trending();
      res.json({ ok: true, tokens: tokens.slice(0, 15) });
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
      const { initData, address } = req.body;
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
      await container.wallets.remove(user.id, address);
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
      const alerts = await container.alertsRepo.recentForUser(user.id, 100);
      const subscription = await container.subscriptionRepo.activeForUser(user.id);
      res.json({ ok: true, walletCount, alertCount: alerts.length, subscription: subscription?.plan || 'FREE', xp: user.xp });
    } catch (error) {
      next(error);
    }
  });

  app.get('/webapp', (_req, res) => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no" />
  <title>AlphaPulse</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body { width: 100%; height: 100%; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #e2e8f0;
      min-height: 100vh;
      padding-bottom: 65px;
      overflow-x: hidden;
      -webkit-user-select: none;
      user-select: none;
    }
    .container { max-width: 100%; margin: 0 auto; padding: 0.75rem; }
    .header { 
      background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
      padding: 1rem 0.75rem;
      border-radius: 12px;
      margin-bottom: 1rem;
      box-shadow: 0 8px 24px rgba(6, 182, 212, 0.15);
    }
    .header h1 { font-size: 1.5rem; margin-bottom: 0.2rem; font-weight: 700; }
    .header p { opacity: 0.9; font-size: 0.8rem; }
    .pages-wrapper { position: relative; min-height: 400px; }
    .page { 
      display: none;
      position: absolute;
      width: 100%;
      top: 0;
      left: 0;
      animation: slideInRight 0.3s ease-out forwards;
    }
    .page.active { display: block; }
    .page.exit { animation: slideOutLeft 0.3s ease-out forwards; }
    @keyframes slideInRight { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
    @keyframes slideOutLeft { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-100%); } }
    .card {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 1rem;
      margin-bottom: 0.75rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
    .card h2 { font-size: 0.95rem; margin-bottom: 0.6rem; color: #f1f5f9; font-weight: 600; }
    .stat-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.6rem;
      margin-bottom: 0.75rem;
    }
    .stat-box {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      padding: 0.7rem;
      border-radius: 10px;
      text-align: center;
      border: 1px solid #334155;
    }
    .stat-value { font-size: 1.4rem; font-weight: 700; color: #0ea5e9; }
    .stat-label { font-size: 0.7rem; color: #94a3b8; margin-top: 0.2rem; text-transform: uppercase; letter-spacing: 0.5px; }
    .item {
      background: #1e293b;
      padding: 0.8rem;
      border-radius: 10px;
      margin-bottom: 0.5rem;
      border-left: 3px solid #0ea5e9;
      transition: all 0.2s;
    }
    .item:active { background: #334155; }
    .item strong { color: #f1f5f9; display: block; margin-bottom: 0.2rem; font-size: 0.9rem; }
    .item-meta { font-size: 0.75rem; color: #94a3b8; margin-top: 0.3rem; }
    .input-group {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.6rem;
    }
    .input-group input {
      flex: 1;
      padding: 0.6rem;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #e2e8f0;
      font-size: 0.9rem;
    }
    .input-group input::placeholder { color: #64748b; }
    .btn {
      padding: 0.6rem 1rem;
      background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
      font-size: 0.85rem;
      box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
    }
    .btn:active { transform: scale(0.98); }
    .btn-full { width: 100%; margin-bottom: 0.5rem; }
    .btn-small {
      padding: 0.4rem 0.7rem;
      font-size: 0.75rem;
      margin-top: 0.4rem;
    }
    .btn-danger { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
    .error { background: #7f1d1d; color: #fca5a5; padding: 0.7rem; border-radius: 8px; margin-bottom: 0.75rem; font-size: 0.85rem; border-left: 3px solid #ef4444; }
    .empty { text-align: center; color: #64748b; padding: 1.5rem 0.75rem; font-size: 0.85rem; }
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #0f172a;
      border-top: 1px solid #334155;
      display: flex;
      justify-content: space-around;
      padding: 0.4rem 0;
      z-index: 100;
      box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.3);
    }
    .bottom-nav button {
      flex: 1;
      padding: 0.5rem;
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: 0.7rem;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.15rem;
    }
    .bottom-nav button.active { color: #0ea5e9; }
    .emoji { font-size: 1.1rem; }
    .loading { text-align: center; padding: 1rem; color: #94a3b8; }
    .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid #334155; border-top-color: #0ea5e9; border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .wallet-payment { background: #1e293b; padding: 0.8rem; border-radius: 10px; margin: 0.5rem 0; border: 1px solid #334155; }
    .wallet-payment strong { color: #0ea5e9; display: block; margin-bottom: 0.3rem; }
    .wallet-payment code { color: #94a3b8; font-size: 0.75rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>AlphaPulse</h1>
      <p id="user-greeting">Welcome back</p>
    </div>

    <div class="pages-wrapper">
      <!-- Dashboard Page -->
      <div id="dashboard" class="page active">
        <div class="card">
          <h2>📊 Your Stats</h2>
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
        <div class="card">
          <h2>⚡ Quick Actions</h2>
          <button class="btn btn-full" onclick="switchPage('wallets')">👛 Manage Wallets</button>
          <button class="btn btn-full" onclick="switchPage('trending')">🔥 View Trending</button>
          <button class="btn btn-full" onclick="switchPage('alerts')">🔔 View Alerts</button>
        </div>
      </div>

      <!-- Wallets Page -->
      <div id="wallets" class="page">
        <div class="card">
          <h2>Add Wallet</h2>
          <div class="input-group">
            <input type="text" id="wallet-address" placeholder="Wallet address" />
            <button class="btn" onclick="trackWallet()">Add</button>
          </div>
          <input type="text" id="wallet-label" placeholder="Label (optional)" style="width: 100%; padding: 0.6rem; background: #1e293b; border: 1px solid #334155; border-radius: 8px; color: #e2e8f0; margin-bottom: 0.6rem; font-size: 0.9rem;" />
        </div>
        <div class="card">
          <h2>Your Wallets</h2>
          <div id="wallets-list" class="empty">No wallets yet</div>
        </div>
      </div>

      <!-- Trending Page -->
      <div id="trending" class="page">
        <div class="card">
          <h2>🔥 Trending Tokens</h2>
          <div id="trending-list" class="empty">Loading...</div>
        </div>
      </div>

      <!-- Price Page -->
      <div id="price" class="page">
        <div class="card">
          <h2>💰 Check Price</h2>
          <div class="input-group">
            <input type="text" id="token-address" placeholder="Token address" />
            <button class="btn" onclick="checkPrice()">Search</button>
          </div>
          <div id="price-result"></div>
        </div>
      </div>

      <!-- Alerts Page -->
      <div id="alerts" class="page">
        <div class="card">
          <h2>🔔 Recent Alerts</h2>
          <div id="alerts-list" class="empty">No alerts yet</div>
        </div>
      </div>
    </div>
  </div>

  <div class="bottom-nav">
    <button class="nav-btn active" data-page="dashboard" onclick="switchPage('dashboard')"><span class="emoji">📊</span><span>Home</span></button>
    <button class="nav-btn" data-page="wallets" onclick="switchPage('wallets')"><span class="emoji">👛</span><span>Wallets</span></button>
    <button class="nav-btn" data-page="trending" onclick="switchPage('trending')"><span class="emoji">🔥</span><span>Trending</span></button>
    <button class="nav-btn" data-page="price" onclick="switchPage('price')"><span class="emoji">💰</span><span>Price</span></button>
    <button class="nav-btn" data-page="alerts" onclick="switchPage('alerts')"><span class="emoji">🔔</span><span>Alerts</span></button>
  </div>

  <script>
    let initData = null;
    let userData = null;

    async function init() {
      try {
        initData = window.Telegram?.WebApp?.initData;
        if (!initData) {
          document.querySelector('.container').innerHTML = '<div class="error">Please open from Telegram</div>';
          return;
        }

        const response = await fetch('/api/webapp/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData })
        });

        if (!response.ok) throw new Error('Failed to load');
        const data = await response.json();
        if (!data.ok) throw new Error(data.error);

        userData = data;
        const name = data.user.firstName || data.user.username || 'Trader';
        document.getElementById('user-greeting').textContent = 'Welcome, ' + name;
        
        loadDashboard();
        loadWallets();
        loadTrending();
        loadAlerts();
      } catch (error) {
        console.error(error);
      }
    }

    function switchPage(page) {
      const currentPage = document.querySelector('.page.active');
      const newPage = document.getElementById(page);
      
      if (currentPage) {
        currentPage.classList.remove('active');
      }
      
      newPage.classList.add('active');
      
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('[data-page="' + page + '"]').classList.add('active');
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
        list.innerHTML = '<div class="empty">No wallets tracked</div>';
        return;
      }
      let html = '';
      userData.wallets.forEach(w => {
        html += '<div class="item"><strong>' + (w.label || 'Wallet') + '</strong>' +
                '<code style="color: #94a3b8; font-size: 0.75rem;">' + w.address.slice(0, 6) + '...' + w.address.slice(-6) + '</code>' +
                '<button class="btn btn-small btn-danger" onclick="untrackWallet(' + "'" + w.address + "'" + ')">Remove</button></div>';
      });
      list.innerHTML = html;
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
          let html = '';
          data.tokens.forEach((t, i) => {
            html += '<div class="item"><strong>' + (i + 1) + '. ' + t.symbol + '</strong>' +
                    '<div style="color: #0ea5e9; font-weight: 600; margin: 0.2rem 0; font-size: 0.9rem;">' + (t.priceUsd ? '$' + parseFloat(t.priceUsd).toFixed(6) : 'N/A') + '</div>' +
                    '<div class="item-meta">Liq: ' + (t.liquidityUsd ? '$' + (t.liquidityUsd / 1e6).toFixed(1) + 'M' : 'N/A') + ' | Vol: ' + (t.volume24h ? '$' + (t.volume24h / 1e6).toFixed(1) + 'M' : 'N/A') + '</div></div>';
          });
          document.getElementById('trending-list').innerHTML = html;
        }
      } catch (error) {
        console.error('Error loading trending:', error);
      }
    }

    async function loadAlerts() {
      const list = document.getElementById('alerts-list');
      if (!userData?.alerts?.length) {
        list.innerHTML = '<div class="empty">No alerts</div>';
        return;
      }
      let html = '';
      userData.alerts.forEach(a => {
        html += '<div class="item"><strong>' + a.title + '</strong>' +
                '<div style="margin: 0.2rem 0; color: #cbd5e1; font-size: 0.8rem;">' + a.message + '</div>' +
                '<div class="item-meta">' + new Date(a.createdAt).toLocaleString() + '</div></div>';
      });
      list.innerHTML = html;
    }

    async function trackWallet() {
      const address = document.getElementById('wallet-address').value.trim();
      const label = document.getElementById('wallet-label').value.trim();
      if (!address) {
        alert('Enter wallet address');
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
        alert('Error: ' + error.message);
      }
    }

    async function untrackWallet(address) {
      if (!confirm('Remove wallet?')) return;
      try {
        const response = await fetch('/api/webapp/untrack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData, address })
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
      const tokenAddress = document.getElementById('token-address').value.trim();
      if (!tokenAddress) {
        alert('Enter token address');
        return;
      }
      document.getElementById('price-result').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
      try {
        const response = await fetch('/api/webapp/price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenAddress })
        });
        const data = await response.json();
        if (data.ok) {
          const t = data.token;
          let walletsHtml = '';
          if (userData?.wallets?.length) {
            walletsHtml = '<h3 style="color: #f1f5f9; margin: 0.75rem 0 0.5rem 0; font-size: 0.9rem;">💳 Payment Wallets</h3>';
            userData.wallets.forEach(w => {
              walletsHtml += '<div class="wallet-payment"><strong>' + (w.label || 'Wallet') + '</strong><code>' + w.address.slice(0, 8) + '...' + w.address.slice(-8) + '</code></div>';
            });
          } else {
            walletsHtml = '<div class="error" style="margin-top: 0.75rem;">No wallets tracked. Add wallets to make payments.</div>';
          }
          document.getElementById('price-result').innerHTML = '<div class="card"><h2>' + t.name + ' (' + t.symbol + ')</h2>' +
            '<div class="stat-grid"><div class="stat-box"><div class="stat-value">' + (t.priceUsd ? '$' + parseFloat(t.priceUsd).toFixed(6) : 'N/A') + '</div>' +
            '<div class="stat-label">Price</div></div><div class="stat-box"><div class="stat-value">' + (t.liquidityUsd ? '$' + (t.liquidityUsd / 1e6).toFixed(1) + 'M' : 'N/A') + '</div>' +
            '<div class="stat-label">Liquidity</div></div></div>' +
            '<div class="item-meta" style="margin-top: 0.6rem;">MC: ' + (t.marketCap ? '$' + (t.marketCap / 1e6).toFixed(1) + 'M' : 'N/A') + ' | FDV: ' + (t.fdv ? '$' + (t.fdv / 1e6).toFixed(1) + 'M' : 'N/A') + '</div>' +
            walletsHtml + '</div>';
        } else {
          document.getElementById('price-result').innerHTML = '<div class="error">Token not found</div>';
        }
      } catch (error) {
        document.getElementById('price-result').innerHTML = '<div class="error">Error: ' + error.message + '</div>';
      }
    }

    window.addEventListener('DOMContentLoaded', init);
  </script>
</body>
</html>`;
    res.send(html);
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
