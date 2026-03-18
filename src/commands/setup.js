const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addLanguage, removeLanguage, enableChannel, disableChannel, getGuildConfig, setRomanization, isRomanizationEnabled } = require('../serverConfig');
const { t, resolveLocale, getSupportedLanguages, getNativeName } = require('../i18n');

const langChoices = getSupportedLanguages().map(code => ({
  name: `${getNativeName(code)} (${code})`,
  value: code,
}));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('translate-setup')
    .setDescription('管理自動翻譯設定')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('新增自動翻譯目標語言')
        .addStringOption((opt) =>
          opt.setName('language').setDescription('語言代碼（例如：zh-TW, en, ja, ko）').setRequired(true).addChoices(...langChoices)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('移除自動翻譯目標語言')
        .addStringOption((opt) =>
          opt.setName('language').setDescription('語言代碼').setRequired(true).addChoices(...langChoices)
        )
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('顯示目前設定的目標語言與啟用頻道'))
    .addSubcommand((sub) => sub.setName('enable').setDescription('在目前頻道啟用自動翻譯'))
    .addSubcommand((sub) => sub.setName('disable').setDescription('在目前頻道停用自動翻譯'))
    .addSubcommand((sub) =>
      sub
        .setName('romanization')
        .setDescription('設定是否顯示羅馬拼音（適用於中日韓俄阿泰等非拉丁文字語言）')
        .addBooleanOption((opt) =>
          opt.setName('enabled').setDescription('是否啟用羅馬拼音顯示').setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const { guildId, channelId } = interaction;
    const locale = resolveLocale(interaction);

    if (sub === 'add') {
      const lang = interaction.options.getString('language');
      const added = addLanguage(guildId, lang);
      await interaction.reply({
        content: added ? t('setup.lang_added', locale, { lang }) : t('setup.lang_exists', locale, { lang }),
        ephemeral: true,
      });
    } else if (sub === 'remove') {
      const lang = interaction.options.getString('language');
      const removed = removeLanguage(guildId, lang);
      await interaction.reply({
        content: removed ? t('setup.lang_removed', locale, { lang }) : t('setup.lang_not_found', locale, { lang }),
        ephemeral: true,
      });
    } else if (sub === 'list') {
      const config = getGuildConfig(guildId);
      const langs = config.targetLanguages.length > 0 ? config.targetLanguages.join(', ') : t('setup.no_langs', locale);
      const channels =
        config.enabledChannels.length > 0
          ? config.enabledChannels.map((id) => `<#${id}>`).join(', ')
          : t('setup.no_channels', locale);
      const romanization = isRomanizationEnabled(guildId) ? t('setup.on', locale) : t('setup.off', locale);
      await interaction.reply({
        content: t('setup.list_title', locale, { langs, channels, romanization }),
        ephemeral: true,
      });
    } else if (sub === 'enable') {
      const enabled = enableChannel(guildId, channelId);
      await interaction.reply({
        content: enabled ? t('setup.channel_enabled', locale) : t('setup.channel_already_enabled', locale),
        ephemeral: true,
      });
    } else if (sub === 'disable') {
      const disabled = disableChannel(guildId, channelId);
      await interaction.reply({
        content: disabled ? t('setup.channel_disabled', locale) : t('setup.channel_not_enabled', locale),
        ephemeral: true,
      });
    } else if (sub === 'romanization') {
      const enabled = interaction.options.getBoolean('enabled');
      setRomanization(guildId, enabled);
      await interaction.reply({
        content: enabled ? t('setup.romanization_enabled', locale) : t('setup.romanization_disabled', locale),
        ephemeral: true,
      });
    }
  },
};
