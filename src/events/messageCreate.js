const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { detect, translate } = require('../translate');
const { isChannelEnabled, getGuildConfig, isRomanizationEnabled } = require('../serverConfig');
const { formatWithRomanization } = require('../romanize/index');
const { tryAddChars } = require('../usageTracker');
const { getFlag, getLangName } = require('../languages');

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

    const romanEnabled = isRomanizationEnabled(guildId);
    const originalText = romanEnabled
      ? await formatWithRomanization(message.content, sourceLang, 4000)
      : message.content;
    const description = truncate(`**原文 (${sourceLang})：** ${originalText}`, 4096);

    const fields = await Promise.all(
      translations.map(async ({ lang, result }) => ({
        name: `${getFlag(lang)} ${getLangName(lang)}`,
        value: truncate((romanEnabled && result) ? await formatWithRomanization(result, lang) : (result || '（翻譯結果為空）')),
      }))
    );

    const embed = new EmbedBuilder()
      .setTitle('🌐 翻譯')
      .setColor(0x5865f2)
      .setDescription(description)
      .addFields(fields)
      .setFooter({ text: `用量：${usage.totalChars.toLocaleString()} 字元` });

    // 查詞按鈕：原文國旗 + 各翻譯語言國旗
    const buttons = [
      new ButtonBuilder()
        .setCustomId(`wlt:orig:${sourceLang}`)
        .setLabel(getFlag(sourceLang))
        .setStyle(ButtonStyle.Secondary),
      ...translations.map(({ lang }, idx) =>
        new ButtonBuilder()
          .setCustomId(`wlt:f${idx}:${lang}`)
          .setLabel(getFlag(lang))
          .setStyle(ButtonStyle.Secondary)
      ),
    ];

    const row = new ActionRowBuilder().addComponents(buttons);

    await message.reply({ embeds: [embed], components: [row] });

    if (usage.limitReached) {
      await message.channel.send('⚠️ 翻譯用量已達本月上限，後續訊息將不再自動翻譯。請等待下月自動重置，或由管理員執行 `/usage reset`。');
    }
  } catch (err) {
    console.error('[messageCreate] 翻譯失敗：', err);
  }
};
