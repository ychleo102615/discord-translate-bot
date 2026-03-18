const { parseTranslateEmbed, buildWordMenu } = require('../commands/lookup');
const { t, resolveLocale } = require('../i18n');

async function handleInlineLookup(interaction) {
  // customId 格式：wlt:{value} 如 wlt:orig:ja 或 wlt:f0:en
  // 直接從 interaction.message 讀 embed，不需快取
  await interaction.deferReply({ ephemeral: true });

  const locale = resolveLocale(interaction);
  const embed = interaction.message?.embeds?.[0];
  if (!embed) {
    return interaction.editReply({ content: t('lookup.cannot_parse', locale) });
  }

  // 從 customId 取出 value（去掉 wlt: 前綴）
  const selected = interaction.customId.slice(4); // e.g. "orig:ja" or "f0:en"
  const langCode = selected.split(':')[1];

  // 從 embed 解析所有版本的文字
  const parsed = parseTranslateEmbed(embed);
  const match = parsed.find(p => p.value === selected);
  if (!match) {
    return interaction.editReply({ content: t('lookup.text_not_found', locale) });
  }

  const messageId = interaction.message.id;
  const payload = await buildWordMenu(match.text, langCode, messageId, locale);
  if (!payload) {
    return interaction.editReply({ content: t('lookup.no_tokens', locale) });
  }
  await interaction.editReply(payload);
}

module.exports = { handleInlineLookup };
