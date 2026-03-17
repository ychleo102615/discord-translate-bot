const commands = require('../commands');

module.exports = async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[interactionCreate] 指令 ${interaction.commandName} 執行失敗：`, err);
    const msg = { content: '執行指令時發生錯誤，請稍後再試。', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg);
    } else {
      await interaction.reply(msg);
    }
  }
};
