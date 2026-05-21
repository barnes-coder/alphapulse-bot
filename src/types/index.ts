import { Context } from 'telegraf';
import { AppContainer } from '../container';
import { User } from '@prisma/client';

export type { AppContainer } from '../container';

export interface AlphaContext extends Context {
  container: AppContainer;
  user?: User;
  bot: any;
}

// Token types for API responses
export interface TokenMarketData {
  mint?: string;
  address?: string;
  symbol: string;
  name: string;
  priceUsd: number;
  liquidityUsd: number;
  marketCapUsd?: number;
  marketCap?: number;
  volumeUsd24h?: number;
  volume24h?: number;
  priceChange24h?: number;
  chainId?: string;
  fdv?: number;
  pairUrl?: string;
  dexId?: string;
  ageHours?: number;
}

export interface TokenRiskReport {
  riskScore?: number;
  score?: number;
  risks?: string[];
  signals?: string[];
  liquidity?: 'low' | 'medium' | 'high';
  age?: 'new' | 'emerging' | 'established';
  rugProbability?: number;
  summary?: string;
}

// Wallet types
export interface WalletTransaction {
  signature: string;
  type: string;
  timestamp: number;
  amount: number;
  amountUsd?: number;
  token: string;
  tokenSymbol?: string;
  description?: string;
}