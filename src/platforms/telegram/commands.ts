// ============================================================
// src/platforms/telegram/commands.ts — Xử lý lệnh Telegram
// ============================================================

import { Telegraf, Markup } from 'telegraf';
import { upsertUser } from '../../services/userService';
import { createTask, getUserPendingTasks, cancelTask } from '../../services/taskService';
import { parseTime } from '../../utils/timeParser';
import { PRIORITY_LABELS, STATUS_EMOJI } from '../../utils/messages';
import { createLogger } from '../../utils/logger';
import { Platform, Priority } from '@prisma/client';

const log = createLogger('Tele:Commands');

// ── Lưu tạm thông tin task đang chờ chọn priority ───────────
// Map: `telegramUserId` → { content, scheduledAt, chatId }
const pendingTaskData = new Map<string, {
  content: string;
  scheduledAt: Date;
  chatId: string;
  userId: number;
}>();

export { pendingTaskData };

// ── Đăng ký tất cả commands ──────────────────────────────────
export function registerCommands(bot: Telegraf): void {

  // ┌─────────────────────────────────────────────────────────
  // │ /start — Chào mừng + Tạo User
  // └─────────────────────────────────────────────────────────
  bot.start(async (ctx) => {
    try {
      const telegramId = ctx.from.id.toString();
      await upsertUser(telegramId, Platform.TELEGRAM, {
        username: ctx.from.username,
        firstName: ctx.from.first_name,
      });

      await ctx.reply(
        `🎉 Chào mừng bạn đến với *BOT Nhắc Nhở*!\n\n` +
        `Tôi sẽ giúp bạn nhớ mọi thứ bằng cách... *spam tin nhắn không thương tiếc* 😈\n\n` +
        `📌 *Các lệnh:*\n` +
        `• /nhac <thời gian> <nội dung> — Đặt nhắc nhở\n` +
        `• /tasks — Xem danh sách nhắc nhở\n` +
        `• /cancel <id> — Hủy nhắc nhở\n\n` +
        `⏱️ *Ví dụ thời gian:*\n` +
        `• \`/nhac 30m Uống nước\`\n` +
        `• \`/nhac 2h Họp team\`\n` +
        `• \`/nhac 14:30 Nộp báo cáo\``,
        { parse_mode: 'Markdown' }
      );

      log.info(`User ${ctx.from.first_name} (@${ctx.from.username}) đã /start.`);
    } catch (error) {
      log.error('Lỗi /start:', error);
      await ctx.reply('❌ Có lỗi xảy ra. Vui lòng thử lại.');
    }
  });

  // ┌─────────────────────────────────────────────────────────
  // │ /nhac — Tạo nhắc nhở mới
  // └─────────────────────────────────────────────────────────
  bot.command('nhac', async (ctx) => {
    try {
      const telegramId = ctx.from.id.toString();
      const user = await upsertUser(telegramId, Platform.TELEGRAM, {
        username: ctx.from.username,
        firstName: ctx.from.first_name,
      });

      // Parse message: /nhac <time> <content>
      const text = ctx.message.text.replace('/nhac', '').trim();

      if (!text) {
        await ctx.reply(
          '⚠️ Vui lòng nhập đúng format:\n' +
          '`/nhac <thời gian> <nội dung>`\n\n' +
          '📌 Ví dụ: `/nhac 30m Uống nước`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Tách time và content: lấy phần đầu tiên là thời gian
      const parts = text.split(/\s+/);
      const timeText = parts[0];
      const content = parts.slice(1).join(' ');

      if (!content) {
        await ctx.reply(
          '⚠️ Thiếu nội dung nhắc nhở!\n' +
          'Ví dụ: `/nhac 30m Nộp báo cáo`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Parse thời gian
      const parsed = parseTime(timeText);
      if (!parsed) {
        await ctx.reply(
          '⚠️ Không hiểu thời gian này!\n\n' +
          '📌 Các format hỗ trợ:\n' +
          '• `30m` hoặc `30p` — 30 phút nữa\n' +
          '• `2h` — 2 tiếng nữa\n' +
          '• `14:30` — lúc 14:30\n' +
          '• `1d` — 1 ngày nữa',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Lưu tạm, chờ chọn priority
      pendingTaskData.set(telegramId, {
        content,
        scheduledAt: parsed.date,
        chatId: ctx.chat.id.toString(),
        userId: user.id,
      });

      // Hiển thị menu chọn priority
      await ctx.reply(
        `📝 *Nhắc nhở:* ${content}\n` +
        `⏰ *Thời gian:* ${parsed.display}\n\n` +
        `Chọn mức độ khẩn cấp:`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback(PRIORITY_LABELS.GREEN, 'priority_GREEN'),
              Markup.button.callback(PRIORITY_LABELS.YELLOW, 'priority_YELLOW'),
              Markup.button.callback(PRIORITY_LABELS.RED, 'priority_RED'),
            ],
          ]),
        }
      );

      log.info(`User ${ctx.from.first_name} tạo nhắc nhở: "${content}" lúc ${parsed.display}`);
    } catch (error) {
      log.error('Lỗi /nhac:', error);
      await ctx.reply('❌ Có lỗi xảy ra. Vui lòng thử lại.');
    }
  });

  // ┌─────────────────────────────────────────────────────────
  // │ /tasks — Xem danh sách task đang chờ
  // └─────────────────────────────────────────────────────────
  bot.command('tasks', async (ctx) => {
    try {
      const telegramId = ctx.from.id.toString();
      const user = await upsertUser(telegramId, Platform.TELEGRAM, {
        username: ctx.from.username,
        firstName: ctx.from.first_name,
      });

      const tasks = await getUserPendingTasks(user.id);

      if (tasks.length === 0) {
        await ctx.reply('📭 Bạn không có nhắc nhở nào đang chờ.');
        return;
      }

      let message = '📋 *Danh sách nhắc nhở:*\n\n';
      for (const task of tasks) {
        const time = task.scheduledAt.toLocaleString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          hour12: false,
        });
        const emoji = STATUS_EMOJI[task.status] || '❓';
        const priorityLabel = PRIORITY_LABELS[task.priority];
        message += `${emoji} *#${task.id}* — ${task.content}\n`;
        message += `   ⏰ ${time} | ${priorityLabel}\n\n`;
      }

      message += `💡 Hủy bằng: \`/cancel <id>\``;
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      log.error('Lỗi /tasks:', error);
      await ctx.reply('❌ Có lỗi xảy ra. Vui lòng thử lại.');
    }
  });

  // ┌─────────────────────────────────────────────────────────
  // │ /cancel — Hủy task
  // └─────────────────────────────────────────────────────────
  bot.command('cancel', async (ctx) => {
    try {
      const text = ctx.message.text.replace('/cancel', '').trim();
      const taskId = parseInt(text, 10);

      if (isNaN(taskId)) {
        await ctx.reply(
          '⚠️ Vui lòng nhập ID:\n`/cancel 5`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      await cancelTask(taskId);
      await ctx.reply(`✅ Đã hủy nhắc nhở #${taskId}.`);
      log.info(`Task #${taskId} đã bị hủy bởi ${ctx.from.first_name}.`);
    } catch (error) {
      log.error('Lỗi /cancel:', error);
      await ctx.reply('❌ Không tìm thấy nhắc nhở hoặc có lỗi xảy ra.');
    }
  });
}
