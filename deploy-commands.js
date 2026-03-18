require('dotenv').config();
const { REST, Routes } = require('discord.js');
const translateCommand = require('./src/commands/translate');
const setupCommand = require('./src/commands/setup');
const usageCommand = require('./src/commands/usage');
const lookupCommand = require('./src/commands/lookup');
const myLanguageCommand = require('./src/commands/myLanguage');

const commands = [
  translateCommand.data.toJSON(),
  setupCommand.data.toJSON(),
  usageCommand.data.toJSON(),
  lookupCommand.data.toJSON(),
  myLanguageCommand.data.toJSON(),
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

(async () => {
  try {
    const route = guildId
      ? Routes.applicationGuildCommands(clientId, guildId)
      : Routes.applicationCommands(clientId);

    console.log(`開始部署 slash commands...（${guildId ? 'Guild，立即生效' : '全域，最多 1 小時生效'}）`);
    const data = await rest.put(route, { body: commands });
    console.log(`成功部署 ${data.length} 個 slash commands。`);
  } catch (err) {
    console.error('部署失敗：', err);
  }
})();
