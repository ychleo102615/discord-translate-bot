const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getUsage, getLimit, resetUsage } = require('../usageTracker');
const { t, resolveLocale } = require('../i18n');

// locale code → toLocaleDateString locale string
const DATE_LOCALE_MAP = {
  'zh-TW': 'zh-TW',
  'zh-CN': 'zh-CN',
  'zh': 'zh-TW',
  'en': 'en-US',
  'ja': 'ja-JP',
  'ko': 'ko-KR',
};

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
    const locale = resolveLocale(interaction);

    if (sub === 'show') {
      const usage = getUsage();
      const limit = getLimit();
      const percent = ((usage.totalChars / limit) * 100).toFixed(1);
      const dateLocale = DATE_LOCALE_MAP[locale] || 'zh-TW';
      const resetDate = new Date(usage.resetAt).toLocaleDateString(dateLocale, {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const embed = new EmbedBuilder()
        .setTitle(t('usage.title', locale))
        .setColor(usage.limitReached ? 0xe74c3c : 0x2ecc71)
        .addFields(
          { name: t('usage.used', locale), value: t('usage.used_value', locale, { chars: usage.totalChars.toLocaleString() }), inline: true },
          { name: t('usage.limit', locale), value: t('usage.limit_value', locale, { chars: limit.toLocaleString() }), inline: true },
          { name: t('usage.percentage', locale), value: `${percent}%`, inline: true },
          { name: t('usage.next_reset', locale), value: resetDate, inline: true },
          { name: '⠀', value: usage.limitReached ? t('usage.status_limit', locale) : t('usage.status_ok', locale), inline: true }
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (sub === 'reset') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ content: t('usage.no_permission', locale), ephemeral: true });
        return;
      }
      resetUsage();
      await interaction.reply({ content: t('usage.reset_done', locale), ephemeral: true });
    }
  },
};
