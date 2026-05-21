# AlphaPulse HTTPS Deployment Guide

This guide walks you through deploying the bot permanently with HTTPS using Docker, Caddy, and a domain.

## Prerequisites

- A domain name (e.g., `yourdomain.com`)
- A Linux server or VPS (Ubuntu 20.04+, Debian 11+, or similar)
- SSH access to the server
- Docker and Docker Compose installed on the server
- About 2GB RAM and 10GB storage minimum

## Step 1: Get a Domain

1. Register a domain from a registrar:
   - Namecheap
   - GoDaddy
   - Google Domains
   - Cloudflare
   - etc.

2. You will get domain registrar credentials and DNS settings access.

## Step 2: Point Domain to Your Server

1. Get your server's IP address from your hosting provider.
2. Log into your domain registrar.
3. Find "DNS Settings" or "Manage DNS".
4. Update the `A` record to point to your server IP:
   ```
   Type: A
   Name: @ (or your domain)
   Value: your.server.ip.address
   TTL: 3600
   ```

5. Also create a subdomain if you want `api.yourdomain.com`:
   ```
   Type: A
   Name: api
   Value: your.server.ip.address
   TTL: 3600
   ```

6. Save and wait 5-30 minutes for DNS propagation.

**Test DNS**: From your computer, run:
```bash
nslookup yourdomain.com
```

You should see your server IP returned.

## Step 3: Prepare Your Server

SSH into your server:

```bash
ssh root@your.server.ip.address
```

Or use a tool like PuTTY if you prefer GUI.

### Install Docker and Docker Compose

**Ubuntu/Debian:**

```bash
apt update && apt upgrade -y
apt install -y docker.io docker-compose-v2 git curl wget
usermod -aG docker root
systemctl start docker
systemctl enable docker
```

**Verify installation:**

```bash
docker --version
docker compose version
```

## Step 4: Clone Your Bot Repository

On your server:

```bash
cd /opt
git clone https://github.com/your-username/CoinRadar_Bot.git
cd CoinRadar_Bot
```

Or copy your local files via SFTP/SCP if not using git.

## Step 5: Configure Environment Variables

Create `.env` file in the bot directory:

```bash
cat > .env << 'EOF'
# Telegram
BOT_TOKEN=your_telegram_bot_token_here
ADMIN_TELEGRAM_IDS=123456789
BOT_MODE=polling

# Database
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/alphapulse?schema=public
REDIS_URL=redis://redis:6379

# Web App
WEB_APP_URL=https://yourdomain.com/webapp
WEBHOOK_URL=https://yourdomain.com/telegram/your_webhook_secret
WEBHOOK_SECRET=your_webhook_secret

# Payment Wallets
SOL_PAYMENT_WALLET=your_sol_wallet_address
SOL_USDT_PAYMENT_WALLET=your_sol_usdt_wallet_address
TON_PAYMENT_WALLET=your_ton_wallet_address

# API Keys (optional)
HELIUS_API_KEY=your_helius_key
BIRDEYE_API_KEY=your_birdeye_key
TONCENTER_API_KEY=your_toncenter_key
AI_PROVIDER_URL=https://api.openai.com/v1
AI_API_KEY=your_ai_key

# HTTPS / Caddy
DOMAIN=yourdomain.com
TLS_EMAIL=your-email@example.com
EOF
```

**Important values to fill:**

- `BOT_TOKEN`: Get from Telegram BotFather
- `ADMIN_TELEGRAM_IDS`: Your Telegram user ID (get from @userinfobot)
- `DOMAIN`: Your actual domain (e.g., `coinradar.com`)
- `TLS_EMAIL`: Email for Let's Encrypt certificates
- `WEB_APP_URL`: Must match `https://DOMAIN/webapp`
- Wallet addresses for payments

## Step 6: Build and Deploy with Docker Compose

On your server, run:

```bash
cd /opt/CoinRadar_Bot
docker compose -f docker-compose.prod.yml up --build -d
```

This will:

1. Build the app container
2. Start PostgreSQL, Redis, the app, and Caddy
3. Caddy will automatically get HTTPS certificates for your domain

**Monitor the logs:**

```bash
docker compose -f docker-compose.prod.yml logs -f
```

You should see:

```
caddy_1    | {"level":"info","msg":"tls.obtain","name":"yourdomain.com",...}
app_1      | ✅ Bot launched and polling for updates
app_1      | ✅ Express server ready on port 3000
```

Press `Ctrl+C` to exit logs. Services keep running.

## Step 7: Verify Deployment

### Test HTTPS is working:

```bash
curl -I https://yourdomain.com
```

You should get:

```
HTTP/2 200
```

### Test the mini app endpoint:

```bash
curl https://yourdomain.com/webapp | head -20
```

You should see HTML content (the mini app page).

### Test from Telegram:

1. Message your bot `/start`
2. You should see the welcome message
3. Send `/app` (if WEB_APP_URL is set correctly, a button should appear)
4. Send `/dashboard` (should show your dashboard)

If the Web App button appears, Telegram recognizes your HTTPS URL!

## Step 8: Enable Automatic Restarts

Create a systemd service so the bot restarts if your server reboots:

```bash
cat > /etc/systemd/system/coinradar-bot.service << 'EOF'
[Unit]
Description=CoinRadar Bot with Docker Compose
Requires=docker.service
After=docker.service
PartOf=docker.service

[Service]
Type=oneshot
WorkingDirectory=/opt/CoinRadar_Bot
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
RemainAfterExit=yes
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

Enable it:

```bash
systemctl daemon-reload
systemctl enable coinradar-bot.service
systemctl start coinradar-bot.service
```

Verify:

```bash
systemctl status coinradar-bot.service
```

## Step 9: Backup and Monitoring

### Database Backup

Create a backup script:

```bash
cat > /usr/local/bin/backup-bot.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/coinradar"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker exec coinradar_bot-postgres-1 pg_dump -U postgres alphapulse > $BACKUP_DIR/db_$TIMESTAMP.sql
gzip $BACKUP_DIR/db_$TIMESTAMP.sql
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete
EOF

chmod +x /usr/local/bin/backup-bot.sh
```

Schedule daily backups:

```bash
crontab -e
# Add this line:
# 0 2 * * * /usr/local/bin/backup-bot.sh
```

### Check Bot Status

```bash
docker compose -f docker-compose.prod.yml ps
```

Expected output:

```
NAME              STATUS
coinradar-postgres   Up (healthy)
coinradar-redis      Up (healthy)
coinradar-app        Up
coinradar-caddy      Up
```

### View Logs

```bash
docker compose -f docker-compose.prod.yml logs --tail 100
```

## Step 10: Updates and Maintenance

### Pull latest code:

```bash
cd /opt/CoinRadar_Bot
git pull
```

### Rebuild and restart:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

### Stop the bot:

```bash
docker compose -f docker-compose.prod.yml down
```

## Troubleshooting

### Issue: Domain not resolving

```bash
nslookup yourdomain.com
```

If it does not show your IP, wait longer for DNS propagation or check registrar settings.

### Issue: HTTPS certificate not working

```bash
docker compose -f docker-compose.prod.yml logs caddy
```

Common causes:
- Port 80 is blocked
- Port 443 is blocked
- DNS not pointing to server yet
- Firewall blocking the ports

**Solution**: Open ports 80 and 443 on your server firewall.

### Issue: Bot not responding

```bash
docker compose -f docker-compose.prod.yml logs app
```

Check if bot token or database URL is wrong in `.env`.

### Issue: Mini app page shows error

1. Check that `WEB_APP_URL` matches your actual domain
2. Test the URL directly: `curl https://yourdomain.com/webapp`
3. Restart the bot: `docker compose -f docker-compose.prod.yml restart app`

## Cost Estimates

- **Domain**: $10–15/year
- **VPS/Server**: $5–50/month depending on specs
- **Total**: ~$65–615/year

Popular budget options:
- Linode: $5/month (1GB RAM, 25GB storage)
- DigitalOcean: $4/month (512MB RAM, 20GB storage)
- Vultr: $2.50/month (512MB RAM, 20GB storage)
- Hetzner: €3/month (1GB RAM, 25GB storage)

For a production bot, start with at least $5/month (1GB RAM).

## Next Steps

1. Register a domain
2. Set up a VPS
3. Follow steps 1–10 above
4. Test the bot in Telegram
5. Configure payment wallets if accepting payments
6. Set admin users in `ADMIN_TELEGRAM_IDS`
7. Monitor logs and backups regularly

## Security Reminders

- Keep your server and Docker updated
- Use strong `WEBHOOK_SECRET` and `BOT_TOKEN`
- Do not commit `.env` to git
- Monitor API rate limits
- Regularly back up the database
- Use firewall rules to limit SSH access
- Consider fail2ban for brute-force protection

---

You now have a permanent, public, HTTPS-enabled Telegram bot with a mini app!
