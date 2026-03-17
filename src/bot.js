const { Client, GatewayIntentBits, Partials } = require('discord.js');
const messageCreateHandler = require('./events/messageCreate');
const interactionCreateHandler = require('./events/interactionCreate');
const { startResetSchedule } = require('./usageTracker');

function startBot() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel],
  });

  client.once('ready', () => {
    console.log(`[Bot] 已登入為 ${client.user.tag}`);
    startResetSchedule();
  });

  client.on('messageCreate', messageCreateHandler);
  client.on('interactionCreate', interactionCreateHandler);

  client.login(process.env.DISCORD_TOKEN);
}

module.exports = { startBot };
