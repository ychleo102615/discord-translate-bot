import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApiServer } from './api/server.js';
import { createClient } from './bot/client.js';
import { loadModules } from './bot/loader.js';
import { createRouter } from './bot/router.js';
import { initDatabase } from './shared/db.js';
import type { AppConfig } from './shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadAppConfig(): AppConfig {
  const required = ['JWT_SECRET', 'DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_REDIRECT_URI'];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
  }
  return {
    port: parseInt(process.env.API_PORT || '3001', 10),
    jwtSecret: process.env.JWT_SECRET!,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      redirectUri: process.env.DISCORD_REDIRECT_URI!,
    },
  };
}

export async function startBot(): Promise<void> {
  const config = loadAppConfig();
  const dataDir = path.join(__dirname, '..', 'data');
  const db = initDatabase(path.join(dataDir, 'bot.db'));
  const client = createClient();

  const modules = await loadModules({ client, db, config });
  const router = createRouter(modules);
  client.on('interactionCreate', router);

  client.once('ready', () => {
    console.log(`[Bot] 已登入為 ${client.user?.tag}`);
  });

  const app = createApiServer(config, db);
  app.listen(config.port, () => {
    console.log(`[API] 已啟動於 port ${config.port}`);
  });

  await client.login(process.env.DISCORD_TOKEN);
}
