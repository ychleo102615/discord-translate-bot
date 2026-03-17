const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getUsage, getLimit, resetUsage } = require('../usageTracker');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('usage')
    .setDescription('查看或重置翻譯用量')
    .addSubcommand((sub) => sub.setName('show').setDescription('顯示目前用量與上限'))
    .addSubcommand((sub) =>
      sub
        .setName('reset')
        .setDescription('手動重置用量（管理員限定）')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'show') {
      const usage = getUsage();
      const limit = getLimit();
      const percent = ((usage.totalChars / limit) * 100).toFixed(1);
      const resetDate = new Date(usage.resetAt).toLocaleDateString('zh-TW', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const embed = new EmbedBuilder()
        .setTitle('📊 翻譯用量')
        .setColor(usage.limitReached ? 0xe74c3c : 0x2ecc71)
        .addFields(
          { name: '已使用', value: `${usage.totalChars.toLocaleString()} 字元`, inline: true },
          { name: '上限', value: `${limit.toLocaleString()} 字元`, inline: true },
          { name: '使用率', value: `${percent}%`, inline: true },
          { name: '下次重置', value: resetDate, inline: true },
          { name: '狀態', value: usage.limitReached ? '❌ 已達上限' : '✅ 正常', inline: true }
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (sub === 'reset') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ content: '❌ 需要管理伺服器權限才能重置用量。', ephemeral: true });
        return;
      }
      resetUsage();
      await interaction.reply({ content: '✅ 翻譯用量已重置。', ephemeral: true });
    }
  },
};
