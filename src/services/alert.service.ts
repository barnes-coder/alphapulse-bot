import { AlertType } from '@prisma/client';
import { Telegraf } from 'telegraf';
import { AlertRepository } from '../database/repositories/alert.repository';
import { alertIcon } from '../utils/formatters';

export class AlertService {
  constructor(private readonly alerts: AlertRepository) {}

  async send(
    bot: Telegraf,
    input: {
      telegramId: bigint;
      userId: string;
      walletId?: string;
      type: AlertType;
      title: string;
      message: string;
      metadata?: object;
      delayMs?: number;
    }
  ) {
    const deliver = async () => {
      await bot.telegram.sendMessage(Number(input.telegramId), `${alertIcon(input.type)} *${input.title}*\n\n${input.message}`, {
        parse_mode: 'Markdown'
      });
      await this.alerts.create({ ...input, sentAt: new Date() });
    };

    if (input.delayMs && input.delayMs > 0) {
      setTimeout(() => void deliver(), input.delayMs);
      return;
    }

    await deliver();
  }
}
