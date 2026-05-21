# AlphaPulse

AlphaPulse is a production-style Telegram crypto intelligence bot for Solana wallet tracking, whale alerts, token analysis, premium subscriptions, referrals, and admin operations.

It is built as a deployable Node.js/TypeScript service with Telegraf, Express, PostgreSQL, Prisma, Redis-ready queues, Docker, and Railway configuration.

## ⚡ Quick Deploy (FREE)

Deploy to **Railway for free** with GitHub in 10 minutes:

1. Push code to GitHub
2. Connect Railway to your GitHub
3. Add `BOT_TOKEN` environment variable
4. Done! Bot runs 24/7 for free

Use:
- `setup-github-railway.sh` on macOS/Linux
- `setup-github-railway.bat` on Windows

👉 **[RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)** — Complete step-by-step guide

---

## What Is Implemented

- Telegram bot with polling and webhook modes
- User registration from Telegram profile data
- Referral codes and referral links
- Free and premium subscription architecture
- Solana wallet tracking with wallet limits
- Helius wallet polling integration
- Whale and wallet activity alerts
- DexScreener token price lookup
- Birdeye enrichment when an API key is available
- Token risk scoring and premium `/analyze`
- AI service abstraction with fallback analysis
- Inline keyboards for core flows
- Admin commands for broadcast, lookup, bans, and premium grants
- Express health endpoint and payment webhook route
- Direct-wallet invoices for SOL, SPL-USDT, and TON
- On-chain payment verification for automatic premium activation
- Prisma schema for users, subscriptions, wallets, alerts, payments, referrals, and settings
- Docker, Docker Compose, Railway config, ESLint, Prettier, and GitHub Actions

## Commands

```text
/start
/help
/track <wallet>
/untrack <wallet>
/wallets
/price <tokenAddress>
/trending
/whales
/alerts
/analyze <tokenAddress>
/upgrade
/refer
/settings
/stats
/admin
```

Admin-only commands:

```text
/broadcast <message>
/grantpremium <telegramId> <days>
/ban <telegramId>
/lookup <telegramId>
```

## Requirements

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Telegram bot token from BotFather
- Helius API key for Solana wallet monitoring
- Optional Birdeye API key for token enrichment
- Optional AI provider endpoint/key for external AI summaries

## Local Setup

1. Create your Telegram bot with BotFather and copy the token.
2. Copy `.env.example` to `.env`.
3. Fill in at least:

```env
BOT_TOKEN=your_telegram_token
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/alphapulse?schema=public
REDIS_URL=redis://localhost:6379
HELIUS_API_KEY=your_helius_key
ADMIN_TELEGRAM_IDS=123456789
SOL_PAYMENT_WALLET=your_solana_wallet_for_sol
SOL_USDT_PAYMENT_WALLET=your_solana_wallet_for_spl_usdt
TON_PAYMENT_WALLET=your_ton_wallet
```

4. Start Postgres and Redis:

```bash
docker compose up -d postgres redis
```

5. Install dependencies and prepare Prisma:

```bash
npm install
npx prisma generate
npm run prisma:migrate
```

6. Run the bot locally:

```bash
npm run dev
```

## Docker Setup

```bash
docker compose up --build
```

The bot service starts after database migrations are deployed.

## HTTPS Production Deployment

For a permanent HTTPS deployment with a public domain, use the provided Caddy reverse proxy and production compose file.

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for a complete step-by-step guide.**

Quick summary:

1. Register a domain
2. Point domain DNS to your server IP
3. SSH to your server and clone the repository
4. Fill in `.env` with `DOMAIN`, `BOT_TOKEN`, and wallet addresses
5. Run: `docker compose -f docker-compose.prod.yml up --build -d`
6. Caddy automatically obtains HTTPS certificates
7. Visit `https://yourdomain.com/webapp` to see your mini app

After deployment, set `WEB_APP_URL=https://yourdomain.com/webapp` and restart the bot to enable Telegram Web App buttons.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Domain registration
- DNS configuration
- Server setup
- Environment variables
- Monitoring
- Backups
- Troubleshooting

## Railway Deployment

1. Create a Railway project.
2. Add PostgreSQL and Redis services.
3. Add environment variables from `.env.example`.
4. Set `BOT_MODE=webhook`.
5. Set `WEBHOOK_URL` to your Railway public URL.
6. Set a strong `WEBHOOK_SECRET`.
7. Deploy with the included `railway.toml` and `Dockerfile`.

Health check:

```text
GET /health
```

## API Notes

### Helius

Used by `HeliusService` to poll wallet transactions:

```env
HELIUS_API_KEY=
```

Without the key, wallet polling returns no transactions, but the app still runs.

### DexScreener

Used by `/price` and `/trending`.

```env
DEXSCREENER_BASE_URL=https://api.dexscreener.com/latest/dex
```

### Birdeye

Optional enrichment:

```env
BIRDEYE_API_KEY=
```

### AI Provider

The AI abstraction supports OpenAI-compatible chat-completion style responses if configured:

```env
AI_PROVIDER_URL=
AI_API_KEY=
AI_MODEL=crypto-risk-analyst
```

If no AI provider is configured, AlphaPulse returns deterministic risk summaries from market data.

## Payment Architecture

The project includes direct-wallet payments and a NOWPayments webhook path.

### Direct Wallet Payments

Users can run `/upgrade`, choose SOL, USDT on Solana, or TON, and receive:

- pending payment records
- invoice code
- exact amount
- your receiving wallet address
- expiration time
- Verify Payment button

The bot verifies payments on-chain:

- SOL and SPL-USDT use Helius transaction history.
- TON uses Toncenter transaction history.
- Reused transaction hashes are rejected.
- Expired invoices are marked expired.
- Confirmed invoices activate premium automatically.

Configure receiving wallets in `.env`:

```env
PREMIUM_MONTHLY_USD=25
PREMIUM_DURATION_DAYS=30
PAYMENT_INVOICE_TTL_MINUTES=60
SOL_USD_RATE=150
TON_USD_RATE=5
SOL_PAYMENT_WALLET=
SOL_USDT_PAYMENT_WALLET=
TON_PAYMENT_WALLET=
USDT_SPL_MINT=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY1JNj8oE1LcJ8T
TONCENTER_API_KEY=
```

Important: `USDT_SOL` means SPL USDT on Solana. Do not tell users to send ERC20 or TRC20 USDT to the Solana wallet.

### NOWPayments

The endpoint is:

```text
POST /api/webhooks/nowpayments
```

Configure:

```env
NOWPAYMENTS_API_KEY=
NOWPAYMENTS_IPN_SECRET=
```

Before accepting real funds, test small transactions on each network and publish a clear refund/support policy.

## Production Best Practices

- Run in webhook mode behind HTTPS in production.
- Use separate worker processes for BullMQ notification jobs when alert volume grows.
- Store admin IDs in `ADMIN_TELEGRAM_IDS`.
- Do not custody user funds.
- Do not promise investment returns.
- Treat risk scores as informational analytics, not financial advice.
- Add request quotas around paid APIs.
- Add automated tests before taking payments.
- Monitor Telegram send failures and API rate limits.

## Next Phase

The strongest next additions are:

- automated renewal reminders
- Redis-backed notification queue delivery
- advanced Solana transaction classification
- copy-trading architecture with non-custodial signing
- Twitter/X trend scanning connector
- richer alert preferences
- full admin web dashboard
