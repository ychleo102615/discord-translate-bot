const commands = require('../commands');
const { handleWordSelect } = require('../interactions/lookupButtons');
const { handleLangSelect } = require('../interactions/lookupSelectMenu');

function errorHandler(label) {
  return async (interaction, err) => {
    console.error(`[interactionCreate] ${label}失敗：`, err);
    const msg = { content: '處理時發生錯誤，請稍後再試。', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg);
    } else {
      await interaction.reply(msg);
    }
  };
}

module.exports = async (interaction) => {
  // Slash commands 和 Context Menu commands
  if (interaction.isChatInputCommand() || interaction.isMessageContextMenuCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      await errorHandler(`指令 ${interaction.commandName}`)(interaction, err);
    }
    return;
  }

  // Select Menu 互動
  if (interaction.isStringSelectMenu()) {
    try {
      if (interaction.customId.startsWith('wls:')) {
        await handleLangSelect(interaction);
      } else if (interaction.customId.startsWith('wlw:')) {
        await handleWordSelect(interaction);
      }
    } catch (err) {
      await errorHandler('查詞選單處理')(interaction, err);
    }
    return;
  }
};
