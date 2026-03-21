import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import * as translateCommand from './src/modules/translate/commands/translate.js';
import * as setupCommand from './src/modules/translate/commands/setup.js';
import * as usageCommand from './src/modules/translate/commands/usage.js';
import * as lookupCommand from './src/modules/translate/commands/lookup.js';
import * as myLanguageCommand from './src/modules/translate/commands/myLanguage.js';
import * as drawCommand from './src/modules/draw/commands/draw.js';

const commands = [
  translateCommand.data.toJSON(),
  setupCommand.data.toJSON(),
  usageCommand.data.toJSON(),
  lookupCommand.data.toJSON(),
  myLanguageCommand.data.toJSON(),
  drawCommand.data.toJSON(),
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

const clientId = process.env.DISCORD_CLIENT_ID!;
const guildId = process.env.DISCORD_GUILD_ID;

(async () => {
  try {
    const route = guildId
      ? Routes.applicationGuildCommands(clientId, guildId)
      : Routes.applicationCommands(clientId);

    // 部署 Guild 命令時，同時清除可能殘留的全域命令（避免舊的全域命令覆蓋 Guild 命令的 choices）
    if (guildId) {
      const globalCommands = await rest.get(Routes.applicationCommands(clientId)) as any[];
      if (globalCommands.length > 0) {
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        console.log(`已清除 ${globalCommands.length} 個殘留的全域命令。`);
      }
    }

    console.log(`開始部署 slash commands...（${guildId ? 'Guild，立即生效' : '全域，最多 1 小時生效'}）`);
    const data = await rest.put(route, { body: commands }) as any[];
    console.log(`成功部署 ${data.length} 個 slash commands。`);
  } catch (err) {
    console.error('部署失敗：', err);
  }
})();
