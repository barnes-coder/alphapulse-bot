import { z } from 'zod';

export const solanaAddressSchema = z
  .string()
  .trim()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid Solana address');

export const tokenAddressSchema = solanaAddressSchema;

export function parseCommandArg(text: string | undefined, index = 1): string | undefined {
  return text?.split(/\s+/).map((part) => part.trim()).filter(Boolean)[index];
}

export function safeMarkdown(input: string): string {
  return input.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

export function isHttpsUrl(value?: string): value is string {
  return typeof value === 'string' && value.startsWith('https://');
}
