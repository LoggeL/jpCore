import pino from 'pino';
import { config } from '../config.js';

export const logger = pino({
  level: config.isProd ? 'info' : 'debug',
  transport: config.isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
      },
  base: { service: 'jpcore' },
});

/**
 * Port of routes/poolparty/logger.js — broadcasts a key/value payload to Telegram
 * as a markdown-formatted message. No-ops if TELEGRAM_* env vars aren't set.
 * Errors from the fetch are logged but never thrown (fire-and-forget).
 */
export function broadcast(data: Record<string, unknown>): void {
  logger.info({ broadcast: data }, 'broadcast');
  if (!config.telegram) return;

  let text = '';
  for (const [key, value] of Object.entries(data)) {
    const keyCap = key.charAt(0).toUpperCase() + key.slice(1);
    text += `*${keyCap}*: ${String(value)}\n`;
  }

  const payload = {
    chat_id: config.telegram.chatId,
    text,
    parse_mode: 'markdown',
  };

  fetch(`https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  }).catch((err: unknown) => {
    logger.error({ err }, 'telegram broadcast failed');
  });
}
