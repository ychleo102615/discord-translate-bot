import type { StringSelectMenuInteraction } from 'discord.js';
import { getCachedTokens } from '../segment/index.js';
import { buildWordMenu } from '../commands/lookup.js';
import { t } from '../shared/i18n.js';
import { resolveLocale } from '../resolveLocale.js';

export async function handleLangSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  // customId 格式：wls:{targetMessageId}
  const [, targetMessageId] = interaction.customId.split(':');
  const locale = resolveLocale(interaction);

  // deferUpdate 保留原始 Select Menu 不被覆蓋
  await interaction.deferUpdate();

  // 從快取取回 embed 解析的文字
  const cached = getCachedTokens(`embed:${targetMessageId}`, 'texts');
  if (!cached || cached.length === 0) {
    await interaction.followUp({ content: t('lookup.cache_expired', locale), ephemeral: true });
    return;
  }

  let embedTexts: Record<string, string>;
  try {
    embedTexts = JSON.parse(cached[0].word) as Record<string, string>;
  } catch {
    await interaction.followUp({ content: t('lookup.parse_failed', locale), ephemeral: true });
    return;
  }

  // 使用者選擇的值，如 "orig:ja" 或 "f0:en"
  const selected = interaction.values[0];
  const text = embedTexts[selected];
  if (!text) {
    await interaction.followUp({ content: t('lookup.text_not_found', locale), ephemeral: true });
    return;
  }

  const langCode = selected.split(':')[1];

  // 斷詞並以新的 ephemeral 訊息顯示單字選單
  const payload = await buildWordMenu(text, langCode, targetMessageId, locale);
  if (!payload) {
    await interaction.followUp({ content: t('lookup.no_tokens', locale), ephemeral: true });
    return;
  }
  await interaction.followUp({ ...payload, ephemeral: true });
}
