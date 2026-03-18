const { getCache } = require('../segment/index');
const { translate } = require('../translate');
const { getUserLanguage } = require('../userPrefs');
const { getGuildConfig } = require('../serverConfig');
const { findOrCreateVocabThread, postVocabEntry } = require('../vocabThread');
const { buildPagedPayload, dedupeTokens } = require('../commands/lookup');
const { t, resolveLocale } = require('../i18n');

// 共用核心：翻譯單字 → 發佈詞彙本 → 更新回覆
async function processWordLookup(interaction, messageId, langCode, wordIndex) {
  const locale = resolveLocale(interaction);

  const cache = getCache(messageId, langCode);
  if (!cache) {
    return interaction.followUp({ ephemeral: true, content: t('lookup.cache_expired', locale) });
  }

  const token = cache.tokens[wordIndex];
  if (!token) {
    return interaction.followUp({ ephemeral: true, content: t('lookup.word_not_found', locale) });
  }

  const targetLang = resolveTargetLang(interaction);
  const translation = await translate(token.word, targetLang);

  const channel = interaction.channel;
  if (!channel) {
    return interaction.followUp({ ephemeral: true, content: t('lookup.no_channel', locale) });
  }

  // 取得原始訊息連結
  let messageUrl = null;
  try {
    const msg = await channel.messages.fetch(messageId);
    messageUrl = msg.url;
  } catch {
    // 忽略
  }

  // 發佈到詞彙本 Thread
  const thread = await findOrCreateVocabThread(channel, interaction.user, locale);
  await postVocabEntry(thread, {
    word: token.word,
    lemma: token.lemma,
    pos: token.pos,
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
async function handleWordSelect(interaction) {
  const parts = interaction.customId.split(':');
  if (parts.length !== 4) return;

  const [, messageId, langCode, indexStr] = parts;
  const wordIndex = parseInt(indexStr, 10);

  await interaction.deferUpdate();
  await processWordLookup(interaction, messageId, langCode, wordIndex);
}

// SelectMenu 模式：從選單選詞
async function handleWordMenuSelect(interaction) {
  // customId 格式：wlm:{msgId}:{lang}:{page}
  const parts = interaction.customId.split(':');
  if (parts.length !== 4) return;

  const [, messageId, langCode] = parts;
  const wordIndex = parseInt(interaction.values[0], 10);

  await interaction.deferUpdate();
  await processWordLookup(interaction, messageId, langCode, wordIndex);
}

// 翻頁按鈕：切換到指定頁
async function handlePageNav(interaction) {
  // customId 格式：wlp:{msgId}:{lang}:{targetPage}
  const parts = interaction.customId.split(':');
  if (parts.length !== 4) return;

  const [, messageId, langCode, pageStr] = parts;
  const page = parseInt(pageStr, 10);
  const locale = resolveLocale(interaction);

  await interaction.deferUpdate();

  const cache = getCache(messageId, langCode);
  if (!cache) {
    return interaction.followUp({ ephemeral: true, content: t('lookup.cache_expired', locale) });
  }

  const entries = dedupeTokens(cache.tokens);
  const payload = buildPagedPayload(entries, langCode, messageId, page, locale);
  await interaction.editReply(payload);
}

function resolveTargetLang(interaction) {
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

module.exports = { handleWordSelect, handleWordMenuSelect, handlePageNav };
