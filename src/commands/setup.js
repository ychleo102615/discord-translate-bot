const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addLanguage, removeLanguage, enableChannel, disableChannel, getGuildConfig, setRomanization, isRomanizationEnabled } = require('../serverConfig');

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
          opt.setName('language').setDescription('語言代碼（例如：zh-TW, en, ja, ko）').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('移除自動翻譯目標語言')
        .addStringOption((opt) =>
          opt.setName('language').setDescription('語言代碼').setRequired(true)
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

    if (sub === 'add') {
      const lang = interaction.options.getString('language');
      const added = addLanguage(guildId, lang);
      await interaction.reply({
        content: added ? `✅ 已新增目標語言：\`${lang}\`` : `⚠️ 語言 \`${lang}\` 已在清單中。`,
        ephemeral: true,
      });
    } else if (sub === 'remove') {
      const lang = interaction.options.getString('language');
      const removed = removeLanguage(guildId, lang);
      await interaction.reply({
        content: removed ? `✅ 已移除目標語言：\`${lang}\`` : `⚠️ 語言 \`${lang}\` 不在清單中。`,
        ephemeral: true,
      });
    } else if (sub === 'list') {
      const config = getGuildConfig(guildId);
      const langs = config.targetLanguages.length > 0 ? config.targetLanguages.join(', ') : '（尚未設定）';
      const channels =
        config.enabledChannels.length > 0
          ? config.enabledChannels.map((id) => `<#${id}>`).join(', ')
          : '（無啟用頻道）';
      const romanization = isRomanizationEnabled(guildId) ? '✅ 啟用' : '❌ 停用';
      await interaction.reply({
        content: `**目標語言：** ${langs}\n**啟用頻道：** ${channels}\n**羅馬拼音：** ${romanization}`,
        ephemeral: true,
      });
    } else if (sub === 'enable') {
      const enabled = enableChannel(guildId, channelId);
      await interaction.reply({
        content: enabled ? `✅ 已在本頻道啟用自動翻譯。` : `⚠️ 本頻道已啟用自動翻譯。`,
        ephemeral: true,
      });
    } else if (sub === 'disable') {
      const disabled = disableChannel(guildId, channelId);
      await interaction.reply({
        content: disabled ? `✅ 已在本頻道停用自動翻譯。` : `⚠️ 本頻道未啟用自動翻譯。`,
        ephemeral: true,
      });
    } else if (sub === 'romanization') {
      const enabled = interaction.options.getBoolean('enabled');
      setRomanization(guildId, enabled);
      await interaction.reply({
        content: enabled ? `✅ 已啟用羅馬拼音顯示。` : `✅ 已停用羅馬拼音顯示。`,
        ephemeral: true,
      });
    }
  },
};
