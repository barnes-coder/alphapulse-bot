import axios from 'axios';
import { Redis } from 'ioredis';
import { env } from '../config/env';

export class PriceService {
  private readonly DEXSCREENER_URL = 'https://api.dexscreener.com/latest/dex/tokens';
  private readonly SOL_MINT = 'So11111111111111111111111111111111111111112';
  private readonly CACHE_KEY = 'cache:price:sol';
  private readonly CACHE_TTL_SEC = (env.PRICE_CACHE_TTL_MINUTES || 5) * 60;

  constructor(private readonly redis: Redis) {}

  /**
   * Fetches the current SOL price in USD from DexScreener.
   * It uses Redis caching to avoid frequent API calls.
   * @returns Current price or a fallback if the request fails.
   */
  async getSolPrice(): Promise<number> {
    try {
      const cached = await this.redis.get(this.CACHE_KEY);
      if (cached) return parseFloat(cached);
    } catch (err) {
      console.error('Redis lookup failed, falling back to API:', err);
    }

    try {
      const { data } = await axios.get(`${this.DEXSCREENER_URL}/${this.SOL_MINT}`);
      const priceUsd = data.pairs?.[0]?.priceUsd;
      
      if (!priceUsd) throw new Error('Price data missing in response');
      
      const newPrice = parseFloat(priceUsd);
      
      // Cache result in Redis (fail silently on cache set errors)
      await this.redis
        .set(this.CACHE_KEY, newPrice.toString(), 'EX', this.CACHE_TTL_SEC)
        .catch(() => null);

      return newPrice;
    } catch (error) {
      console.error('Failed to fetch real-time SOL price:', error);
      // Fallback to a safe default if API is down
      return 150.0;
    }
  }
}