import { Markup, Telegraf } from 'telegraf';
import { AlphaContext } from '../types';

const sampleWallets = [
  { address: 'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB', label: 'Jupiter swap aggregator' },
  { address: '9xQeWvG816bUx9EPdY8NQqamj8eZkYrj2DS1GuDDioBQ', label: 'Serum DEX engine' },
  { address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', label: 'Solana Token Program' },
  { address: 'ATokenGPvD5QJjfaKhr2S9TFXGbZa35vjD7Hy6x2zHZ4', label: 'Associated token account program' },
  { address: 'So11111111111111111111111111111111111111112', label: 'Wrapped SOL mint account' }
];

export function registerSuggestCommand(bot: Telegraf<AlphaContext>) {
  async function showSuggestions(ctx: AlphaContext) {
    await ctx.reply(
      [
        '*Starter Wallet Suggestions*',
        '',
        'Not sure what to track first? These public Solana accounts are active and a good way to explore alerts and activity.',
        '',
        ...sampleWallets.map((wallet, index) => `${index + 1}. *${wallet.label}* \n\\`${wallet.address}\``),
        '',
        'Track one with `/track <wallet>` or use `/wallets` to manage them later. Free users can track up to 5 wallets; premium users track unlimited wallets.'
      ].join('\n'),
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(sampleWallets.slice(0, 3).map((wallet) => [Markup.button.callback(`Track ${wallet.label}`, `quicktrack_${wallet.address}`)]))
      }
    );
  }

  bot.command('suggest', showSuggestions);

  bot.action(/^quicktrack_(.+)$/, async (ctx) => {
    const address = ctx.match[1];
    await ctx.answerCbQuery();
    await ctx.reply(`Use /track ${address} to add it to your watchlist.`);
  });
}
