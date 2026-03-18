const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { translate, detect } = require('../translate');
const { tryAddChars } = require('../usageTracker');
const { isRomanizationEnabled } = require('../serverConfig');
const { formatWithRomanization } = require('../romanize/index');
const { t, resolveLocale } = require('../i18n');

const truncate = (s, max = 1024) => (s.length > max ? s.slice(0, max - 3) + '...' : s);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('translate')
    .setDescription('手動翻譯文字到指定語言')
    .addStringOption((opt) =>
      opt.setName('text').setDescription('要翻譯的文字').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('language').setDescription('目標語言代碼（例如：zh-TW, en, ja, ko）').setRequired(true)
    ),

  async execute(interaction) {
    const text = interaction.options.getString('text');
    const lang = interaction.options.getString('language');
    const locale = resolveLocale(interaction);

    await interaction.deferReply();

    const { allowed } = tryAddChars(text.length);
    if (!allowed) {
      await interaction.editReply(t('common.usage_limit_warning', locale));
      return;
    }

    try {
      const [sourceLang, result] = await Promise.all([detect(text), translate(text, lang)]);

      const romanEnabled = interaction.guildId ? isRomanizationEnabled(interaction.guildId) : false;
      const originalValue = romanEnabled ? await formatWithRomanization(text, sourceLang) : text;
      const translatedValue = (romanEnabled && result) ? await formatWithRomanization(result, lang) : (result || t('translate.empty_result', locale));
      const embed = new EmbedBuilder()
        .setTitle(t('translate.title', locale))
        .setColor(0x5865f2)
        .addFields(
          { name: t('translate.original_field', locale, { lang: sourceLang }), value: truncate(originalValue) },
          { name: t('translate.translated_field', locale, { lang }), value: truncate(translatedValue) }
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[translate command]', err);
      await interaction.editReply(t('translate.failed', locale));
    }
  },
};
