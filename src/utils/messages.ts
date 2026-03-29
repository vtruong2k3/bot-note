// ============================================================
// src/utils/messages.ts — Template tin nhắn spam (leo thang)
// ============================================================
// Mỗi lần spam, nội dung sẽ LEO THANG dần từ nhẹ nhàng →
// gắt gỏng → khủng bố. Nếu số tin vượt quá số template,
// sẽ lặp lại từ template cuối (template cay nhất).
// ============================================================

// ── Template tin nhắn (leo thang) ────────────────────────────
const SPAM_TEMPLATES = [
  '⏰ Nhắc nhở: {content}',
  '⏰ Bạn ơi nhớ làm nhé: {content}',
  '⚠️ Đến giờ rồi đó: {content}',
  '⚠️ HEY! Đến giờ rồi: {content}!',
  '🔥 Làm nhanh lên! {content}!',
  '🔥🔥 SẮP TRỄ RỒI: {content}!!',
  '💀 KHẨN CẤP: {content}!!!',
  '💀💀 VẪN CHƯA LÀM À?! {content}!!!',
  '🚨🚨🚨 LẦN GẦN CUỐI: {content} — LÀM NGAY ĐI!!!',
  '☠️☠️☠️ LẦN CUỐI CÙNG!!!! {content} — DEADLINE ĐẾN ĐÍT RỒI!!!!',
];

/**
 * Lấy nội dung tin nhắn spam theo thứ tự leo thang.
 * @param index Thứ tự tin nhắn (0-based)
 * @param content Nội dung công việc cần nhắc
 * @returns Tin nhắn đã format
 */
export function getSpamMessage(index: number, content: string): string {
  // Nếu vượt quá số template → lặp lại template cuối (cay nhất)
  const templateIndex = Math.min(index, SPAM_TEMPLATES.length - 1);
  return SPAM_TEMPLATES[templateIndex].replace('{content}', content);
}

// ── Số tin spam theo Priority ────────────────────────────────
export const SPAM_COUNTS = {
  GREEN: 3,   // 🟢 Nhẹ nhàng
  YELLOW: 6,  // 🟡 Quan trọng
  RED: 10,    // 🔴 Sống còn
} as const;

// ── Delay giữa các tin (ms) ──────────────────────────────────
export const SPAM_DELAY_MS = 2000; // 2 giây

// ── Label hiển thị cho Priority ──────────────────────────────
export const PRIORITY_LABELS = {
  GREEN: '🟢 Xanh (3 tin)',
  YELLOW: '🟡 Vàng (6 tin)',
  RED: '🔴 Đỏ (10 tin)',
} as const;

// ── Emoji cho Status ─────────────────────────────────────────
export const STATUS_EMOJI = {
  PENDING: '⏳',
  SPAMMING: '📢',
  SNOOZED: '😴',
  DONE: '✅',
  CANCELLED: '❌',
} as const;
