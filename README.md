# BOT_Note — Walkthrough

## Tổng quan

Đã xây dựng thành công hệ thống **Bot Spam Nhắc nhở Đa nền tảng** chạy đồng thời trên Telegram và Discord, dùng chung 1 Database PostgreSQL (Neon).

## Cấu trúc thư mục đã tạo

```
BOT_Note/
├── prisma/schema.prisma        # DB Schema (User + Task + 3 Enums)
├── prisma.config.ts            # Prisma 7 config
├── src/
│   ├── config/env.ts           # Env validation (fail-fast)
│   ├── database/prisma.ts      # Singleton PrismaClient + pg adapter
│   ├── platforms/
│   │   ├── telegram/           # bot.ts, commands.ts, callbacks.ts
│   │   └── discord/            # bot.ts, commands.ts, deploy-commands.ts, interactions.ts
│   ├── services/
│   │   ├── taskService.ts      # Full CRUD + scheduler queries
│   │   ├── userService.ts      # Upsert + lookup
│   │   ├── scheduler.ts        # 30-second cron with lock
│   │   └── spamService.ts      # Escalating spam with DI
│   ├── utils/
│   │   ├── timeParser.ts       # chrono-node + regex fallback
│   │   ├── messages.ts         # 10 escalating templates + constants
│   │   └── logger.ts           # ANSI colored logger
│   └── index.ts                # Entry point
├── .env / .env.example
├── package.json / tsconfig.json
└── .gitignore
```

## Những quyết định thiết kế quan trọng

1. **Dependency Injection cho SpamService**: SpamService không import bot instance trực tiếp → tránh circular dependency. Thay vào đó, `index.ts` "tiêm" các hàm `sendTelegram()` và `sendDiscord()` vào SpamService lúc khởi động.

2. **Prisma 7 Compatibility**: Prisma 7 thay đổi lớn — URL chuyển từ `schema.prisma` sang `prisma.config.ts`, constructor PrismaClient bắt buộc phải dùng `adapter`. Đã dùng `@prisma/adapter-pg` để kết nối trực tiếp.

3. **Scheduler Lock**: Biến `isProcessing` ngăn 2 lần tick cron chồng chéo nhau. Task được đổi sang `SPAMMING` ngay khi bắt đầu xử lý → tick tiếp theo sẽ bỏ qua.

4. **Mid-Spam Abort**: Giữa mỗi tin spam, bot query lại DB kiểm tra status. Nếu user đã bấm "Done" → dừng ngay không spam tiếp.

## Kết quả test

- ✅ PostgreSQL (Neon) kết nối thành công
- ✅ Discord Bot online: **Bot-Note#3705**
- ✅ 3 Slash Commands đã đăng ký (`/nhac`, `/tasks`, `/cancel`)
- ✅ Telegram Bot nhận `/start` từ user **Vũ (@vu_truonq_03)**
- ✅ Scheduler chạy ngầm mỗi 30 giây

## Cách chạy

```bash
# Cài đặt
npm install

# Tạo DB tables
npx prisma db push

# Đăng ký Discord Slash Commands (chạy 1 lần)
npm run deploy-commands

# Khởi động bot
npm start

# Khởi động dev (hot-reload)
npm run dev
```
