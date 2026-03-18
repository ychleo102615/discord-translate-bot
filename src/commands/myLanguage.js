const { SlashCommandBuilder } = require('discord.js');
const { getUserLanguage, setUserLanguage } = require('../userPrefs');
const { LANG_NAMES, getLangName } = require('../languages');

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
          .addChoices(
            ...Object.entries(LANG_NAMES).map(([code, name]) => ({
              name: `${name} (${code})`,
              value: code,
            }))
          )
      )
  )
  .addSubcommand(sub =>
    sub.setName('show')
      .setDescription('查看你目前的偏好語言')
  );

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'set') {
    const lang = interaction.options.getString('language');
    setUserLanguage(interaction.user.id, lang);
    await interaction.reply({
      content: `已將你的偏好語言設為 **${getLangName(lang)}** (${lang})`,
      ephemeral: true,
    });
  } else if (sub === 'show') {
    const lang = getUserLanguage(interaction.user.id);
    if (lang) {
      await interaction.reply({
        content: `你目前的偏好語言：**${getLangName(lang)}** (${lang})`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: '你尚未設定偏好語言。使用 `/my-language set` 來設定。',
        ephemeral: true,
      });
    }
  }
}

module.exports = { data, execute };
