const { getCachedTokens } = require('../segment/index');
const { buildWordMenu } = require('../commands/lookup');
const { t, resolveLocale } = require('../i18n');

async function handleLangSelect(interaction) {
  // customId 格式：wls:{targetMessageId}
  const [, targetMessageId] = interaction.customId.split(':');
  const locale = resolveLocale(interaction);

  // deferUpdate 保留原始 Select Menu 不被覆蓋
  await interaction.deferUpdate();

  // 從快取取回 embed 解析的文字
  const cached = getCachedTokens(`embed:${targetMessageId}`, 'texts');
  if (!cached || cached.length === 0) {
    return interaction.followUp({ content: t('lookup.cache_expired', locale), ephemeral: true });
  }

  let embedTexts;
  try {
    embedTexts = JSON.parse(cached[0].word);
  } catch {
    return interaction.followUp({ content: t('lookup.parse_failed', locale), ephemeral: true });
  }

  // 使用者選擇的值，如 "orig:ja" 或 "f0:en"
  const selected = interaction.values[0];
  const text = embedTexts[selected];
  if (!text) {
    return interaction.followUp({ content: t('lookup.text_not_found', locale), ephemeral: true });
  }

  const langCode = selected.split(':')[1];

  // 斷詞並以新的 ephemeral 訊息顯示單字選單
  const payload = await buildWordMenu(text, langCode, targetMessageId, locale);
  if (!payload) {
    return interaction.followUp({ content: t('lookup.no_tokens', locale), ephemeral: true });
  }
  await interaction.followUp({ ...payload, ephemeral: true });
}

module.exports = { handleLangSelect };
