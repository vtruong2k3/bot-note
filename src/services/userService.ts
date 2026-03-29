// ============================================================
// src/services/userService.ts — CRUD Nghiệp vụ cho User
// ============================================================

import { Platform } from '@prisma/client';
import { prisma } from '../database/prisma';

// ── Thông tin user khi upsert ────────────────────────────────
interface UserInfo {
  username?: string;
  firstName?: string;
}

// ── Tạo mới hoặc cập nhật User ──────────────────────────────
export async function upsertUser(
  platformId: string,
  platform: Platform,
  info: UserInfo = {}
) {
  return prisma.user.upsert({
    where: {
      platformId_platform: { platformId, platform },
    },
    create: {
      platformId,
      platform,
      username: info.username,
      firstName: info.firstName,
    },
    update: {
      username: info.username,
      firstName: info.firstName,
    },
  });
}

// ── Tìm user theo platformId + platform ──────────────────────
export async function getUserByPlatformId(
  platformId: string,
  platform: Platform
) {
  return prisma.user.findUnique({
    where: {
      platformId_platform: { platformId, platform },
    },
  });
}
