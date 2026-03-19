import type { MessageComponentInteraction } from 'discord.js';
import { getCache } from '../segment/index.js';
import { translate } from '../translate.js';
import { getUserLanguage } from '../userPrefs.js';
import { getGuildConfig } from '../serverConfig.js';
import { findOrCreateVocabThread, postVocabEntry } from '../vocabThread.js';
import { buildPagedPayload, dedupeTokens } from '../commands/lookup.js';
import { t } from '../../../shared/i18n.js';
import { resolveLocale } from '../resolveLocale.js';

// 共用核心：翻譯單字 → 發佈詞彙本 → 更新回覆
async function processWordLookup(interaction: MessageComponentInteraction, messageId: string, langCode: string, wordIndex: number): Promise<void> {
  const locale = resolveLocale(interaction);

  const cache = getCache(messageId, langCode);
  if (!cache) {
    await interaction.followUp({ ephemeral: true, content: t('lookup.cache_expired', locale) });
    return;
  }

  const token = cache.tokens[wordIndex];
  if (!token) {
    await interaction.followUp({ ephemeral: true, content: t('lookup.word_not_found', locale) });
    return;
  }

  const targetLang = resolveTargetLang(interaction);
  const translation = await translate(token.word, targetLang);

  const channel = interaction.channel;
  if (!channel) {
    await interaction.followUp({ ephemeral: true, content: t('lookup.no_channel', locale) });
    return;
  }

  // 取得原始訊息連結
  let messageUrl: string | undefined;
  try {
    if ('messages' in channel) {
      const msg = await channel.messages.fetch(messageId);
      messageUrl = msg.url;
    }
  } catch {
    // 忽略
  }

  // 發佈到詞彙本 Thread
  const thread = await findOrCreateVocabThread(channel as any, interaction.user, locale);
  await postVocabEntry(thread, {
    word: token.word,
    lemma: token.lemma,
    pos: token.pos ?? undefined,
    langCode,
    translation,
    targetLang,
    messageUrl,
  }, locale);

  await interaction.editReply({
    content: t('lookup.result', locale, { word: token.word, translation, url: thread.url }),
    components: [],
  });
}

// 按鈕模式：直接查詞
export async function handleWordSelect(interaction: MessageComponentInteraction): Promise<void> {
  const parts = interaction.customId.split(':');
  if (parts.length !== 4) return;

  const [, messageId, langCode, indexStr] = parts;
  const wordIndex = parseInt(indexStr, 10);

  await interaction.deferUpdate();
  await processWordLookup(interaction, messageId, langCode, wordIndex);
}

// SelectMenu 模式：從選單選詞
export async function handleWordMenuSelect(interaction: MessageComponentInteraction): Promise<void> {
  // customId 格式：wlm:{msgId}:{lang}:{page}
  const parts = interaction.customId.split(':');
  if (parts.length !== 4) return;

  const [, messageId, langCode] = parts;
  const wordIndex = parseInt((interaction as any).values[0], 10);

  await interaction.deferUpdate();
  await processWordLookup(interaction, messageId, langCode, wordIndex);
}

// 翻頁按鈕：切換到指定頁
export async function handlePageNav(interaction: MessageComponentInteraction): Promise<void> {
  // customId 格式：wlp:{msgId}:{lang}:{targetPage}
  const parts = interaction.customId.split(':');
  if (parts.length !== 4) return;

  const [, messageId, langCode, pageStr] = parts;
  const page = parseInt(pageStr, 10);
  const locale = resolveLocale(interaction);

  await interaction.deferUpdate();

  const cache = getCache(messageId, langCode);
  if (!cache) {
    await interaction.followUp({ ephemeral: true, content: t('lookup.cache_expired', locale) });
    return;
  }

  const entries = dedupeTokens(cache.tokens);
  const payload = buildPagedPayload(entries, langCode, messageId, page, locale);
  await interaction.editReply(payload);
}

function resolveTargetLang(interaction: MessageComponentInteraction): string {
  const userLang = getUserLanguage(interaction.user.id);
  if (userLang) return userLang;

  if (interaction.guildId) {
    const guildConfig = getGuildConfig(interaction.guildId);
    if (guildConfig.targetLanguages && guildConfig.targetLanguages.length > 0) {
      return guildConfig.targetLanguages[0];
    }
  }

  return 'en';
}
