import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.string().default('info'),
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),
  BOT_MODE: z.enum(['polling', 'webhook']).default('polling'),
  WEBHOOK_URL: z.string().url().optional().or(z.literal('')),
  WEBHOOK_SECRET: z.string().optional().or(z.literal('')),
  WEB_APP_URL: z.string().url().optional().or(z.literal('')),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  HELIUS_API_KEY: z.string().optional().or(z.literal('')),
  BIRDEYE_API_KEY: z.string().optional().or(z.literal('')),
  DEXSCREENER_BASE_URL: z.string().url().default('https://api.dexscreener.com/latest/dex'),
  AI_PROVIDER_URL: z.string().url().optional().or(z.literal('')),
  AI_API_KEY: z.string().optional().or(z.literal('')),
  AI_MODEL: z.string().default('crypto-risk-analyst'),
  ADMIN_TELEGRAM_IDS: z.string().optional().or(z.literal('')),
  FREE_WALLET_LIMIT: z.coerce.number().default(3),
  PREMIUM_WALLET_LIMIT: z.coerce.number().default(50),
  POLLING_INTERVAL_SECONDS: z.coerce.number().default(30),
  PRICE_CACHE_TTL_MINUTES: z.coerce.number().default(5),
  WHALE_USD_THRESHOLD: z.coerce.number().default(10000),
  PAYMENT_WEBHOOK_SECRET: z.string().optional().or(z.literal('')),
  PREMIUM_MONTHLY_USD: z.coerce.number().default(25),
  PREMIUM_DURATION_DAYS: z.coerce.number().default(30),
  WEEKLY_SUBSCRIPTION_USD: z.coerce.number().default(7),
  WEEKLY_SUBSCRIPTION_DAYS: z.coerce.number().default(7),
  BIWEEKLY_SUBSCRIPTION_USD: z.coerce.number().default(15),
  BIWEEKLY_SUBSCRIPTION_DAYS: z.coerce.number().default(14),
  PAYMENT_INVOICE_TTL_MINUTES: z.coerce.number().default(60),
  SOL_USD_RATE: z.coerce.number().default(150),
  TON_USD_RATE: z.coerce.number().default(5),
  SOL_PAYMENT_WALLET: z.string().optional().or(z.literal('')),
  SOL_USDT_PAYMENT_WALLET: z.string().optional().or(z.literal('')),
  TON_PAYMENT_WALLET: z.string().optional().or(z.literal('')),
  USDT_SPL_MINT: z.string().default('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY1JNj8oE1LcJ8T'),
  TONCENTER_API_KEY: z.string().optional().or(z.literal('')),
  NOWPAYMENTS_API_KEY: z.string().optional().or(z.literal('')),
  NOWPAYMENTS_IPN_SECRET: z.string().optional().or(z.literal(''))
});

export const env = envSchema.parse(process.env);

export const adminTelegramIds = new Set(
  (env.ADMIN_TELEGRAM_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
);
