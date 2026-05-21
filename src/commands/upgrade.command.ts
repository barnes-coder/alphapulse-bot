import { Markup, Telegraf } from 'telegraf';
import { AlphaContext } from '../types';
import { env } from '../config/env';
import { PaymentAsset } from '../services/payment.service';

type SubscriptionTerm = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

const assetLabels: Record<PaymentAsset, string> = {
  SOL: 'SOL',
  USDT_SOL: 'USDT on Solana',
  TON: 'TON'
};

const subscriptionTerms: Record<SubscriptionTerm, { label: string; amountUsd: number; durationDays: number }> = {
  WEEKLY: {
    label: 'Weekly',
    amountUsd: env.WEEKLY_SUBSCRIPTION_USD,
    durationDays: env.WEEKLY_SUBSCRIPTION_DAYS
  },
  BIWEEKLY: {
    label: 'Biweekly',
    amountUsd: env.BIWEEKLY_SUBSCRIPTION_USD,
    durationDays: env.BIWEEKLY_SUBSCRIPTION_DAYS
  },
  MONTHLY: {
    label: 'Monthly',
    amountUsd: env.PREMIUM_MONTHLY_USD,
    durationDays: env.PREMIUM_DURATION_DAYS
  }
};

export function registerUpgradeCommand(bot: Telegraf<AlphaContext>) {
  async function showUpgrade(ctx: AlphaContext) {
    const pending = await ctx.container.payments.pendingForUser(ctx.user!.id);
    await ctx.reply(
      [
        '*AlphaPulse Premium*',
        '',
        'Choose the subscription duration that fits you best:',
        `• *Weekly*: $${env.WEEKLY_SUBSCRIPTION_USD} for ${env.WEEKLY_SUBSCRIPTION_DAYS} days`,
        `• *Biweekly*: $${env.BIWEEKLY_SUBSCRIPTION_USD} for ${env.BIWEEKLY_SUBSCRIPTION_DAYS} days`,
        `• *Monthly*: $${env.PREMIUM_MONTHLY_USD} for ${env.PREMIUM_DURATION_DAYS} days`,
        '',
        'Premium unlocks instant alerts, expanded wallet tracking, AI token analysis, whale monitoring, and trending token intelligence.',
        '',
        pending.length ? `Open invoices: ${pending.length}` : 'Select a duration to continue with direct wallet payment.'
      ].join('\n'),
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(`Weekly $${env.WEEKLY_SUBSCRIPTION_USD}`, 'select_WEEKLY'), Markup.button.callback(`Biweekly $${env.BIWEEKLY_SUBSCRIPTION_USD}`, 'select_BIWEEKLY')],
          [Markup.button.callback(`Monthly $${env.PREMIUM_MONTHLY_USD}`, 'select_MONTHLY')]
        ])
      }
    );
  }

  async function showPaymentOptions(ctx: AlphaContext, term: SubscriptionTerm) {
    const option = subscriptionTerms[term];
    await ctx.reply(
      [
        `*${option.label} Premium*`,
        '',
        `Amount: *$${option.amountUsd}*`,
        `Duration: *${option.durationDays} days*`,
        '',
        'Choose a payment asset and create a direct wallet invoice.'
      ].join('\n'),
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('Pay SOL', `pay_${term}_SOL`), Markup.button.callback('Pay USDT-SOL', `pay_${term}_USDT_SOL`)],
          [Markup.button.callback('Pay TON', `pay_${term}_TON`)],
          [Markup.button.callback('Back', 'upgrade')]
        ])
      }
    );
  }

  bot.command('upgrade', showUpgrade);
  bot.action('upgrade', showUpgrade);

  bot.action(/^select_(WEEKLY|BIWEEKLY|MONTHLY)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const term = ctx.match[1] as SubscriptionTerm;
    await showPaymentOptions(ctx, term);
  });

  bot.action(/^pay_(WEEKLY|BIWEEKLY|MONTHLY)_(SOL|USDT_SOL|TON)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const term = ctx.match[1] as SubscriptionTerm;
    const asset = ctx.match[2] as PaymentAsset;
    const option = subscriptionTerms[term];

    try {
      const invoice = await ctx.container.payments.createDirectInvoice(ctx.user!.id, asset, option.durationDays, option.amountUsd);
      await ctx.reply(
        [
          '*Payment Invoice Created*',
          '',
          `Invoice: \`${invoice.invoiceCode}\``,
          `Plan: *${option.label} Premium*`,
          `Asset: *${assetLabels[asset]}*`,
          `Amount: \`${invoice.expectedAmount?.toString() ?? invoice.amount.toString()}\``,
          `Send to:`,
          `\`${invoice.destinationAddress}\``,
          '',
          String((invoice.metadata as any)?.instructions ?? 'Send the exact amount to the wallet above.'),
          '',
          `Expires: ${invoice.expiresAt.toISOString()}`,
          '',
          'After sending, tap Verify Payment.'
        ].join('\n'),
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([[Markup.button.callback('Verify Payment', `verify_${invoice.id}`)]])
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment setup failed.';
      await ctx.reply(`${message}\n\nAdd the receiving wallet address in your .env before accepting this payment method.`);
    }
  });

  bot.action(/^verify_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery('Checking blockchain...');
    const paymentId = ctx.match[1];
    const result = await ctx.container.payments.verifyDirectInvoice(paymentId, ctx.user!.id);

    if (result.confirmed) {
      await ctx.reply(
        [
          '*Payment Confirmed*',
          '',
          'Premium is now active on your account.',
          result.txHash ? `Transaction: \`${result.txHash}\`` : undefined
        ]
          .filter(Boolean)
          .join('\n'),
        { parse_mode: 'Markdown' }
      );
      return;
    }

    await ctx.reply(
      [
        '*Payment Not Found Yet*',
        '',
        result.reason ?? 'The transaction may still be confirming. Wait a minute, then tap Verify Payment again.'
      ].join('\n'),
      { parse_mode: 'Markdown' }
    );
  });
}
