import crypto from 'crypto';
import { env } from '../config/env';

export function parseTelegramInitData(initData: string) {
  const params = Object.fromEntries(new URLSearchParams(initData));
  if (params.user && typeof params.user === 'string') {
    try {
      params.user = JSON.parse(params.user as string);
    } catch {
      // ignore parse failure
    }
  }
  return params as Record<string, string | Record<string, unknown>>;
}

export function verifyTelegramInitData(initData: string) {
  const params = Object.fromEntries(new URLSearchParams(initData));
  const hash = params.hash as string | undefined;
  if (!hash) return false;

  delete params.hash;
  const dataCheckString = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(env.BOT_TOKEN).digest();
  const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return expectedHash === hash;
}
