import type { ButtonInteraction } from 'discord.js';
import { parseTranslateEmbed, buildWordMenu } from '../commands/lookup.js';
import { t } from '../../../shared/i18n.js';
import { resolveLocale } from '../resolveLocale.js';

export async function handleInlineLookup(interaction: ButtonInteraction): Promise<void> {
  // customId 格式：wlt:{value} 如 wlt:orig:ja 或 wlt:f0:en
  // 直接從 interaction.message 讀 embed，不需快取
  await interaction.deferReply({ ephemeral: true });

  const locale = resolveLocale(interaction);
  const embed = interaction.message?.embeds?.[0];
  if (!embed) {
    await interaction.editReply({ content: t('lookup.cannot_parse', locale) });
    return;
  }

  // 從 customId 取出 value（去掉 wlt: 前綴）
  const selected = interaction.customId.slice(4); // e.g. "orig:ja" or "f0:en"
  const langCode = selected.split(':')[1];

  // 從 embed 解析所有版本的文字
  const parsed = parseTranslateEmbed(embed);
  const match = parsed.find(p => p.value === selected);
  if (!match) {
    await interaction.editReply({ content: t('lookup.text_not_found', locale) });
    return;
  }

  const messageId = interaction.message.id;
  const payload = await buildWordMenu(match.text, langCode, messageId, locale);
  if (!payload) {
    await interaction.editReply({ content: t('lookup.no_tokens', locale) });
    return;
  }
  await interaction.editReply(payload);
}
