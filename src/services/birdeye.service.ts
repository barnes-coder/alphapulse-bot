import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env';

export class BirdeyeService {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: 'https://public-api.birdeye.so',
      timeout: 10000,
      headers: env.BIRDEYE_API_KEY ? { 'X-API-KEY': env.BIRDEYE_API_KEY, 'x-chain': 'solana' } : {}
    });
  }

  async tokenOverview(address: string): Promise<Record<string, unknown> | null> {
    if (!env.BIRDEYE_API_KEY) return null;
    const { data } = await this.http.get('/defi/token_overview', { params: { address } });
    return data?.data ?? null;
  }
}
