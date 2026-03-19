import type { Message } from 'discord.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { detect, translate } from '../translate.js';
import { isChannelEnabled, getGuildConfig, isRomanizationEnabled } from '../serverConfig.js';
import { formatWithRomanization } from '../romanize/index.js';
import { tryAddChars } from '../usageTracker.js';
import { t, getFlag, getNativeName } from '../shared/i18n.js';
import { resolveLocaleForGuild } from '../resolveLocale.js';

const truncate = (s: string, max = 1024): string => (s.length > max ? s.slice(0, max - 3) + '...' : s);

// 去除 Discord 格式標記（mention、channel、emoji、timestamp）和 URL，回傳純文字
function stripNonText(text: string): string {
  return text
    .replace(/<(?:@!?|#|@&)\d+>/g, '')       // <@id> <@!id> <#id> <@&id>
    .replace(/<a?:\w+:\d+>/g, '')             // <:name:id> <a:name:id>
    .replace(/<t:\d+(?::[tTdDfFR])?>/g, '')   // <t:timestamp:style>
    .replace(/https?:\/\/\S+/g, '')           // URL
    .trim();
}

export default async function messageCreateHandler(message: Message): Promise<void> {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (message.content.length < 2) return;

  const { guildId, channelId } = message;

  try {
    if (!isChannelEnabled(guildId!, channelId)) return;

    const { targetLanguages } = getGuildConfig(guildId!);
    if (!targetLanguages || targetLanguages.length === 0) return;

    // 去除 Discord 格式和 URL 後，檢查是否還有實質文字
    const meaningful = stripNonText(message.content);
    if (meaningful.length < 2) return;

    const locale = resolveLocaleForGuild(guildId!);

    const sourceLang = await detect(message.content);
    if (sourceLang === 'und') return;

    const targets = targetLanguages.filter((lang) => {
      return lang !== sourceLang && !lang.startsWith(sourceLang) && !sourceLang.startsWith(lang);
    });

    if (targets.length === 0) return;

    const totalChars = message.content.length * targets.length;
    const { usage, allowed } = tryAddChars(totalChars);
    if (!allowed) return;

    const allTranslations = await Promise.all(
      targets.map(async (lang) => {
        const result = await translate(message.content, lang);
        return { lang, result };
      })
    );

    // 過濾掉翻譯結果與原文相同的語言
    const translations = allTranslations.filter(({ result }) => result && result !== message.content);
    if (translations.length === 0) return;

    const romanEnabled = isRomanizationEnabled(guildId!);
    const originalText = romanEnabled
      ? await formatWithRomanization(message.content, sourceLang, 4000)
      : message.content;
    const description = truncate(t('auto.original', locale, { flag: getFlag(sourceLang), lang: sourceLang, text: originalText }), 4096);

    const fields = await Promise.all(
      translations.map(async ({ lang, result }) => ({
        name: `${getFlag(lang)} ${getNativeName(lang)}`,
        value: truncate((romanEnabled && result) ? await formatWithRomanization(result, lang) : (result || t('translate.empty_result', locale))),
      }))
    );

    const embed = new EmbedBuilder()
      .setTitle(t('auto.title', sourceLang))
      .setColor(0x5865f2)
      .setDescription(description)
      .addFields(fields)
      .setFooter({ text: t('auto.footer', locale, { chars: String(usage.totalChars.toLocaleString()) }) });

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

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

    await message.reply({ embeds: [embed], components: [row] });

    if (usage.limitReached && 'send' in message.channel) {
      await message.channel.send(t('common.usage_limit_warning', locale));
    }
  } catch (err) {
    console.error('[messageCreate] 翻譯失敗：', err);
  }
}
