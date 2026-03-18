const { getCache } = require('../segment/index');
const { translate } = require('../translate');
const { getUserLanguage } = require('../userPrefs');
const { getGuildConfig } = require('../serverConfig');
const { findOrCreateVocabThread, postVocabEntry } = require('../vocabThread');

async function handleWordSelect(interaction) {
  // customId 格式：wlw:{messageId}:{lang}:{wordIndex}
  const parts = interaction.customId.split(':');
  if (parts.length !== 4) return;

  const [, messageId, langCode, indexStr] = parts;
  const wordIndex = parseInt(indexStr, 10);

  await interaction.deferUpdate();

  const cache = getCache(messageId, langCode);
  if (!cache) {
    return interaction.followUp({ ephemeral: true, content: '⏰ 快取已過期，請重新執行「查詞」。' });
  }

  const token = cache.tokens[wordIndex];
  if (!token) {
    return interaction.followUp({ ephemeral: true, content: '找不到該詞彙，請重新執行「查詞」。' });
  }

  const targetLang = resolveTargetLang(interaction);
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
    // 忽略
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

  await interaction.editReply({
    content: `📖 **${token.word}** → ${translation}　[詞彙本](${thread.url})`,
    components: [],
  });
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

module.exports = { handleWordSelect };
