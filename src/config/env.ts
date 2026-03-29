// ============================================================
// src/config/env.ts — Validate & Export biến môi trường
// ============================================================
// Tất cả biến môi trường bắt buộc sẽ được kiểm tra ngay khi
// import file này. Nếu thiếu bất kỳ biến nào → crash ngay lập
// tức kèm hướng dẫn cụ thể, thay vì để bot chạy rồi lỗi giữa
// chừng lúc nửa đêm.
// ============================================================

import dotenv from 'dotenv';

dotenv.config();

// ── Helper: Lấy biến bắt buộc, throw nếu thiếu ─────────────
function getRequired(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Thiếu biến môi trường: ${key}\n` +
      `Hãy kiểm tra file .env (tham khảo .env.example)`
    );
  }
  return value;
}

// ── Helper: Lấy biến tùy chọn ───────────────────────────────
function getOptional(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

// ── Export config object (type-safe) ─────────────────────────
export const env = {
  // Database
  DATABASE_URL: getRequired('DATABASE_URL'),

  // Telegram
  BOT_TELE_TOKEN: getRequired('BOT_TELE_TOKEN'),

  // Discord
  BOT_DISC_TOKEN: getRequired('BOT_DISC_TOKEN'),
  DISCORD_CLIENT_ID: getRequired('DISCORD_CLIENT_ID'),

  // App
  TIMEZONE: getOptional('TIMEZONE', 'Asia/Ho_Chi_Minh'),
} as const;

// Nếu import thành công → log xác nhận
console.log('Biến môi trường đã load thành công.');
