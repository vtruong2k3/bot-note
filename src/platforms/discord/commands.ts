// ============================================================
// src/platforms/discord/commands.ts — Định nghĩa Slash Commands
// ============================================================

import { SlashCommandBuilder } from 'discord.js';

// ── /nhac ────────────────────────────────────────────────────
export const nhacCommand = new SlashCommandBuilder()
  .setName('nhac')
  .setDescription('Đặt nhắc nhở công việc')
  .addStringOption((option) =>
    option
      .setName('thoi_gian')
      .setDescription('Thời gian (vd: 30m, 2h, 14:30)')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('noi_dung')
      .setDescription('Nội dung nhắc nhở')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('muc_do')
      .setDescription('Mức độ khẩn cấp')
      .setRequired(false)
      .addChoices(
        { name: '🟢 Xanh — 3 tin nhắn', value: 'GREEN' },
        { name: '🟡 Vàng — 6 tin nhắn', value: 'YELLOW' },
        { name: '🔴 Đỏ — 10 tin nhắn', value: 'RED' }
      )
  );

// ── /tasks ───────────────────────────────────────────────────
export const tasksCommand = new SlashCommandBuilder()
  .setName('tasks')
  .setDescription('Xem danh sách nhắc nhở đang chờ');

// ── /cancel ──────────────────────────────────────────────────
export const cancelCommand = new SlashCommandBuilder()
  .setName('cancel')
  .setDescription('Hủy một nhắc nhở')
  .addIntegerOption((option) =>
    option
      .setName('id')
      .setDescription('ID của nhắc nhở cần hủy')
      .setRequired(true)
  );

// ── Export tất cả commands ───────────────────────────────────
export const allCommands = [nhacCommand, tasksCommand, cancelCommand];
