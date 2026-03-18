const commands = require('../commands');
const { handleWordSelect } = require('../interactions/lookupButtons');
const { handleLangSelect } = require('../interactions/lookupSelectMenu');
const { handleInlineLookup } = require('../interactions/lookupInline');
const { t, resolveLocale } = require('../i18n');

function errorHandler(label) {
  return async (interaction, err) => {
    console.error(`[interactionCreate] ${label}失敗：`, err);
    const locale = resolveLocale(interaction);
    const msg = { content: t('common.error', locale), ephemeral: true };
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

  // 按鈕互動
  if (interaction.isButton()) {
    try {
      if (interaction.customId.startsWith('wlt:')) {
        await handleInlineLookup(interaction);
      } else if (interaction.customId.startsWith('wlw:')) {
        await handleWordSelect(interaction);
      }
    } catch (err) {
      await errorHandler('查詞按鈕處理')(interaction, err);
    }
    return;
  }

  // Select Menu 互動
  if (interaction.isStringSelectMenu()) {
    try {
      if (interaction.customId.startsWith('wls:')) {
        await handleLangSelect(interaction);
      }
    } catch (err) {
      await errorHandler('查詞選單處理')(interaction, err);
    }
    return;
  }
};
