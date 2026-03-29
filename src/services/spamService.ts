// ============================================================
// src/services/spamService.ts — "Khẩu súng máy" spam tin nhắn
// ============================================================
// Logic trung tâm: nhận 1 Task đến hạn, xác định số tin cần
// bắn theo Priority, rồi vòng lặp gửi tin nhắn qua đúng nền
// tảng (Telegram hoặc Discord). Giữa mỗi tin, kiểm tra xem
// user đã bấm "Done" chưa → nếu rồi thì dừng ngay.
// ============================================================

import { Task, User, Platform } from '@prisma/client';
import { createLogger } from '../utils/logger';
import { getSpamMessage, SPAM_COUNTS, SPAM_DELAY_MS } from '../utils/messages';
import {
  markSpamming,
  incrementSpamCount,
  isTaskStillSpamming,
  markDone,
} from './taskService';

const log = createLogger('SpamService');

// ── Type cho task kèm user ───────────────────────────────────
type TaskWithUser = Task & { user: User };

// ── Interface cho các sender function ────────────────────────
// SpamService không import trực tiếp bot instance → thay vào
// đó nhận sender function từ bên ngoài truyền vào khi khởi tạo.
// Điều này giúp code không bị phụ thuộc vòng (circular dependency).
export interface MessageSender {
  sendTelegram: (chatId: string, text: string, taskId: number) => Promise<void>;
  sendDiscord: (chatId: string, text: string, taskId: number) => Promise<void>;
}

let messageSender: MessageSender | null = null;

// ── Đăng ký sender (gọi 1 lần khi khởi động) ────────────────
export function registerMessageSender(sender: MessageSender): void {
  messageSender = sender;
  log.info('Đã đăng ký Message Sender.');
}

// ── Helper: Sleep ────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── EXECUTE: Hàm chính — "bắn tin nhắn" ─────────────────────
export async function executeSpam(task: TaskWithUser): Promise<void> {
  if (!messageSender) {
    log.error('MessageSender chưa được đăng ký! Không thể spam.');
    return;
  }

  // 1. Lock task → SPAMMING
  await markSpamming(task.id);
  log.info(
    `🔫 Bắt đầu spam Task #${task.id} "${task.content}" | ` +
    `Priority: ${task.priority} | Platform: ${task.platform}`
  );

  // 2. Xác định số tin cần bắn
  const count = SPAM_COUNTS[task.priority];

  // 3. Vòng lặp spam
  for (let i = 0; i < count; i++) {
    // Kiểm tra xem user đã bấm Done chưa (hết spam giữa chừng)
    if (i > 0) {
      const stillSpamming = await isTaskStillSpamming(task.id);
      if (!stillSpamming) {
        log.info(`✅ Task #${task.id} đã được đánh dấu DONE giữa chừng. Dừng spam.`);
        return;
      }
    }

    // Lấy nội dung tin nhắn leo thang
    const message = getSpamMessage(i, task.content);

    // Gửi tin nhắn qua đúng nền tảng
    try {
      if (task.platform === Platform.TELEGRAM) {
        await messageSender.sendTelegram(task.chatId, message, task.id);
      } else {
        await messageSender.sendDiscord(task.chatId, message, task.id);
      }

      // Cập nhật đếm
      await incrementSpamCount(task.id);
      log.info(`📨 Task #${task.id} | Tin ${i + 1}/${count} đã gửi.`);
    } catch (error) {
      log.error(`Lỗi gửi tin Task #${task.id} (tin ${i + 1}):`, error);
    }

    // Delay giữa các tin (trừ tin cuối)
    if (i < count - 1) {
      await sleep(SPAM_DELAY_MS);
    }
  }

  // 4. Sau khi spam xong, kiểm tra lại lần cuối
  const finalCheck = await isTaskStillSpamming(task.id);
  if (finalCheck) {
    // User không bấm Done trong suốt quá trình spam → tự đánh dấu DONE
    await markDone(task.id);
    log.warn(`⏱️ Task #${task.id} đã spam xong ${count} tin nhưng user chưa bấm Done. Tự đánh dấu DONE.`);
  }
}
