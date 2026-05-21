import { AlertType } from '@prisma/client';

export function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 5)}...${address.slice(-5)}`;
}

export function usd(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return 'n/a';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1 ? 2 : 8
  }).format(value);
}

export function compact(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return 'n/a';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
}

export function alertIcon(type: AlertType): string {
  const icons: Record<AlertType, string> = {
    WALLET_ACTIVITY: '🚨',
    WHALE_BUY: '🐋',
    WHALE_SELL: '🐋',
    TOKEN_RISK: '⚠️',
    TRENDING_TOKEN: '🔥',
    LIQUIDITY_SPIKE: '💧',
    SYSTEM: 'ℹ️'
  };
  return icons[type];
}
