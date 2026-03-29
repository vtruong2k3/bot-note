// ============================================================
// src/utils/timeParser.ts — Bóc tách thời gian từ text
// ============================================================
// Sử dụng chrono-node để parse ngôn ngữ tự nhiên → Date.
// Kèm fallback regex cho các format đơn giản: 30m, 2h, 14:30.
// ============================================================

import * as chrono from 'chrono-node';

// ── Kết quả trả về ───────────────────────────────────────────
export interface ParsedTime {
  date: Date;
  /** Mô tả để hiển thị cho user (vd: "10:30 29/03/2026") */
  display: string;
}

// ── Format date cho hiển thị ─────────────────────────────────
function formatDisplay(date: Date): string {
  return date.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour12: false,
  });
}

// ── Regex fallback cho format đơn giản ───────────────────────

/**
 * Hỗ trợ các format:
 *  - "30m" hoặc "30p"  → 30 phút nữa
 *  - "2h"              → 2 tiếng nữa
 *  - "1d"              → 1 ngày nữa
 *  - "14:30"           → 14:30 hôm nay (hoặc ngày mai nếu đã qua)
 */
function parseWithRegex(text: string): Date | null {
  // Pattern: số + đơn vị (m/p/h/d)
  const relativeMatch = text.match(/^(\d+)\s*(m|p|min|phut|phút|h|hour|gio|giờ|d|day|ngay|ngày)$/i);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2].toLowerCase();
    const now = new Date();

    if (['m', 'p', 'min', 'phut', 'phút'].includes(unit)) {
      return new Date(now.getTime() + amount * 60 * 1000);
    }
    if (['h', 'hour', 'gio', 'giờ'].includes(unit)) {
      return new Date(now.getTime() + amount * 60 * 60 * 1000);
    }
    if (['d', 'day', 'ngay', 'ngày'].includes(unit)) {
      return new Date(now.getTime() + amount * 24 * 60 * 60 * 1000);
    }
  }

  // Pattern: HH:mm (giờ cố định trong ngày)
  const timeMatch = text.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);

    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      const now = new Date();
      const target = new Date(now);
      target.setHours(hours, minutes, 0, 0);

      // Nếu thời gian đã qua → chuyển sang ngày mai
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      return target;
    }
  }

  return null;
}

// ── Main parse function ──────────────────────────────────────

/**
 * Parse text thời gian → Date object.
 * Thử chrono-node trước, fallback sang regex.
 * @returns ParsedTime hoặc null nếu không hiểu được
 */
export function parseTime(text: string): ParsedTime | null {
  // 1. Thử regex trước (cho các format đơn giản, nhanh hơn)
  const regexResult = parseWithRegex(text.trim());
  if (regexResult) {
    return { date: regexResult, display: formatDisplay(regexResult) };
  }

  // 2. Thử chrono-node (cho ngôn ngữ tự nhiên)
  const results = chrono.parse(text, new Date(), { forwardDate: true });
  if (results.length > 0) {
    const date = results[0].start.date();
    return { date, display: formatDisplay(date) };
  }

  return null;
}
