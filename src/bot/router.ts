import type { Interaction } from 'discord.js';
import type { LoadedModules } from './loader.js';

function errorHandler(label: string) {
  return async (interaction: any, err: unknown) => {
    console.error(`[interactionCreate] ${label}失敗：`, err);
    const msg = { content: '發生錯誤，請稍後再試。', ephemeral: true };
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg);
      } else {
        await interaction.reply(msg);
      }
    } catch {
      // interaction may have expired
    }
  };
}

export function createRouter(modules: LoadedModules) {
  const { commands, buttonHandlers, menuHandlers } = modules;

  return async (interaction: Interaction) => {
    // Slash commands and Context Menu commands
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

    // Button interactions
    if (interaction.isButton()) {
      const customId = interaction.customId;
      try {
        for (const [prefix, handler] of buttonHandlers) {
          if (customId.startsWith(`${prefix}:`)) {
            await handler(interaction);
            return;
          }
        }
      } catch (err) {
        await errorHandler('按鈕處理')(interaction, err);
      }
      return;
    }

    // Select Menu interactions
    if (interaction.isStringSelectMenu()) {
      const customId = interaction.customId;
      try {
        for (const [prefix, handler] of menuHandlers) {
          if (customId.startsWith(`${prefix}:`)) {
            await handler(interaction);
            return;
          }
        }
      } catch (err) {
        await errorHandler('選單處理')(interaction, err);
      }
      return;
    }
  };
}
