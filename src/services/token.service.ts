import { BirdeyeService } from './birdeye.service';
import { DexScreenerService } from './dexscreener.service';
import { TokenMarketData, TokenRiskReport } from '../types';

export class TokenService {
  constructor(
    private readonly dex: DexScreenerService,
    private readonly birdeye: BirdeyeService
  ) {}

  async marketData(address: string): Promise<TokenMarketData | null> {
    const dexData = await this.dex.token(address);
    if (!dexData) return null;
    const birdeye = await this.birdeye.tokenOverview(address);
    return {
      ...dexData,
      marketCap: Number(birdeye?.mc ?? dexData.marketCap ?? 0) || dexData.marketCap
    };
  }

  riskReport(token: TokenMarketData): TokenRiskReport {
    const signals: string[] = [];
    let score = 20;

    if (!token.liquidityUsd || token.liquidityUsd < 10000) {
      score += 25;
      signals.push('Low liquidity can amplify slippage and rug risk.');
    }
    if (!token.volume24h || token.volume24h < 5000) {
      score += 15;
      signals.push('Low 24h volume suggests weak demand or stale trading.');
    }
    if (token.ageHours !== undefined && token.ageHours < 24) {
      score += 20;
      signals.push('Token pair is less than 24 hours old.');
    }
    if (token.fdv && token.liquidityUsd && token.fdv / token.liquidityUsd > 100) {
      score += 20;
      signals.push('FDV is very high relative to liquidity.');
    }

    score = Math.min(100, score);
    return {
      score,
      rugProbability: Math.min(95, Math.round(score * 0.85)),
      signals,
      summary: score > 70 ? 'High risk' : score > 40 ? 'Moderate risk' : 'Lower observable risk'
    };
  }

  trending() {
    return this.dex.trendingSolana();
  }
}
