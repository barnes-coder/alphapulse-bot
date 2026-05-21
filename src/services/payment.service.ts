import crypto from 'crypto';
import axios from 'axios';
import { Payment, PaymentStatus, PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { PriceService } from './price.service';

export type PaymentAsset = 'SOL' | 'USDT_SOL' | 'TON';

interface VerificationResult {
  confirmed: boolean;
  txHash?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export class PaymentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly priceService: PriceService
  ) {}

  verifyWebhook(signature: string | undefined, rawBody: string): boolean {
    if (!env.PAYMENT_WEBHOOK_SECRET) return true;
    if (!signature) return false;
    const expected = crypto.createHmac('sha256', env.PAYMENT_WEBHOOK_SECRET).update(rawBody).digest('hex');
    return this.safeCompare(signature, expected);
  }

  verifyNowPaymentsWebhook(signature: string | undefined, rawBody: string): boolean {
    if (!env.NOWPAYMENTS_IPN_SECRET) return true;
    if (!signature) return false;
    const expected = crypto.createHmac('sha512', env.NOWPAYMENTS_IPN_SECRET).update(rawBody).digest('hex');
    return this.safeCompare(signature, expected);
  }

  async createDirectInvoice(
    userId: string,
    asset: PaymentAsset,
    durationDays: number = env.PREMIUM_DURATION_DAYS,
    amountUsd: number = env.PREMIUM_MONTHLY_USD
  ): Promise<Payment> {
    const destinationAddress = this.destinationFor(asset);
    if (!destinationAddress) {
      throw new Error(`${asset} payment wallet is not configured`);
    }

    const invoiceCode = this.invoiceCode();
    const expectedAmount = await this.expectedAmount(asset, invoiceCode, amountUsd);
    const expiresAt = new Date(Date.now() + env.PAYMENT_INVOICE_TTL_MINUTES * 60 * 1000);

    return this.prisma.payment.create({
      data: {
        userId,
        provider: 'DIRECT_WALLET',
        asset,
        amount: expectedAmount,
        expectedAmount,
        destinationAddress,
        invoiceCode,
        status: 'PENDING',
        expiresAt,
        metadata: {
          instructions: this.instructionsFor(asset),
          durationDays,
          amountUsd
        }
      }
    });
  }

  async verifyDirectInvoice(paymentId: string, userId: string): Promise<VerificationResult> {
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId, userId } });
    if (!payment) return { confirmed: false, reason: 'Payment invoice not found.' };
    if (payment.status === 'CONFIRMED') {
      return { confirmed: true, txHash: payment.txHash ?? undefined, reason: 'Payment already confirmed.' };
    }
    if (payment.status !== 'PENDING') return { confirmed: false, reason: `Invoice is ${payment.status.toLowerCase()}.` };
    if (payment.expiresAt < new Date()) {
      await this.markExpired(payment.id);
      return { confirmed: false, reason: 'Invoice expired. Create a new invoice with /upgrade.' };
    }

    const result =
      payment.asset === 'TON'
        ? await this.verifyTonPayment(payment)
        : await this.verifySolanaPayment(payment, payment.asset === 'USDT_SOL');

    if (!result.confirmed || !result.txHash) return result;

    await this.confirmPayment(payment.id, result.txHash, result.metadata);
    return result;
  }

  async confirmNowPaymentsInvoice(invoiceId: string, txHash: string, metadata: Record<string, unknown>) {
    const payment = await this.prisma.payment.findUnique({ where: { invoiceCode: invoiceId } });
    if (!payment) throw new Error('Payment invoice not found');
    return this.confirmPayment(payment.id, txHash, metadata);
  }

  async createNowPaymentsPlaceholder(userId: string, asset: PaymentAsset): Promise<Payment> {
    const invoiceCode = this.invoiceCode();
    const expiresAt = new Date(Date.now() + env.PAYMENT_INVOICE_TTL_MINUTES * 60 * 1000);
    return this.prisma.payment.create({
      data: {
        userId,
        provider: 'NOWPAYMENTS',
        asset,
        amount: env.PREMIUM_MONTHLY_USD,
        expectedAmount: env.PREMIUM_MONTHLY_USD,
        invoiceCode,
        status: 'PENDING',
        expiresAt,
        metadata: {
          note: 'Create the external NOWPayments invoice and store its payment_id/invoice_id here before production use.'
        }
      }
    });
  }

  async pendingForUser(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId, status: 'PENDING', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' }
    });
  }

  private async confirmPayment(paymentId: string, txHash: string, metadata?: Record<string, unknown>) {
    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        txHash,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        metadata: metadata ? (metadata as any) : undefined
      }
    });

    const paymentMetadata = payment.metadata as any;
    const durationDays = typeof paymentMetadata?.durationDays === 'number'
      ? paymentMetadata.durationDays
      : env.PREMIUM_DURATION_DAYS;

    await this.prisma.subscription.create({
      data: {
        userId: payment.userId,
        plan: 'PREMIUM',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      }
    });

    return payment;
  }

  private markExpired(paymentId: string) {
    return this.prisma.payment.update({ where: { id: paymentId }, data: { status: 'EXPIRED' } });
  }

  private async verifySolanaPayment(payment: Payment, tokenTransfer: boolean): Promise<VerificationResult> {
    if (!env.HELIUS_API_KEY) return { confirmed: false, reason: 'HELIUS_API_KEY is required to verify Solana payments.' };
    if (!payment.destinationAddress || !payment.expectedAmount) return { confirmed: false, reason: 'Invoice is incomplete.' };

    const url = `https://api.helius.xyz/v0/addresses/${payment.destinationAddress}/transactions`;
    
    // Increase limit or use pagination if the destination wallet is very active
    const { data } = await axios.get(url, { 
      params: { 'api-key': env.HELIUS_API_KEY, limit: 50 },
      timeout: 15000
    });

    const expected = Number(payment.expectedAmount);
    const createdAtSeconds = Math.floor(payment.createdAt.getTime() / 1000);

    for (const tx of data ?? []) {
      if (!tx.signature || tx.timestamp < createdAtSeconds) continue;
      if (await this.isTxAlreadyUsed(tx.signature)) continue;

      const received = tokenTransfer
        ? this.usdtReceivedByDestination(tx, payment.destinationAddress)
        : this.solReceivedByDestination(tx, payment.destinationAddress);

      if (received >= expected) {
        return {
          confirmed: true,
          txHash: tx.signature,
          metadata: { verifier: 'helius', received, expected, asset: payment.asset }
        };
      }
    }

    return { confirmed: false, reason: 'No matching Solana payment found yet.' };
  }

  private async verifyTonPayment(payment: Payment): Promise<VerificationResult> {
    if (!payment.destinationAddress || !payment.expectedAmount) return { confirmed: false, reason: 'Invoice is incomplete.' };

    const { data } = await axios.get('https://toncenter.com/api/v2/getTransactions', {
      params: {
        address: payment.destinationAddress,
        limit: 50,
        api_key: env.TONCENTER_API_KEY || undefined
      },
      timeout: 15000
    });

    const expectedNano = Math.round(Number(payment.expectedAmount) * 1_000_000_000);
    const createdAtSeconds = Math.floor(payment.createdAt.getTime() / 1000);

    for (const tx of data?.result ?? []) {
      const txHash = tx.transaction_id?.hash;
      if (!txHash || tx.utime < createdAtSeconds) continue;
      if (await this.isTxAlreadyUsed(txHash)) continue;

      const value = Number(tx.in_msg?.value ?? 0);
      const comment = this.decodeTonComment(tx.in_msg?.msg_data?.text);
      const commentMatches = !comment || comment.includes(payment.invoiceCode);

      if (value >= expectedNano && commentMatches) {
        return {
          confirmed: true,
          txHash,
          metadata: { verifier: 'toncenter', receivedNano: value, expectedNano, invoiceCode: payment.invoiceCode }
        };
      }
    }

    return { confirmed: false, reason: 'No matching TON payment found yet.' };
  }

  private solReceivedByDestination(tx: any, destination: string): number {
    const lamports =
      tx.nativeTransfers
        ?.filter((transfer: any) => transfer.toUserAccount === destination)
        .reduce((sum: number, transfer: any) => sum + Number(transfer.amount ?? 0), 0) ?? 0;
    return lamports / 1_000_000_000;
  }

  private usdtReceivedByDestination(tx: any, destination: string): number {
    const amount =
      tx.tokenTransfers
        ?.filter((transfer: any) => transfer.toUserAccount === destination && transfer.mint === env.USDT_SPL_MINT)
        .reduce((sum: number, transfer: any) => sum + Number(transfer.tokenAmount ?? 0), 0) ?? 0;
    return amount;
  }

  private async isTxAlreadyUsed(txHash: string): Promise<boolean> {
    const existing = await this.prisma.payment.findUnique({ where: { txHash } });
    return Boolean(existing);
  }

  private destinationFor(asset: PaymentAsset): string {
    const wallets: Record<PaymentAsset, string> = {
      SOL: env.SOL_PAYMENT_WALLET ?? '',
      USDT_SOL: env.SOL_USDT_PAYMENT_WALLET ?? '',
      TON: env.TON_PAYMENT_WALLET ?? ''
    };
    return wallets[asset] ?? '';
  }

  private async expectedAmount(asset: PaymentAsset, invoiceCode: string, amountUsd: number): Promise<number> {
    const uniqueOffset = (parseInt(invoiceCode.slice(-4), 16) % 9000) / 1_000_000;
    if (asset === 'SOL') {
      const solPrice = await this.priceService.getSolPrice();
      return Number((amountUsd / solPrice + uniqueOffset).toFixed(6));
    }
    if (asset === 'TON') return Number((amountUsd / env.TON_USD_RATE + uniqueOffset).toFixed(6));
    return Number((amountUsd + uniqueOffset).toFixed(6));
  }

  private invoiceCode(): string {
    return `AP-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  }

  private instructionsFor(asset: PaymentAsset): string {
    if (asset === 'TON') return 'Send exact amount and include invoice code as the transfer comment when your wallet supports comments.';
    if (asset === 'USDT_SOL') return 'Send exact SPL USDT amount on Solana only. Do not send ERC20/TRC20 to this address.';
    return 'Send exact SOL amount on Solana.';
  }

  private decodeTonComment(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private safeCompare(value: string, expected: string): boolean {
    const left = Buffer.from(value);
    const right = Buffer.from(expected);
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  }
}
