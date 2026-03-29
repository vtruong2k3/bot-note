// ============================================================
// src/database/prisma.ts — Singleton Prisma Client (Prisma 7+)
// ============================================================
// Prisma 7 client engine cần adapter để kết nối trực tiếp.
// Sử dụng @prisma/adapter-pg với node-postgres (pg).
// ============================================================

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env';

// Khai báo biến global để giữ reference qua các lần hot-reload
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg(env.DATABASE_URL);
  return new PrismaClient({
    log: ['warn', 'error'],
    adapter,
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Trong môi trường dev, lưu vào global để tránh tạo lại
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
