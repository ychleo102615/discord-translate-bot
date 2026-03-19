import { createClient } from './bot/client.js';
import { loadModules } from './bot/loader.js';
import { createRouter } from './bot/router.js';

export async function startBot(): Promise<void> {
  const client = createClient();

  const modules = await loadModules(client);
  const router = createRouter(modules);

  client.on('interactionCreate', router);

  client.once('ready', () => {
    console.log(`[Bot] 已登入為 ${client.user?.tag}`);
  });

  await client.login(process.env.DISCORD_TOKEN);
}
