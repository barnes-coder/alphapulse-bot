import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env';
import { TokenMarketData } from '../types';

export class DexScreenerService {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({ baseURL: env.DEXSCREENER_BASE_URL, timeout: 10000 });
  }

  async token(address: string): Promise<TokenMarketData | null> {
    const { data } = await this.http.get(`/tokens/${address}`);
    const pair = data?.pairs?.find((item: any) => item.chainId === 'solana') ?? data?.pairs?.[0];
    if (!pair) return null;
    return this.mapPair(pair, address);
  }

  async trendingSolana(): Promise<TokenMarketData[]> {
    const { data } = await this.http.get('/search', { params: { q: 'SOLANA' } });
    const pairs = (data?.pairs ?? []).filter((pair: any) => pair.chainId === 'solana').slice(0, 10);
    return pairs.map((pair: any) => this.mapPair(pair, pair.baseToken?.address));
  }

  private mapPair(pair: any, address: string): TokenMarketData {
    return {
      address,
      name: pair.baseToken?.name ?? 'Unknown Token',
      symbol: pair.baseToken?.symbol ?? 'UNKNOWN',
      priceUsd: Number(pair.priceUsd ?? 0),
      liquidityUsd: Number(pair.liquidity?.usd ?? 0),
      volume24h: Number(pair.volume?.h24 ?? 0),
      marketCap: pair.marketCap ? Number(pair.marketCap) : undefined,
      fdv: pair.fdv ? Number(pair.fdv) : undefined,
      pairUrl: pair.url,
      dexId: pair.dexId,
      ageHours: pair.pairCreatedAt ? Math.max(0, (Date.now() - Number(pair.pairCreatedAt)) / 36e5) : undefined
    };
  }
}
