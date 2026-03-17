require('dotenv').config();
const { REST, Routes } = require('discord.js');
const translateCommand = require('./src/commands/translate');
const setupCommand = require('./src/commands/setup');
const usageCommand = require('./src/commands/usage');

const commands = [
  translateCommand.data.toJSON(),
  setupCommand.data.toJSON(),
  usageCommand.data.toJSON(),
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('開始部署 slash commands...');
    const data = await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    console.log(`成功部署 ${data.length} 個 slash commands。`);
  } catch (err) {
    console.error('部署失敗：', err);
  }
})();
