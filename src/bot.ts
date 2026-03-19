import { Client, GatewayIntentBits, Partials } from 'discord.js';
import messageCreateHandler from './modules/translate/events/messageCreate.js';
import interactionCreateHandler from './events/interactionCreate.js';
import { startResetSchedule } from './modules/translate/usageTracker.js';

export function startBot(): void {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel],
  });

  client.once('ready', () => {
    console.log(`[Bot] 已登入為 ${client.user?.tag}`);
    startResetSchedule();
  });

  client.on('messageCreate', messageCreateHandler);
  client.on('interactionCreate', interactionCreateHandler);

  client.login(process.env.DISCORD_TOKEN);
}
