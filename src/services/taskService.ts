// ============================================================
// src/services/taskService.ts — CRUD Nghiệp vụ cho Task
// ============================================================

import { Platform, Priority, TaskStatus } from '@prisma/client';
import { prisma } from '../database/prisma';

// ── Tạo Task mới ────────────────────────────────────────────
interface CreateTaskInput {
  content: string;
  scheduledAt: Date;
  priority: Priority;
  platform: Platform;
  chatId: string;
  userId: number;
}

export async function createTask(data: CreateTaskInput) {
  return prisma.task.create({
    data: {
      content: data.content,
      scheduledAt: data.scheduledAt,
      priority: data.priority,
      platform: data.platform,
      chatId: data.chatId,
      userId: data.userId,
    },
  });
}

// ── Lấy tất cả task ĐẾN HẠN (cho Scheduler) ────────────────
export async function getTasksDue() {
  return prisma.task.findMany({
    where: {
      status: TaskStatus.PENDING,
      scheduledAt: { lte: new Date() },
    },
    include: { user: true },
    orderBy: { scheduledAt: 'asc' },
  });
}

// ── Đổi trạng thái sang SPAMMING ────────────────────────────
export async function markSpamming(taskId: number) {
  return prisma.task.update({
    where: { id: taskId },
    data: { status: TaskStatus.SPAMMING },
  });
}

// ── Đổi trạng thái sang DONE ────────────────────────────────
export async function markDone(taskId: number) {
  return prisma.task.update({
    where: { id: taskId },
    data: {
      status: TaskStatus.DONE,
      completedAt: new Date(),
    },
  });
}

// ── Tăng đếm số tin đã spam ─────────────────────────────────
export async function incrementSpamCount(taskId: number) {
  return prisma.task.update({
    where: { id: taskId },
    data: { spamCount: { increment: 1 } },
  });
}

// ── Snooze: Hoãn thêm X phút ────────────────────────────────
export async function snoozeTask(taskId: number, minutes: number = 5) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return null;

  const newTime = new Date(Date.now() + minutes * 60 * 1000);

  return prisma.task.update({
    where: { id: taskId },
    data: {
      scheduledAt: newTime,
      status: TaskStatus.PENDING,
      snoozeCount: { increment: 1 },
    },
  });
}

// ── Hủy Task ─────────────────────────────────────────────────
export async function cancelTask(taskId: number) {
  return prisma.task.update({
    where: { id: taskId },
    data: { status: TaskStatus.CANCELLED },
  });
}

// ── Lấy danh sách task đang chờ của 1 user ──────────────────
export async function getUserPendingTasks(userId: number) {
  return prisma.task.findMany({
    where: {
      userId,
      status: { in: [TaskStatus.PENDING, TaskStatus.SNOOZED] },
    },
    orderBy: { scheduledAt: 'asc' },
  });
}

// ── Lấy task theo ID ─────────────────────────────────────────
export async function getTaskById(taskId: number) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: { user: true },
  });
}

// ── Kiểm tra task còn đang SPAMMING không ────────────────────
export async function isTaskStillSpamming(taskId: number): Promise<boolean> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { status: true },
  });
  return task?.status === TaskStatus.SPAMMING;
}
