// ============================================================
// src/platforms/discord/interactions.ts — Xử lý Interactions
// ============================================================
// Xử lý Slash Commands (/nhac, /tasks, /cancel) và
// Button Interactions (Done, Snooze) trên Discord.
// ============================================================

import {
  Interaction,
  ChatInputCommandInteraction,
  ButtonInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { upsertUser } from '../../services/userService';
import { createTask, getUserPendingTasks, cancelTask, markDone, snoozeTask } from '../../services/taskService';
import { parseTime } from '../../utils/timeParser';
import { PRIORITY_LABELS, STATUS_EMOJI } from '../../utils/messages';
import { createLogger } from '../../utils/logger';
import { Platform, Priority } from '@prisma/client';

const log = createLogger('Discord:Interactions');

// ── Main handler ─────────────────────────────────────────────
export async function handleInteraction(interaction: Interaction): Promise<void> {
  try {
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    }
  } catch (error) {
    log.error('Lỗi xử lý interaction:', error);
  }
}

// ── Slash Commands ───────────────────────────────────────────
async function handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const { commandName } = interaction;

  switch (commandName) {
    case 'nhac':
      await handleNhac(interaction);
      break;
    case 'tasks':
      await handleTasks(interaction);
      break;
    case 'cancel':
      await handleCancel(interaction);
      break;
  }
}

// ── /nhac ────────────────────────────────────────────────────
async function handleNhac(interaction: ChatInputCommandInteraction): Promise<void> {
  const timeText = interaction.options.getString('thoi_gian', true);
  const content = interaction.options.getString('noi_dung', true);
  const priorityStr = interaction.options.getString('muc_do') || 'YELLOW';
  const priority = priorityStr as Priority;

  // Upsert user
  const user = await upsertUser(
    interaction.user.id,
    Platform.DISCORD,
    {
      username: interaction.user.username,
      firstName: interaction.user.displayName,
    }
  );

  // Parse time
  const parsed = parseTime(timeText);
  if (!parsed) {
    await interaction.reply({
      content:
        '⚠️ Không hiểu thời gian này!\n\n' +
        '📌 Các format hỗ trợ:\n' +
        '• `30m` hoặc `30p` — 30 phút nữa\n' +
        '• `2h` — 2 tiếng nữa\n' +
        '• `14:30` — lúc 14:30\n' +
        '• `1d` — 1 ngày nữa',
      ephemeral: true,
    });
    return;
  }

  // Tạo task
  const task = await createTask({
    content,
    scheduledAt: parsed.date,
    priority,
    platform: Platform.DISCORD,
    chatId: interaction.channelId,
    userId: user.id,
  });

  // Tạo embed đẹp
  const embed = new EmbedBuilder()
    .setTitle('✅ Đã lên lịch thành công!')
    .setColor(priority === 'RED' ? 0xff0000 : priority === 'YELLOW' ? 0xffcc00 : 0x00cc00)
    .addFields(
      { name: '📝 Nội dung', value: task.content, inline: false },
      { name: '⏰ Thời gian', value: parsed.display, inline: true },
      { name: '🎯 Mức độ', value: PRIORITY_LABELS[priority], inline: true },
      { name: '🆔 ID', value: `#${task.id}`, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
  log.success(`Task #${task.id} tạo trên Discord: "${content}" | ${priority}`);
}

// ── /tasks ───────────────────────────────────────────────────
async function handleTasks(interaction: ChatInputCommandInteraction): Promise<void> {
  const user = await upsertUser(
    interaction.user.id,
    Platform.DISCORD,
    {
      username: interaction.user.username,
      firstName: interaction.user.displayName,
    }
  );

  const tasks = await getUserPendingTasks(user.id);

  if (tasks.length === 0) {
    await interaction.reply({ content: '📭 Bạn không có nhắc nhở nào đang chờ.', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('📋 Danh sách nhắc nhở')
    .setColor(0x5865f2);

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
    embed.addFields({
      name: `${emoji} #${task.id} — ${task.content}`,
      value: `⏰ ${time} | ${PRIORITY_LABELS[task.priority]}`,
    });
  }

  embed.setFooter({ text: 'Hủy bằng: /cancel <id>' });
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ── /cancel ──────────────────────────────────────────────────
async function handleCancel(interaction: ChatInputCommandInteraction): Promise<void> {
  const taskId = interaction.options.getInteger('id', true);

  try {
    await cancelTask(taskId);
    await interaction.reply({ content: `✅ Đã hủy nhắc nhở #${taskId}.` });
    log.info(`Task #${taskId} đã bị hủy trên Discord.`);
  } catch (error) {
    await interaction.reply({ content: '❌ Không tìm thấy nhắc nhở hoặc có lỗi xảy ra.', ephemeral: true });
  }
}

// ── Button Interactions ──────────────────────────────────────
async function handleButton(interaction: ButtonInteraction): Promise<void> {
  const customId = interaction.customId;

  // done_<taskId>
  if (customId.startsWith('done_')) {
    const taskId = parseInt(customId.replace('done_', ''), 10);
    await markDone(taskId);

    await interaction.update({
      content: `✅ **Hoàn thành!** Nhắc nhở #${taskId} đã xong. Giỏi lắm! 🎉`,
      components: [],
    });

    log.success(`Task #${taskId} hoàn thành qua Discord button.`);
  }

  // snooze_<taskId>
  if (customId.startsWith('snooze_')) {
    const taskId = parseInt(customId.replace('snooze_', ''), 10);
    const updated = await snoozeTask(taskId, 5);

    if (updated) {
      const newTime = updated.scheduledAt.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      await interaction.update({
        content: `😴 **Đã hoãn nhắc nhở #${taskId}**\n⏰ Sẽ nhắc lại lúc: ${newTime}\n📊 Số lần hoãn: ${updated.snoozeCount}`,
        components: [],
      });

      log.info(`Task #${taskId} snooze lần ${updated.snoozeCount} trên Discord.`);
    }
  }
}
