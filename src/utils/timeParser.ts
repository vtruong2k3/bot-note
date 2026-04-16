// ============================================================
// src/utils/timeParser.ts — Bóc tách thời gian từ text
// ============================================================
// Sử dụng Regex fallback tiên tiến cho tiếng Việt (chống sai lệch múi giờ).
// Sau đó fallback về chrono-node.
// ============================================================

import * as chrono from 'chrono-node';

// ── Kết quả trả về ───────────────────────────────────────────
export interface ParsedTime {
  date: Date;
  /** Mô tả để hiển thị cho user (vd: "10:30 29/03/2026") */
  display: string;
}

const TIMEZONE = 'Asia/Ho_Chi_Minh';
const TZ_OFFSET = '+07:00';

// ── Format date cho hiển thị ─────────────────────────────────
function formatDisplay(date: Date): string {
  return date.toLocaleString('vi-VN', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour12: false,
  });
}

// ── Lấy Component ngày hiện tại chuẩn giờ VN ──────────────────
function getCurrentVNDateComponents() {
  const dpos = new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
  return {
    year: dpos.getFullYear(),
    month: dpos.getMonth() + 1,
    day: dpos.getDate(),
  };
}

// ── Ép chuẩn chuỗi tạo Date GMT+7 không phụ thuộc vào VPS ───────
function createVNDate(year: number, month: number, day: number, hour: number, minute: number): Date {
  const yyyy = year.toString();
  const mm = month.toString().padStart(2, '0');
  const dd = day.toString().padStart(2, '0');
  const hh = hour.toString().padStart(2, '0');
  const min = minute.toString().padStart(2, '0');
  return new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00${TZ_OFFSET}`);
}

// ── Xây dựng Date tuyệt đối kết hợp valid range ────────────────
function generateAbsoluteDate(day: number, month: number, yearInput: number | null, hours: number, minutes: number): Date | null {
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const current = getCurrentVNDateComponents();
  let year = yearInput || current.year;

  let targetDate = createVNDate(year, month, day, hours, minutes);

  // Nếu không nhập năm, và ngày hẹn đã trôi qua trong năm nay -> đôn lên năm sau
  // Tránh trường hợp hôm nay là 15/5, hứa hẹn "14/5" thì nó nhảy về quá khứ
  if (!yearInput && targetDate.getTime() <= Date.now()) {
    year += 1;
    targetDate = createVNDate(year, month, day, hours, minutes);
  }

  return targetDate;
}

// ── Regex parser cho tiếng Việt và giờ lệch ────────────────────
function parseWithRegex(text: string): Date | null {
  // 1. Tương đối: 30m, 2h, 1d (Đo lường từ thời khắc Date.now() nên tránh được mọi vụ timezone)
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

  // Tiền xử lý: normalize `14h30` -> `14:30`, `7h` -> `7:00`
  let normalized = text
    .replace(/(\d{1,2})h(\d{2})/gi, '$1:$2')  // 14h30 -> 14:30
    .replace(/(\d{1,2})h(?!\d)/gi, '$1:00');    // 7h -> 7:00

  // 2. Định dạng: HH:mm DD/MM hoặc HH:mm DD/MM/YYYY (VD: 7:30 14/5)
  const timeFirstMatch = normalized.match(/^(\d{1,2}):(\d{2})\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (timeFirstMatch) {
    const hours = parseInt(timeFirstMatch[1], 10);
    const minutes = parseInt(timeFirstMatch[2], 10);
    const day = parseInt(timeFirstMatch[3], 10);
    const month = parseInt(timeFirstMatch[4], 10);
    const yearInput = timeFirstMatch[5] ? parseInt(timeFirstMatch[5], 10) : null;
    return generateAbsoluteDate(day, month, yearInput, hours, minutes);
  }

  // 3. Định dạng: DD/MM HH:mm hoặc DD/MM/YYYY HH:mm (VD: 14/5 7:30)
  const dateFirstMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\s+(\d{1,2}):(\d{2})$/);
  if (dateFirstMatch) {
    const day = parseInt(dateFirstMatch[1], 10);
    const month = parseInt(dateFirstMatch[2], 10);
    const yearInput = dateFirstMatch[3] ? parseInt(dateFirstMatch[3], 10) : null;
    const hours = parseInt(dateFirstMatch[4], 10);
    const minutes = parseInt(dateFirstMatch[5], 10);
    return generateAbsoluteDate(day, month, yearInput, hours, minutes);
  }

  // 4. Định dạng chỉ giờ lẻ: HH:mm (VD: 14:30, 7:00)
  const timeOnlyMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (timeOnlyMatch) {
    const hours = parseInt(timeOnlyMatch[1], 10);
    const minutes = parseInt(timeOnlyMatch[2], 10);

    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      const { year, month, day } = getCurrentVNDateComponents();
      let targetDate = createVNDate(year, month, day, hours, minutes);

      // Nếu giờ đã qua trong hôm nay, đẩy lên ngày mai
      if (targetDate.getTime() <= Date.now()) {
        targetDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
      }
      return targetDate;
    }
  }

  return null;
}

// ── Main parse function ──────────────────────────────────────

/**
 * Parse text thời gian → Date object.
 * Sử dụng regex timezone-safe trước để tránh lỗi VPS, fallback sang chrono-node.
 * @returns ParsedTime hoặc null nếu không hiểu được
 */
export function parseTime(text: string): ParsedTime | null {
  // 1. Thử qua Regex bảo vệ múi giờ (Timezone-safe)
  const regexResult = parseWithRegex(text.trim());
  if (regexResult) {
    if (isNaN(regexResult.getTime())) return null; // Fallback an toàn nếu ngày ra NaN
    return { date: regexResult, display: formatDisplay(regexResult) };
  }

  // 2. Thử chrono-node (cho các ngôn ngữ tự nhiên còn lại)
  const results = chrono.parse(text, new Date(), { forwardDate: true });
  if (results.length > 0) {
    const date = results[0].start.date();
    return { date, display: formatDisplay(date) };
  }

  return null;
}
