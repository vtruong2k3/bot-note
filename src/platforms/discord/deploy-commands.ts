// ============================================================
// src/platforms/discord/deploy-commands.ts — Đăng ký Slash
// Commands lên Discord API. Chạy 1 lần: npm run deploy-commands
// ============================================================

import { REST, Routes } from 'discord.js';
import { env } from '../../config/env';
import { allCommands } from './commands';
import { createLogger } from '../../utils/logger';

const log = createLogger('DeployCmd');

async function deploy() {
  const rest = new REST({ version: '10' }).setToken(env.BOT_DISC_TOKEN);

  try {
    log.info('🔄 Đang đăng ký Slash Commands lên Discord API...');

    const commandData = allCommands.map((cmd) => cmd.toJSON());

    await rest.put(
      Routes.applicationCommands(env.DISCORD_CLIENT_ID),
      { body: commandData }
    );

    log.success(`✅ Đã đăng ký ${commandData.length} commands thành công!`);
  } catch (error) {
    log.error('❌ Lỗi đăng ký commands:', error);
    process.exit(1);
  }
}

deploy();
