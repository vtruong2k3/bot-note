// ============================================================
// src/services/scheduler.ts — "Trái tim" hệ thống
// ============================================================
// Sử dụng node-cron quét Database mỗi 30 giây.
// Tìm tất cả Task PENDING đã đến hạn → gọi spamService.
// Có cơ chế lock tránh xử lý trùng lặp.
// ============================================================

import cron from 'node-cron';
import { getTasksDue } from './taskService';
import { executeSpam } from './spamService';
import { createLogger } from '../utils/logger';

const log = createLogger('Scheduler');

// ── Biến lock: tránh 2 lần tick chồng chéo ──────────────────
let isProcessing = false;

// ── Đếm tick để log định kỳ ──────────────────────────────────
let tickCount = 0;

// ── Hàm xử lý mỗi lần tick ──────────────────────────────────
async function tick(): Promise<void> {
  // Nếu đang xử lý từ lần tick trước → bỏ qua
  if (isProcessing) {
    log.warn('⏭️ Tick bị bỏ qua (đang xử lý tick trước).');
    return;
  }

  isProcessing = true;
  tickCount++;

  try {
    // Log mỗi 4 tick (tức ~2 phút) để biết scheduler còn sống
    if (tickCount % 4 === 1) {
      log.info(`💓 Scheduler heartbeat — tick #${tickCount} | now = ${new Date().toISOString()}`);
    }

    const dueTasks = await getTasksDue();

    if (dueTasks.length > 0) {
      log.info(`🔍 Tìm thấy ${dueTasks.length} task đến hạn.`);
      for (const task of dueTasks) {
        log.info(
          `   📌 Task #${task.id}: "${task.content}" | scheduledAt=${task.scheduledAt.toISOString()} | status=${task.status} | platform=${task.platform}`
        );
      }

      // Xử lý từng task song song (nhưng giới hạn tránh quá tải)
      const promises = dueTasks.map((task) => executeSpam(task));
      const results = await Promise.allSettled(promises);

      // Log kết quả
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          log.error(`❌ Spam Task thất bại:`, result.reason);
        }
      });
    }
  } catch (error) {
    log.error('Lỗi khi quét database:', error);
  } finally {
    isProcessing = false;
  }
}

// ── Khởi động Scheduler ─────────────────────────────────────
export function startScheduler(): void {
  // Chạy mỗi 30 giây: */30 * * * * *
  cron.schedule('*/30 * * * * *', tick);
  log.success('⏰ Scheduler đã khởi động — quét DB mỗi 30 giây.');
}
