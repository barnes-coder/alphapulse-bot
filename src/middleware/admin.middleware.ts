import { AlphaContext } from '../types';

export async function requireAdmin(ctx: AlphaContext): Promise<boolean> {
  if (!ctx.user?.isAdmin) {
    await ctx.reply('Admin access required.');
    return false;
  }
  return true;
}
