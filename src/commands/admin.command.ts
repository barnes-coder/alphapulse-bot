import { Telegraf } from 'telegraf';
import { AlphaContext } from '../types';
import { requireAdmin } from '../middleware/admin.middleware';

export function registerAdminCommand(bot: Telegraf<AlphaContext>) {
  bot.command('restart', async (ctx) => {
    await ctx.reply(
      'Your session is closed. Send /start when you are ready to begin again.',
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('admin', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    await ctx.reply(
      [
        '*Admin Commands*',
        '',
        '`/broadcast <message>`',
        '`/grantpremium <telegramId> <days>`',
        '`/ban <telegramId>`',
        '`/lookup <telegramId>`',
        '`/restartbot`'
      ].join('\n'),
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('broadcast', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const message = ctx.message.text.replace(/^\/broadcast\s*/i, '').trim();
    if (!message) {
      await ctx.reply('Usage: /broadcast <message>');
      return;
    }
    const users = await ctx.container.users.allActiveTelegramUsers();
    let sent = 0;
    for (const user of users) {
      try {
        await ctx.telegram.sendMessage(Number(user.telegramId), message);
        sent += 1;
      } catch {
        // Ignore blocked bots and deleted accounts.
      }
    }
    await ctx.reply(`Broadcast sent to ${sent} users.`);
  });

  bot.command('grantpremium', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const [, telegramId, daysRaw] = ctx.message.text.split(/\s+/);
    const user = telegramId ? await ctx.container.users.findByTelegramId(telegramId) : null;
    if (!user) {
      await ctx.reply('Usage: /grantpremium <telegramId> <days>');
      return;
    }
    await ctx.container.subscriptions.grantPremium(user.id, Number(daysRaw ?? 30));
    await ctx.reply('Premium granted.');
  });

  bot.command('ban', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const [, telegramId] = ctx.message.text.split(/\s+/);
    const user = telegramId ? await ctx.container.users.findByTelegramId(telegramId) : null;
    if (!user) {
      await ctx.reply('Usage: /ban <telegramId>');
      return;
    }
    await ctx.container.users.setBanned(user.id, true);
    await ctx.reply('User banned.');
  });

  bot.command('lookup', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const [, telegramId] = ctx.message.text.split(/\s+/);
    const user = telegramId ? await ctx.container.users.findByTelegramId(telegramId) : null;
    if (!user) {
      await ctx.reply('User not found.');
      return;
    }
    await ctx.reply(
      [`ID: ${user.id}`, `Telegram: ${user.telegramId}`, `Username: ${user.username ?? 'n/a'}`, `Admin: ${user.isAdmin}`].join('\n')
    );
  });

  bot.command('restartbot', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    await ctx.reply('Admin restart initiated. The bot process will shut down and ts-node-dev will respawn it.');
    process.exit(0);
  });
}
