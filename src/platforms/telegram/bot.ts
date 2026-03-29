// ============================================================
// src/platforms/telegram/bot.ts — Khởi tạo Telegraf instance
// ============================================================

import { Telegraf } from 'telegraf';
import { env } from '../../config/env';
import { createLogger } from '../../utils/logger';
import { registerCommands } from './commands';
import { registerCallbacks } from './callbacks';

const log = createLogger('Telegram');

// ── Tạo instance ────────────────────────────────────────────
export const telegramBot = new Telegraf(env.BOT_TELE_TOKEN);

// ── Middleware xử lý lỗi toàn cục ───────────────────────────
telegramBot.catch((err, ctx) => {
  log.error(`Lỗi Telegram cho ${ctx.updateType}:`, err);
});

// ── Khởi động bot ────────────────────────────────────────────
export async function startTelegramBot(): Promise<void> {
  // Đăng ký menu lệnh tự động gợi ý cho Telegram
  await telegramBot.telegram.setMyCommands([
    { command: 'nhac', description: 'Tạo nhắc nhở mới' },
    { command: 'tasks', description: 'Xem danh sách đang chờ' },
    { command: 'cancel', description: 'Hủy một nhắc nhở' },
  ]).catch(err => log.error('Lỗi setMyCommands:', err));

  // Đăng ký commands & callbacks
  registerCommands(telegramBot);
  registerCallbacks(telegramBot);

  // Launch bot (long polling)
  await telegramBot.launch();
  log.success('🤖 Telegram Bot đã online!');

  // Graceful stop
  process.once('SIGINT', () => telegramBot.stop('SIGINT'));
  process.once('SIGTERM', () => telegramBot.stop('SIGTERM'));
}
