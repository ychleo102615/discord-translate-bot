const { ContextMenuCommandBuilder, ApplicationCommandType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { detect } = require('../translate');
const { segment, cacheTokens } = require('../segment/index');
const { getLangCode, getFlag, getLangName } = require('../languages');

const MAX_BUTTONS = 25; // Discord 按鈕上限

const data = new ContextMenuCommandBuilder()
  .setName('查詞')
  .setType(ApplicationCommandType.Message);

async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const targetMessage = interaction.targetMessage;

  // 檢查是否為 bot 自身的翻譯 embed
  if (targetMessage.author.id === interaction.client.user.id && targetMessage.embeds.length > 0) {
    return handleTranslateEmbed(interaction, targetMessage);
  }

  // 一般訊息：直接斷詞
  const text = targetMessage.content;
  if (!text || text.trim().length === 0) {
    return interaction.editReply({ content: '此訊息沒有文字內容可供查詞。' });
  }

  const langCode = await detect(text);
  return sendWordMenu(interaction, text, langCode, targetMessage.id);
}

// 從翻譯 embed 解析各語言版本的文字，回傳 [{ value, text }] 或空陣列
function parseTranslateEmbed(embed) {
  const results = [];

  if (embed.description) {
    const match = embed.description.match(/\*\*原文 \(([^)]+)\)：\*\* ([\s\S]+)/);
    if (match) {
      const lang = match[1];
      const rawText = match[2].replace(/\n> \*[^*]+\*$/, '').trim();
      results.push({ value: `orig:${lang}`, text: rawText });
    }
  }

  if (embed.fields) {
    embed.fields.forEach((field, idx) => {
      const nameMatch = field.name.match(/^.+\s(.+)$/);
      if (nameMatch) {
        const langName = nameMatch[1];
        const langCode = getLangCode(langName);
        if (langCode) {
          const rawText = field.value.replace(/\n> \*[^*]+\*$/, '').trim();
          results.push({ value: `f${idx}:${langCode}`, text: rawText });
        }
      }
    });
  }

  return results;
}

async function handleTranslateEmbed(interaction, targetMessage) {
  const embed = targetMessage.embeds[0];
  if (!embed) {
    return interaction.editReply({ content: '無法解析此 embed。' });
  }

  const options = parseTranslateEmbed(embed);

  if (options.length === 0) {
    return interaction.editReply({ content: '無法從此翻譯訊息中提取文字。' });
  }

  if (options.length === 1) {
    return sendWordMenu(interaction, options[0].text, options[0].value.split(':')[1], targetMessage.id);
  }

  // 多個版本，顯示 Select Menu 讓使用者選擇
  const embedTexts = {};
  options.forEach(opt => { embedTexts[opt.value] = opt.text; });
  cacheTokens(`embed:${targetMessage.id}`, 'texts', [{ word: JSON.stringify(embedTexts) }]);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`wls:${targetMessage.id}`)
    .setPlaceholder('選擇要查詞的版本')
    .addOptions(options.map(opt => ({
      label: opt.value.startsWith('orig:') ? `原文 (${getLangName(opt.value.split(':')[1])})` : `${getFlag(opt.value.split(':')[1])} ${getLangName(opt.value.split(':')[1])}`,
      value: opt.value,
    })));

  const row = new ActionRowBuilder().addComponents(selectMenu);
  await interaction.editReply({ content: '請選擇要查詞的版本：', components: [row] });
}

// selected: Set of indices already looked up; results: array of result lines
function buildWordPayload(tokens, langCode, messageId, selected = new Set(), results = []) {
  // 去重 + 排除已選
  const seen = new Set();
  const availableEntries = [];
  for (const token of tokens) {
    const idx = tokens.indexOf(token);
    if (!seen.has(token.word) && !selected.has(idx)) {
      seen.add(token.word);
      availableEntries.push({ token, index: idx });
    }
  }

  const content = results.length > 0 ? results.join('\n') : '';

  // 所有按鈕都已點完，或沒有剩餘單字
  if (availableEntries.length === 0) {
    return { content: content || '✅ 所有單字已查詢完畢。', components: [] };
  }

  const displayEntries = availableEntries.slice(0, MAX_BUTTONS);
  const truncated = availableEntries.length > MAX_BUTTONS;

  // 建立按鈕（每行最多 5 個）
  const rows = [];
  for (let i = 0; i < displayEntries.length; i += 5) {
    const row = new ActionRowBuilder();
    const chunk = displayEntries.slice(i, i + 5);
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

  let header = content;
  if (truncated) header += `\n⚠️ 僅顯示前 ${MAX_BUTTONS} 個詞`;

  return { content: header || '\u200b', components: rows };
}

async function buildWordMenu(text, langCode, messageId) {
  const tokens = await segment(text, langCode);
  if (tokens.length === 0) return null;

  cacheTokens(messageId, langCode, tokens);
  return buildWordPayload(tokens, langCode, messageId);
}

async function sendWordMenu(interaction, text, langCode, messageId) {
  const payload = await buildWordMenu(text, langCode, messageId);
  if (!payload) {
    return interaction.editReply({ content: '無法從此訊息中分析出任何詞彙。' });
  }
  await interaction.editReply(payload);
}

module.exports = { data, execute, buildWordMenu, buildWordPayload, parseTranslateEmbed };
