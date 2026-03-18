const { getCachedTokens } = require('../segment/index');
const { translate } = require('../translate');
const { getUserLanguage } = require('../userPrefs');
const { getGuildConfig } = require('../serverConfig');
const { findOrCreateVocabThread, postVocabEntry } = require('../vocabThread');

async function handleWordSelect(interaction) {
  // customId 格式：wlw:{messageId}:{lang}
  const parts = interaction.customId.split(':');
  if (parts.length !== 3) return;

  const [, messageId, langCode] = parts;
  const wordIndex = parseInt(interaction.values[0], 10);

  // deferUpdate 保留單字選單不被覆蓋，可重複選擇
  await interaction.deferUpdate();

  const tokens = getCachedTokens(messageId, langCode);
  if (!tokens) {
    return interaction.followUp({ ephemeral: true, content: '⏰ 快取已過期，請重新執行「查詞」。' });
  }

  const token = tokens[wordIndex];
  if (!token) {
    return interaction.followUp({ ephemeral: true, content: '找不到該詞彙，請重新執行「查詞」。' });
  }

  // 決定目標語言：使用者偏好 > 伺服器第一個 targetLanguage > en
  const targetLang = resolveTargetLang(interaction);

  // 翻譯該詞
  const translation = await translate(token.word, targetLang);

  const channel = interaction.channel;
  if (!channel) {
    return interaction.followUp({ ephemeral: true, content: '無法取得頻道資訊，請稍後再試。' });
  }

  // 取得原始訊息連結
  let messageUrl = null;
  try {
    const msg = await channel.messages.fetch(messageId);
    messageUrl = msg.url;
  } catch {
    // 無法取得訊息連結，忽略
  }

  // 發佈到詞彙本 Thread
  const thread = await findOrCreateVocabThread(channel, interaction.user);
  await postVocabEntry(thread, {
    word: token.word,
    lemma: token.lemma,
    pos: token.pos,
    langCode,
    translation,
    targetLang,
    messageUrl,
  });

  await interaction.followUp({
    content: `✅ **${token.word}** → ${translation}\n已記錄到你的詞彙本 Thread。`,
    ephemeral: true,
  });
}

function resolveTargetLang(interaction) {
  // 1. 使用者個人設定
  const userLang = getUserLanguage(interaction.user.id);
  if (userLang) return userLang;

  // 2. 伺服器第一個 targetLanguage
  if (interaction.guildId) {
    const guildConfig = getGuildConfig(interaction.guildId);
    if (guildConfig.targetLanguages && guildConfig.targetLanguages.length > 0) {
      return guildConfig.targetLanguages[0];
    }
  }

  // 3. 預設 en
  return 'en';
}

module.exports = { handleWordSelect };
