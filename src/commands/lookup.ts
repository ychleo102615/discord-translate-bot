import { ContextMenuCommandBuilder, ApplicationCommandType, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { detect } from '../translate.js';
import { segment, cacheTokens } from '../segment/index.js';
import { t, getFlag, getNativeName, getLangCode } from '../shared/i18n.js';
import { resolveLocale } from '../resolveLocale.js';

const MAX_BUTTONS = 25; // 按鈕模式上限
const PAGE_SIZE = 25;   // 選單模式每頁詞數

export const data = new ContextMenuCommandBuilder()
  .setName('查詞')
  .setType(ApplicationCommandType.Message);

export async function execute(interaction: any): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const locale = resolveLocale(interaction);
  const targetMessage = interaction.targetMessage;

  // 檢查是否為 bot 自身的翻譯 embed
  if (targetMessage.author.id === interaction.client.user.id && targetMessage.embeds.length > 0) {
    return handleTranslateEmbed(interaction, targetMessage, locale);
  }

  // 一般訊息：直接斷詞
  const text = targetMessage.content;
  if (!text || text.trim().length === 0) {
    return interaction.editReply({ content: t('lookup.no_text', locale) });
  }

  const langCode = await detect(text);
  return sendWordMenu(interaction, text, langCode, targetMessage.id, locale);
}

// 從翻譯 embed 解析各語言版本的文字，回傳 [{ value, text }] 或空陣列
// 使用 locale-agnostic regex 以相容所有語言的 embed 格式
export function parseTranslateEmbed(embed: any): Array<{ value: string; text: string }> {
  const results: Array<{ value: string; text: string }> = [];

  if (embed.description) {
    // 匹配 **<任意文字> (<langCode>)：** 或 **<任意文字> (<langCode>):** 格式
    const match = embed.description.match(/\*\*[^(]+\(([^)]+)\)[：:]\*\*\s*([\s\S]+)/);
    if (match) {
      const lang = match[1];
      const rawText = match[2].replace(/\n> \*[^*]+\*$/, '').trim();
      results.push({ value: `orig:${lang}`, text: rawText });
    }
  }

  if (embed.fields) {
    embed.fields.forEach((field: any, idx: number) => {
      // field name 格式："{flag} {langName}"，取第一個空格之後的全部文字作為語言名稱
      const spaceIdx = field.name.indexOf(' ');
      if (spaceIdx === -1) return;
      const langName = field.name.slice(spaceIdx + 1);
      const langCode = getLangCode(langName);
      if (langCode) {
        const rawText = field.value.replace(/\n> \*[^*]+\*$/, '').trim();
        results.push({ value: `f${idx}:${langCode}`, text: rawText });
      }
    });
  }

  return results;
}

async function handleTranslateEmbed(interaction: any, targetMessage: any, locale: string): Promise<void> {
  const embed = targetMessage.embeds[0];
  if (!embed) {
    return interaction.editReply({ content: t('lookup.cannot_parse', locale) });
  }

  const options = parseTranslateEmbed(embed);

  if (options.length === 0) {
    return interaction.editReply({ content: t('lookup.cannot_extract', locale) });
  }

  if (options.length === 1) {
    return sendWordMenu(interaction, options[0].text, options[0].value.split(':')[1], targetMessage.id, locale);
  }

  // 多個版本，顯示 Select Menu 讓使用者選擇
  const embedTexts: Record<string, string> = {};
  options.forEach(opt => { embedTexts[opt.value] = opt.text; });
  cacheTokens(`embed:${targetMessage.id}`, 'texts', [{ word: JSON.stringify(embedTexts), lemma: '', pos: '' }]);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`wls:${targetMessage.id}`)
    .setPlaceholder(t('lookup.select_placeholder', locale))
    .addOptions(options.map(opt => {
      const code = opt.value.split(':')[1];
      return {
        label: opt.value.startsWith('orig:')
          ? t('lookup.original_label', locale, { lang: getNativeName(code) })
          : `${getFlag(code)} ${getNativeName(code)}`,
        value: opt.value,
      };
    }));

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
  await interaction.editReply({ content: t('lookup.select_prompt', locale), components: [row] });
}

// 去重邏輯，回傳 [{ token, index }]
export function dedupeTokens(tokens: any[], selected: Set<number> = new Set()): Array<{ token: any; index: number }> {
  const seen = new Set<string>();
  const entries: Array<{ token: any; index: number }> = [];
  for (const token of tokens) {
    const idx = tokens.indexOf(token);
    if (!seen.has(token.word) && !selected.has(idx)) {
      seen.add(token.word);
      entries.push({ token, index: idx });
    }
  }
  return entries;
}

// selected: Set of indices already looked up; results: array of result lines
export function buildWordPayload(tokens: any[], langCode: string, messageId: string, selected: Set<number> = new Set(), results: string[] = [], locale: string = 'zh-TW'): any {
  const availableEntries = dedupeTokens(tokens, selected);
  const content = results.length > 0 ? results.join('\n') : '';

  // 所有按鈕都已點完，或沒有剩餘單字
  if (availableEntries.length === 0) {
    return { content: content || t('lookup.all_done', locale), components: [] };
  }

  // >25 詞：切換為 SelectMenu + 翻頁按鈕
  if (availableEntries.length > MAX_BUTTONS) {
    return buildPagedPayload(availableEntries, langCode, messageId, 0, locale, content);
  }

  // ≤25 詞：維持按鈕模式
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < availableEntries.length; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    const chunk = availableEntries.slice(i, i + 5);
    chunk.forEach(({ token, index }) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`wlw:${messageId}:${langCode}:${index}`)
          .setLabel(token.word.slice(0, 80))
          .setStyle(ButtonStyle.Primary)
      );
    });
    rows.push(row);
  }

  return { content: content || '\u200b', components: rows };
}

// SelectMenu + 翻頁按鈕模式
export function buildPagedPayload(entries: Array<{ token: any; index: number }>, langCode: string, messageId: string, page: number, locale: string, headerContent: string = ''): any {
  const totalPages = Math.ceil(entries.length / PAGE_SIZE);
  const pageEntries = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // SelectMenu options
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`wlm:${messageId}:${langCode}:${page}`)
    .setPlaceholder(t('lookup.select_word', locale))
    .addOptions(pageEntries.map(({ token, index }) => {
      const option: { label: string; value: string; description?: string } = { label: token.word.slice(0, 100), value: String(index) };
      if (token.pos) option.description = token.pos;
      return option;
    }));

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  // 翻頁按鈕列
  const paginationRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`wlp:${messageId}:${langCode}:${page - 1}`)
      .setLabel(t('lookup.page_prev', locale))
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`wli:${messageId}`)
      .setLabel(t('lookup.page_indicator', locale, { current: String(page + 1), total: String(totalPages) }))
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`wlp:${messageId}:${langCode}:${page + 1}`)
      .setLabel(t('lookup.page_next', locale))
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1),
  );

  return {
    content: headerContent || '\u200b',
    components: [selectRow, paginationRow],
  };
}

export async function buildWordMenu(text: string, langCode: string, messageId: string, locale: string = 'zh-TW'): Promise<any> {
  const tokens = await segment(text, langCode);
  if (tokens.length === 0) return null;

  cacheTokens(messageId, langCode, tokens);
  return buildWordPayload(tokens, langCode, messageId, undefined, undefined, locale);
}

async function sendWordMenu(interaction: any, text: string, langCode: string, messageId: string, locale: string): Promise<void> {
  const payload = await buildWordMenu(text, langCode, messageId, locale);
  if (!payload) {
    return interaction.editReply({ content: t('lookup.no_tokens', locale) });
  }
  await interaction.editReply(payload);
}
