const { EmbedBuilder } = require('discord.js');
const { detect, translate } = require('../translate');
const { isChannelEnabled, getGuildConfig } = require('../serverConfig');
const { tryAddChars } = require('../usageTracker');

const LANG_FLAGS = {
  'zh-TW': '🇹🇼',
  'zh-CN': '🇨🇳',
  'zh': '🇨🇳',
  'en': '🇺🇸',
  'ja': '🇯🇵',
  'ko': '🇰🇷',
  'fr': '🇫🇷',
  'de': '🇩🇪',
  'es': '🇪🇸',
  'pt': '🇵🇹',
  'ru': '🇷🇺',
  'ar': '🇸🇦',
  'vi': '🇻🇳',
  'th': '🇹🇭',
};

const LANG_NAMES = {
  'zh-TW': '繁體中文',
  'zh-CN': '簡體中文',
  'zh': '中文',
  'en': '英文',
  'ja': '日文',
  'ko': '韓文',
  'fr': '法文',
  'de': '德文',
  'es': '西班牙文',
  'pt': '葡萄牙文',
  'ru': '俄文',
  'ar': '阿拉伯文',
  'vi': '越南文',
  'th': '泰文',
};

function getFlag(lang) {
  return LANG_FLAGS[lang] || '🌐';
}

function getLangName(lang) {
  return LANG_NAMES[lang] || lang;
}

const truncate = (s, max = 1024) => (s.length > max ? s.slice(0, max - 3) + '...' : s);

module.exports = async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (message.content.length < 2) return;

  const { guildId, channelId } = message;

  try {
    if (!isChannelEnabled(guildId, channelId)) return;

    const { targetLanguages } = getGuildConfig(guildId);
    if (!targetLanguages || targetLanguages.length === 0) return;

    const sourceLang = await detect(message.content);
    const targets = targetLanguages.filter((lang) => {
      return lang !== sourceLang && !lang.startsWith(sourceLang) && !sourceLang.startsWith(lang);
    });

    if (targets.length === 0) return;

    const totalChars = message.content.length * targets.length;
    const { usage, allowed } = tryAddChars(totalChars);
    if (!allowed) return;

    const translations = await Promise.all(
      targets.map(async (lang) => {
        const result = await translate(message.content, lang);
        return { lang, result };
      })
    );

    const description = truncate(`**原文 (${sourceLang})：** ${message.content}`, 4096);
    const embed = new EmbedBuilder()
      .setTitle('🌐 翻譯')
      .setColor(0x5865f2)
      .setDescription(description)
      .addFields(
        translations.map(({ lang, result }) => ({
          name: `${getFlag(lang)} ${getLangName(lang)}`,
          value: truncate(result || '（翻譯結果為空）'),
        }))
      )
      .setFooter({ text: `用量：${usage.totalChars.toLocaleString()} 字元` });

    await message.reply({ embeds: [embed] });

    if (usage.limitReached) {
      await message.channel.send('⚠️ 翻譯用量已達本月上限，後續訊息將不再自動翻譯。請等待下月自動重置，或由管理員執行 `/usage reset`。');
    }
  } catch (err) {
    console.error('[messageCreate] 翻譯失敗：', err);
  }
};
