# Deployment Checklist

Use this checklist to track your progress deploying AlphaPulse to production.

## Phase 1: Domain & Server Setup

- [ ] Register a domain name (Namecheap, GoDaddy, etc.)
- [ ] Get registrar account credentials
- [ ] Choose a VPS provider (DigitalOcean, Linode, Hetzner, etc.)
- [ ] Rent a VPS/server
- [ ] Get server IP address and root SSH credentials
- [ ] Test SSH connection to server
- [ ] Update domain DNS A record to point to server IP
- [ ] Wait for DNS propagation (5–30 minutes)
- [ ] Verify DNS: `nslookup yourdomain.com` shows your server IP

## Phase 2: Server Preparation

- [ ] SSH into server
- [ ] Update system: `apt update && apt upgrade -y`
- [ ] Install Docker: `apt install -y docker.io docker-compose-v2 git curl wget`
- [ ] Start Docker: `systemctl start docker && systemctl enable docker`
- [ ] Verify Docker: `docker --version && docker compose version`
- [ ] Clone/copy bot code to `/opt/CoinRadar_Bot`

## Phase 3: Configuration

- [ ] Get Telegram bot token from BotFather
- [ ] Get your Telegram user ID
- [ ] Create `.env` file in `/opt/CoinRadar_Bot`
- [ ] Fill in required values:
  - [ ] `BOT_TOKEN`
  - [ ] `ADMIN_TELEGRAM_IDS`
  - [ ] `DOMAIN`
  - [ ] `TLS_EMAIL`
  - [ ] `WEB_APP_URL` (set to `https://yourdomain.com/webapp`)
  - [ ] `SOL_PAYMENT_WALLET` (if accepting payments)
  - [ ] `SOL_USDT_PAYMENT_WALLET` (if accepting payments)
  - [ ] `TON_PAYMENT_WALLET` (if accepting payments)
- [ ] Fill in optional API keys:
  - [ ] `HELIUS_API_KEY`
  - [ ] `BIRDEYE_API_KEY`
  - [ ] `TONCENTER_API_KEY`

## Phase 4: Deployment

- [ ] SSH into server and navigate to bot directory
- [ ] Run: `docker compose -f docker-compose.prod.yml up --build -d`
- [ ] Wait for containers to start (1–2 minutes)
- [ ] Check logs: `docker compose -f docker-compose.prod.yml logs -f`
- [ ] Verify bot is running: `docker compose -f docker-compose.prod.yml ps`
- [ ] Look for messages:
  - [ ] "Bot launched and polling for updates"
  - [ ] "Express server ready on port 3000"
  - [ ] "Caddy" service is running

## Phase 5: Verification

- [ ] Test HTTPS: `curl -I https://yourdomain.com` (should return 200)
- [ ] Test mini app: `curl https://yourdomain.com/webapp | head -20` (should show HTML)
- [ ] Send `/start` to your bot in Telegram
- [ ] Send `/help` in Telegram (should see all commands)
- [ ] Send `/dashboard` in Telegram
- [ ] Send `/app` in Telegram (should see Web App button if WEB_APP_URL is set correctly)
- [ ] Click the Web App button and verify the mini app loads

## Phase 6: Maintenance Setup

- [ ] Create systemd service for auto-restart: `coinradar-bot.service`
- [ ] Enable service: `systemctl enable coinradar-bot.service`
- [ ] Create backup script: `/usr/local/bin/backup-bot.sh`
- [ ] Schedule backups in crontab: `crontab -e`

## Phase 7: Production Readiness

- [ ] Verify firewall opens ports 80 and 443
- [ ] Test bot commands: `/track`, `/price`, `/wallets`, etc.
- [ ] If accepting payments, test payment flow with small amount
- [ ] Set up error monitoring or logging
- [ ] Create support documentation for users
- [ ] Document admin procedures

## Phase 8: Launch

- [ ] Announce bot is live
- [ ] Start accepting users
- [ ] Monitor logs regularly: `docker compose -f docker-compose.prod.yml logs -f`
- [ ] Monitor database: `docker exec coinradar_bot-postgres-1 psql -U postgres alphapulse`
- [ ] Keep backups current
- [ ] Track API usage and costs

---

## Quick Commands Reference

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Check status
docker compose -f docker-compose.prod.yml ps

# Restart bot
docker compose -f docker-compose.prod.yml restart app

# Restart all services
docker compose -f docker-compose.prod.yml restart

# Stop bot
docker compose -f docker-compose.prod.yml down

# Rebuild and deploy
docker compose -f docker-compose.prod.yml up --build -d

# SSH backup database
docker exec coinradar_bot-postgres-1 pg_dump -U postgres alphapulse > backup.sql

# View environment
cat .env
```

---

## Support

If you encounter issues:

1. Check logs: `docker compose -f docker-compose.prod.yml logs app`
2. Review [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting section
3. Ensure DNS is propagated
4. Verify firewall allows ports 80 and 443
5. Check `.env` file for typos or missing values
