import type { Interaction } from 'discord.js';
import commands from '../commands/index.js';
import { handleWordSelect, handleWordMenuSelect, handlePageNav } from '../interactions/lookupButtons.js';
import { handleLangSelect } from '../interactions/lookupSelectMenu.js';
import { handleInlineLookup } from '../interactions/lookupInline.js';
import { t, resolveLocale } from '../i18n.js';

function errorHandler(label: string) {
  return async (interaction: Interaction, err: unknown): Promise<void> => {
    console.error(`[interactionCreate] ${label}失敗：`, err);
    const locale = resolveLocale(interaction as any);
    const msg = { content: t('common.error', locale), ephemeral: true };
    if ('replied' in interaction && 'deferred' in interaction) {
      const repliable = interaction as any;
      if (repliable.replied || repliable.deferred) {
        await repliable.followUp(msg);
      } else {
        await repliable.reply(msg);
      }
    }
  };
}

export default async function interactionCreateHandler(interaction: Interaction): Promise<void> {
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
      } else if (interaction.customId.startsWith('wlp:')) {
        await handlePageNav(interaction);
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
      } else if (interaction.customId.startsWith('wlm:')) {
        await handleWordMenuSelect(interaction);
      }
    } catch (err) {
      await errorHandler('查詞選單處理')(interaction, err);
    }
    return;
  }
}
