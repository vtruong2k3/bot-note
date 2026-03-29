// ============================================================
// src/platforms/telegram/callbacks.ts — Xử lý nút bấm Telegram
// ============================================================

import { Telegraf } from 'telegraf';
import { createTask, markDone, snoozeTask } from '../../services/taskService';
import { PRIORITY_LABELS } from '../../utils/messages';
import { createLogger } from '../../utils/logger';
import { Platform, Priority } from '@prisma/client';
import { pendingTaskData } from './commands';

const log = createLogger('Tele:Callbacks');

// ── Đăng ký tất cả callback handlers ────────────────────────
export function registerCallbacks(bot: Telegraf): void {

  // ┌─────────────────────────────────────────────────────────
  // │ Callback: Chọn Priority (priority_GREEN / YELLOW / RED)
  // └─────────────────────────────────────────────────────────
  for (const priority of ['GREEN', 'YELLOW', 'RED'] as Priority[]) {
    bot.action(`priority_${priority}`, async (ctx) => {
      try {
        await ctx.answerCbQuery();

        const telegramId = ctx.from!.id.toString();
        const data = pendingTaskData.get(telegramId);

        if (!data) {
          await ctx.editMessageText('⚠️ Phiên đã hết hạn. Vui lòng tạo lại bằng /nhac.');
          return;
        }

        // Tạo task trong DB
        const task = await createTask({
          content: data.content,
          scheduledAt: data.scheduledAt,
          priority,
          platform: Platform.TELEGRAM,
          chatId: data.chatId,
          userId: data.userId,
        });

        // Xóa dữ liệu tạm
        pendingTaskData.delete(telegramId);

        // Format thời gian hiển thị
        const timeDisplay = task.scheduledAt.toLocaleString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          hour12: false,
        });

        const label = PRIORITY_LABELS[priority];

        await ctx.editMessageText(
          `✅ *Đã lên lịch thành công!*\n\n` +
          `📝 *Nội dung:* ${task.content}\n` +
          `⏰ *Thời gian:* ${timeDisplay}\n` +
          `🎯 *Mức độ:* ${label}\n` +
          `🆔 *ID:* #${task.id}`,
          { parse_mode: 'Markdown' }
        );

        log.success(`Task #${task.id} đã tạo: "${task.content}" | ${priority}`);
      } catch (error) {
        log.error(`Lỗi callback priority_${priority}:`, error);
        await ctx.editMessageText('❌ Có lỗi xảy ra khi tạo nhắc nhở.');
      }
    });
  }

  // ┌─────────────────────────────────────────────────────────
  // │ Callback: Đã xong (done_<taskId>)
  // └─────────────────────────────────────────────────────────
  bot.action(/^done_(\d+)$/, async (ctx) => {
    try {
      await ctx.answerCbQuery('✅ Tuyệt vời!');

      const taskId = parseInt(ctx.match[1], 10);
      await markDone(taskId);

      await ctx.editMessageText(
        `✅ *Hoàn thành!* Nhắc nhở #${taskId} đã xong.\n` +
        `Giỏi lắm! 🎉`,
        { parse_mode: 'Markdown' }
      );

      log.success(`Task #${taskId} đã hoàn thành (bấm Done).`);
    } catch (error) {
      log.error('Lỗi callback done:', error);
    }
  });

  // ┌─────────────────────────────────────────────────────────
  // │ Callback: Báo lại sau (snooze_<taskId>)
  // └─────────────────────────────────────────────────────────
  bot.action(/^snooze_(\d+)$/, async (ctx) => {
    try {
      await ctx.answerCbQuery('⏰ Đã hoãn 5 phút!');

      const taskId = parseInt(ctx.match[1], 10);
      const updated = await snoozeTask(taskId, 5);

      if (updated) {
        const newTime = updated.scheduledAt.toLocaleString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

        await ctx.editMessageText(
          `😴 *Đã hoãn nhắc nhở #${taskId}*\n` +
          `⏰ Sẽ nhắc lại lúc: ${newTime}\n` +
          `📊 Số lần hoãn: ${updated.snoozeCount}`,
          { parse_mode: 'Markdown' }
        );

        log.info(`Task #${taskId} đã snooze lần thứ ${updated.snoozeCount}.`);
      }
    } catch (error) {
      log.error('Lỗi callback snooze:', error);
    }
  });
}
