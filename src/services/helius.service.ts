import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env';
import { WalletTransaction } from '../types';

export class HeliusService {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: `https://api.helius.xyz/v0`,
      timeout: 15000,
      params: env.HELIUS_API_KEY ? { 'api-key': env.HELIUS_API_KEY } : {}
    });
  }

  async walletTransactions(address: string, limit = 5): Promise<WalletTransaction[]> {
    if (!env.HELIUS_API_KEY) return [];
    const { data } = await this.http.get(`/addresses/${address}/transactions`, { params: { limit } });
    return (data ?? []).map((tx: any) => ({
      signature: tx.signature,
      timestamp: tx.timestamp,
      description: tx.description,
      type: tx.type,
      amountUsd: this.estimateUsd(tx),
      tokenSymbol: tx.tokenTransfers?.[0]?.symbol,
      tokenAddress: tx.tokenTransfers?.[0]?.mint
    }));
  }

  private estimateUsd(tx: any, solPrice: number = 150): number | undefined {
    // TODO: Integrate a price cache (e.g., from DexScreener or Birdeye) 
    // to avoid hardcoding the SOL price.
    const native = tx.nativeTransfers?.reduce((sum: number, item: any) => sum + Math.abs(item.amount ?? 0), 0) ?? 0;
    if (!native) return undefined;
    return (native / 1_000_000_000) * solPrice;
  }
}
