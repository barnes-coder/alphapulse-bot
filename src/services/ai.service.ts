import axios from 'axios';
import { env } from '../config/env';
import { TokenMarketData, TokenRiskReport } from '../types';
import { compact, usd } from '../utils/formatters';

export class AiService {
  async summarizeToken(token: TokenMarketData, risk: TokenRiskReport): Promise<string> {
    if (!env.AI_PROVIDER_URL || !env.AI_API_KEY) {
      return [
        `${token.symbol} shows a risk score of ${risk.score}/100 based on liquidity, volume, age, and market data.`,
        `Liquidity: ${usd(token.liquidityUsd)}. Volume: ${usd(token.volume24h)}. Market cap: ${compact(token.marketCap)}.`,
        risk.signals && risk.signals.length ? `Signals: ${risk.signals.join('; ')}` : 'No major automated risk signals were detected.'
      ].join('\n');
    }

    const { data } = await axios.post(
      env.AI_PROVIDER_URL,
      {
        model: env.AI_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a crypto risk assistant. Be concise, avoid financial advice, and summarize informational risk signals.'
          },
          {
            role: 'user',
            content: JSON.stringify({ token, risk })
          }
        ]
      },
      { headers: { Authorization: `Bearer ${env.AI_API_KEY}` }, timeout: 20000 }
    );

    return data?.choices?.[0]?.message?.content ?? 'AI summary unavailable.';
  }
}
