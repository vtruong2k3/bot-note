// ============================================================
// src/index.ts — Entry Point: Khởi động tất cả
// ============================================================
// File này là "nút nguồn" của toàn bộ hệ thống.
// Nó sẽ:
//   1. Load & validate biến môi trường
//   2. Kết nối Database
//   3. Đăng ký Message Sender cho SpamService
//   4. Khởi động Telegram Bot
//   5. Khởi động Discord Bot
//   6. Khởi động Scheduler (cron job)
// ============================================================

import { env } from './config/env';
import { prisma } from './database/prisma';
import { createLogger } from './utils/logger';

// Platforms
import { telegramBot, startTelegramBot } from './platforms/telegram/bot';
import { discordClient, startDiscordBot } from './platforms/discord/bot';

// Services
import { startScheduler } from './services/scheduler';
import { registerMessageSender } from './services/spamService';

// Discord UI components
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
} from 'discord.js';

// Telegraf UI components
import { Markup } from 'telegraf';

const log = createLogger('Main');

// ── Main ─────────────────────────────────────────────────────
async function main(): Promise<void> {
  log.info('🚀 Khởi động BOT_Note...');

  // 1. Kiểm tra kết nối Database
  try {
    await prisma.$connect();
    log.success('🐘 Kết nối PostgreSQL thành công!');
  } catch (error) {
    log.error('❌ Không thể kết nối Database:', error);
    process.exit(1);
  }

  // 2. Đăng ký Message Sender cho SpamService
  //    SpamService không biết về Telegraf hay Discord.js
  //    → ta "tiêm" (inject) các hàm gửi tin nhắn vào đây.
  registerMessageSender({
    // ── Gửi tin nhắn Telegram ────────────────────────────────
    sendTelegram: async (chatId: string, text: string, taskId: number) => {
      await telegramBot.telegram.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('✅ Đã xong!', `done_${taskId}`),
            Markup.button.callback('⏰ Báo lại 5p', `snooze_${taskId}`),
          ],
        ]),
      });
    },

    // ── Gửi tin nhắn Discord ─────────────────────────────────
    sendDiscord: async (chatId: string, text: string, taskId: number) => {
      const channel = await discordClient.channels.fetch(chatId);
      if (channel && channel instanceof TextChannel) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`done_${taskId}`)
            .setLabel('✅ Đã xong!')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`snooze_${taskId}`)
            .setLabel('⏰ Báo lại 5p')
            .setStyle(ButtonStyle.Secondary)
        );

        await channel.send({ content: text, components: [row] });
      }
    },
  });

  // 3. Khởi động Discord trước (login resolve nhanh)
  await startDiscordBot();

  // 4. Khởi động Scheduler TRƯỚC khi gọi Telegram launch
  //    (vì telegramBot.launch() là long polling → KHÔNG BAO GIỜ resolve!)
  startScheduler();

  log.success('🎉 Tất cả hệ thống đã online! Bot sẵn sàng nhận lệnh.');
  log.info('📌 Telegram: Tìm bot và gõ /start');
  log.info('📌 Discord: Gõ /nhac trong server');

  // 5. Khởi động Telegram bot (long polling — dòng này sẽ KHÔNG resolve
  //    cho đến khi bot bị dừng, nên phải để CUỐI CÙNG)
  await startTelegramBot();
}

// ── Chạy ─────────────────────────────────────────────────────
main().catch((error) => {
  log.error('💀 Lỗi nghiêm trọng:', error);
  process.exit(1);
});
