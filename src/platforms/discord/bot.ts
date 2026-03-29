// ============================================================
// src/platforms/discord/bot.ts — Khởi tạo Discord.js Client
// ============================================================

import { Client, GatewayIntentBits } from 'discord.js';
import { env } from '../../config/env';
import { createLogger } from '../../utils/logger';
import { handleInteraction } from './interactions';

const log = createLogger('Discord');

// ── Tạo Discord Client ──────────────────────────────────────
export const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

// ── Khởi động Discord Bot ────────────────────────────────────
export async function startDiscordBot(): Promise<void> {
  // Khi bot online
  discordClient.once('ready', (client) => {
    log.success(`🤖 Discord Bot đã online: ${client.user.tag}`);
  });

  // Lắng nghe tất cả interactions (slash commands, buttons)
  discordClient.on('interactionCreate', handleInteraction);

  // Login
  await discordClient.login(env.BOT_DISC_TOKEN);
}
