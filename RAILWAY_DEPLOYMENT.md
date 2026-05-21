# Railway + GitHub Deployment Guide

Deploy your AlphaPulse bot **for FREE** to Railway using GitHub. No server costs, no domain needed.

## Why Railway?

- **Free tier**: $5 free credits/month (enough for a production bot)
- **Auto-scaling**: Handles traffic spikes
- **Built-in PostgreSQL & Redis**: No separate setup
- **GitHub integration**: Auto-deploys on push
- **No credit card required** for first deployment
- **24/7 uptime**: Your bot runs continuously

---

## Step 1: Prepare Your Code for GitHub

### 1.1 Initialize Git (if not already done)

Open VS Code terminal in your bot folder:

```powershell
cd C:\Users\Admin\Desktop\Telegrambot\CoinRadar_Bot
git init
```

### 1.2 Create .gitignore

A `.gitignore` file is already in place. It excludes:
- `.env` (never commit secrets)
- `node_modules`
- `dist`
- `*.log`

This keeps your code clean and safe.

### 1.3 Add All Files

```bash
git add .
git commit -m "Initial AlphaPulse bot - ready for Railway"
```

---

## Step 2: Create a GitHub Account & Repository

### 2.1 Sign Up for GitHub

Go to: https://github.com/signup

Create account with:
- Email
- Password
- Username (e.g., `your-username`)

### 2.2 Create a Repository

1. Log into GitHub
2. Click **+ New** (top right)
3. Create repository named: `alphapulse-bot`
4. **DO NOT** initialize with README (we'll push existing code)
5. Click **Create repository**

You'll see instructions. Copy the commands.

### 2.3 Push Your Code to GitHub

In VS Code terminal:

```bash
git remote add origin https://github.com/YOUR_USERNAME/alphapulse-bot.git
git branch -M main
git push -u origin main
```

**Example:**

```bash
git remote add origin https://github.com/john-crypto/alphapulse-bot.git
git branch -M main
git push -u origin main
```

When prompted:
- **Username**: your GitHub username
- **Password**: Create a **Personal Access Token**:
  1. Go: https://github.com/settings/tokens
  2. Click **Generate new token (classic)**
  3. Select: `repo` and `admin:repo_hook`
  4. Copy the token
  5. Paste as password in terminal

✅ Your code is now on GitHub!

Verify: https://github.com/YOUR_USERNAME/alphapulse-bot

---

## Step 3: Sign Up for Railway

Go to: https://railway.app

Click **Sign up** and use:
- GitHub login (easiest)

Railway connects directly to your GitHub repos.

---

## Step 4: Create a Railway Project

### 4.1 New Project

1. Log into Railway
2. Click **+ New Project**
3. Select **Deploy from GitHub repo**
4. Click **Configure GitHub App**

### 4.2 Authorize Railway on GitHub

Railway asks for permission to:
- Read your repos
- Deploy on push

Click **Authorize**.

### 4.3 Select Your Repository

1. Find `alphapulse-bot`
2. Click it
3. Click **Deploy Now**

Railway starts building automatically! ✅

---

## Step 5: Add PostgreSQL Database

### 5.1 In Railway Dashboard

1. Click **+ Add** (top right)
2. Select **Database**
3. Choose **PostgreSQL**

Railway creates the database and auto-generates `DATABASE_URL`.

### 5.2 Verify Connection

In the **DATABASE_URL** variable, you should see:

```
postgresql://postgres:password@host:5432/alphapulse?schema=public
```

---

## Step 6: Add Redis Cache

### 6.1 In Railway Dashboard

1. Click **+ Add**
2. Select **Database**
3. Choose **Redis**

Railway auto-generates `REDIS_URL`.

### 6.2 Verify Connection

You should see:

```
redis://:password@host:6379
```

---

## Step 7: Add Environment Variables

### 7.1 In Railway Dashboard

Click **Variables** tab.

### 7.2 Add Your Secrets

Create these variables:

| Variable | Value |
|----------|-------|
| `BOT_TOKEN` | Get from BotFather in Telegram |
| `ADMIN_TELEGRAM_IDS` | Your Telegram user ID (from @userinfobot) |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |

**Optional** (if using APIs):

| Variable | Value |
|----------|-------|
| `HELIUS_API_KEY` | Your Helius API key |
| `BIRDEYE_API_KEY` | Your Birdeye API key |
| `TONCENTER_API_KEY` | Your Toncenter API key |
| `AI_PROVIDER_URL` | Your AI provider URL |
| `AI_API_KEY` | Your AI API key |

**Payment** (if accepting crypto):

| Variable | Value |
|----------|-------|
| `SOL_PAYMENT_WALLET` | Your Solana wallet address |
| `SOL_USDT_PAYMENT_WALLET` | Your SPL USDT wallet address |
| `TON_PAYMENT_WALLET` | Your TON wallet address |

### 7.3 Save

Click **Save** after adding each variable.

Railway auto-connects `DATABASE_URL` and `REDIS_URL` from the services you created.

---

## Optional: Railway CLI Setup

If you want to use Railway from a terminal instead of the web UI, install the CLI and then run these commands.

### Install the Railway CLI

```bash
npm install -g @railway/cli
```

### Login

```bash
railway login
```

### Connect your repository

```bash
railway init
```

Choose the existing project or create a new one, then deploy:

```bash
railway up
```

This is useful when you want to manage deployment and environment variables from the shell.

---

## Step 8: Run Prisma Migration

### 8.1 In Railway Dashboard

1. Click the **app** service
2. Click **Connect** button
3. In the **Shell** tab, run:

```bash
npx prisma migrate deploy
```

This creates database tables.

If it says "No pending migrations", that's fine!

---

## Step 9: Deploy

### 9.1 Automatic Deploy

Railway automatically deploys when:
- You push code to GitHub
- You add/change environment variables
- You click **Redeploy**

Check the **Deployments** tab for status.

You should see:

```
✅ Build successful
✅ Deploy successful
```

### 9.2 View Logs

Click **View logs** to see bot startup:

```
🚀 Starting CoinRadar Bot initialization...
✅ Bot created
✅ Bot launched and polling for updates
✅ Express server ready on port 3000
```

---

## Step 10: Test Your Live Bot

Open Telegram and message your bot:

```
/start
```

If you get a reply:
✅ **Your bot is LIVE globally!**

Test more commands:

```
/help          → See all commands
/dashboard     → View your dashboard
/price SOL     → Check token price
/trending      → See trending tokens
```

---

## Step 11: Set Telegram Commands (BotFather)

In Telegram, message **@BotFather**:

```
/setcommands
```

Copy and paste:

```
start - Start the bot
help - Show help menu
track - Track a wallet
untrack - Stop tracking a wallet
wallets - View your wallets
price - Get token price
trending - Trending tokens
analyze - Premium token analysis
upgrade - Subscribe to premium
dashboard - View your dashboard
alerts - View alerts
stats - Show statistics
refer - Get referral link
settings - User settings
```

---

## Step 12: Set Bot Description

Message **@BotFather**:

```
/setdescription
```

Paste:

```
AlphaPulse - Your crypto intelligence bot for Solana wallet tracking, whale alerts, token analysis, and premium subscriptions. Track wallets, monitor whale activity, analyze token risk, and get trending token insights directly in Telegram.
```

---

## Step 13: Add Bot Profile Picture (Optional)

In Telegram:
1. Open your bot profile
2. Click **Edit**
3. Upload your AlphaPulse logo

---

## Step 14: Update Bot Short Description

Message **@BotFather**:

```
/setshortdescription
```

Paste:

```
Solana wallet tracking, whale alerts, token analysis, and premium crypto intelligence for Telegram
```

---

## ✅ You're Done!

Your bot is now:
- **Live globally** on Telegram
- **Running 24/7** on Railway
- **Automatically deploying** on GitHub pushes
- **Using free tier** (no credit card needed yet)

Your architecture:

```
GitHub Repo
    ↓
Railway (detects push)
    ↓
Builds + Deploys App
    ↓
PostgreSQL (auto-created)
    ↓
Redis (auto-created)
    ↓
Telegram Users
```

---

## Making Changes

Now if you update your bot:

1. Make changes locally
2. Test: `npm run dev`
3. Commit: `git add . && git commit -m "Update features"`
4. Push: `git push`

Railway **automatically redeploys** within seconds! ✅

---

## Railway Free Tier Limits

- **$5 free credits/month**
- **1 Postgres DB**: unlimited
- **1 Redis instance**: unlimited
- **App memory**: 512MB
- **CPU**: shared

For a bot handling 100+ users, the free tier is more than enough.

---

## Upgrade to Paid (When Ready)

If your bot grows and free tier runs out:

1. Add credit card to Railway
2. You only pay for what you use
3. Typically **$5–15/month** for a production bot

No downtime, no migration needed.

---

## Troubleshooting

### Bot not responding in Telegram

Check Railway logs:
- Click **View logs**
- Look for errors
- Common issues:
  - `BOT_TOKEN` is wrong
  - Database migration failed
  - Missing environment variables

### "No pending migrations"

This is OK! Means database is already set up. Your bot is ready.

### New environment variables not working

1. Add variable in Railway dashboard
2. Click **Redeploy** (or wait for auto-deploy)
3. Wait 30 seconds
4. Test bot again

### How do I check if bot is really running?

1. Go to Railway dashboard
2. Click your **app** service
3. Look for green **Deploy successful**
4. Message bot in Telegram to verify

---

## Next Steps

### Marketing Your Bot

1. Create a Telegram channel
2. Post bot link: `https://t.me/YOUR_BOT_USERNAME`
3. Share on Twitter/X
4. Add to bot directories: https://botlist.co

### Add Premium Payments

When you're ready to accept crypto:

1. Set wallet addresses in `.env`:
   - `SOL_PAYMENT_WALLET`
   - `SOL_USDT_PAYMENT_WALLET`
   - `TON_PAYMENT_WALLET`
2. Redeploy
3. Users can run `/upgrade` to subscribe

### Analytics & Monitoring

Railway dashboard shows:
- **Users**: Number of deployments
- **Memory usage**: Real-time
- **Logs**: Full bot activity

Set up alerts if needed (paid feature).

---

## You're Running a Real SaaS Bot! 🚀

No server. No domain. No costs (yet).

Just GitHub + Railway + Telegram.

That's enterprise infrastructure, completely free.

Congrats! 🎉
