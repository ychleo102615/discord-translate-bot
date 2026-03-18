const { parseTranslateEmbed, buildWordMenu } = require('../commands/lookup');

async function handleInlineLookup(interaction) {
  // customId 格式：wlt:{value} 如 wlt:orig:ja 或 wlt:f0:en
  // 直接從 interaction.message 讀 embed，不需快取
  await interaction.deferReply({ ephemeral: true });

  const embed = interaction.message?.embeds?.[0];
  if (!embed) {
    return interaction.editReply({ content: '無法解析此翻譯訊息。' });
  }

  // 從 customId 取出 value（去掉 wlt: 前綴）
  const selected = interaction.customId.slice(4); // e.g. "orig:ja" or "f0:en"
  const langCode = selected.split(':')[1];

  // 從 embed 解析所有版本的文字
  const parsed = parseTranslateEmbed(embed);
  const match = parsed.find(p => p.value === selected);
  if (!match) {
    return interaction.editReply({ content: '找不到對應的文字。' });
  }

  const messageId = interaction.message.id;
  const payload = await buildWordMenu(match.text, langCode, messageId);
  if (!payload) {
    return interaction.editReply({ content: '無法從此文字中分析出任何詞彙。' });
  }
  await interaction.editReply(payload);
}

module.exports = { handleInlineLookup };
