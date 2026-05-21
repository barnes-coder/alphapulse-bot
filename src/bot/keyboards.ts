import { Markup } from 'telegraf';
import { isHttpsUrl } from '../utils/validators';

export const homeKeyboard = (webAppUrl?: string) =>
  Markup.inlineKeyboard([
    [Markup.button.callback('Track Wallet', 'track_help'), Markup.button.callback('View Wallets', 'wallets')],
    [Markup.button.callback('Trending Tokens', 'trending'), Markup.button.callback('Upgrade', 'upgrade')],
    ...(isHttpsUrl(webAppUrl) ? [[{ text: 'Open App', web_app: { url: webAppUrl } }]] : [])
  ]);

