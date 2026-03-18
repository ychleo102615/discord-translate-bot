const { SlashCommandBuilder } = require('discord.js');
const { getUserLanguage, setUserLanguage } = require('../userPrefs');
const { t, resolveLocale, getSupportedLanguages, getNativeName } = require('../i18n');

const langChoices = getSupportedLanguages().map(code => ({
  name: `${getNativeName(code)} (${code})`,
  value: code,
}));

const data = new SlashCommandBuilder()
  .setName('my-language')
  .setDescription('設定或查看你的個人翻譯語言偏好')
  .addSubcommand(sub =>
    sub.setName('set')
      .setDescription('設定你的偏好語言')
      .addStringOption(opt =>
        opt.setName('language')
          .setDescription('語言代碼（如 zh-TW, en, ja）')
          .setRequired(true)
          .addChoices(...langChoices)
      )
  )
  .addSubcommand(sub =>
    sub.setName('show')
      .setDescription('查看你目前的偏好語言')
  );

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const locale = resolveLocale(interaction);

  if (sub === 'set') {
    const lang = interaction.options.getString('language');
    setUserLanguage(interaction.user.id, lang);
    await interaction.reply({
      content: t('mylang.set_success', lang, { name: getNativeName(lang), code: lang }),
      ephemeral: true,
    });
    return;
  } else if (sub === 'show') {
    const lang = getUserLanguage(interaction.user.id);
    if (lang) {
      await interaction.reply({
        content: t('mylang.show_current', locale, { name: getNativeName(lang), code: lang }),
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: t('mylang.not_set', locale),
        ephemeral: true,
      });
    }
  }
}

module.exports = { data, execute };
