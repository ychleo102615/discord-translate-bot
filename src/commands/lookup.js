const { ContextMenuCommandBuilder, ApplicationCommandType, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { detect } = require('../translate');
const { segment, cacheTokens } = require('../segment/index');
const { getLangCode, getFlag, getLangName } = require('../languages');

const MAX_OPTIONS = 25; // Discord Select Menu 選項上限

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

async function handleTranslateEmbed(interaction, targetMessage) {
  const embed = targetMessage.embeds[0];
  if (!embed) {
    return interaction.editReply({ content: '無法解析此 embed。' });
  }

  const options = [];

  // 解析 Description 中的原文
  if (embed.description) {
    const match = embed.description.match(/\*\*原文 \(([^)]+)\)：\*\* ([\s\S]+)/);
    if (match) {
      const lang = match[1];
      // 剔除羅馬拼音行（以 \n> * 開頭的斜體行）
      const rawText = match[2].replace(/\n> \*[^*]+\*$/, '').trim();
      options.push({ label: `原文 (${getLangName(lang) || lang})`, value: `orig:${lang}`, text: rawText });
    }
  }

  // 解析 Fields 中的翻譯版本
  if (embed.fields) {
    embed.fields.forEach((field, idx) => {
      // field.name 格式：🇯🇵 日文
      const nameMatch = field.name.match(/^.+\s(.+)$/);
      if (nameMatch) {
        const langName = nameMatch[1];
        const langCode = getLangCode(langName);
        if (langCode) {
          const rawText = field.value.replace(/\n> \*[^*]+\*$/, '').trim();
          options.push({ label: `${getFlag(langCode)} ${langName}`, value: `f${idx}:${langCode}`, text: rawText });
        }
      }
    });
  }

  if (options.length === 0) {
    return interaction.editReply({ content: '無法從此翻譯訊息中提取文字。' });
  }

  if (options.length === 1) {
    // 只有一個版本，直接斷詞
    return sendWordButtons(interaction, options[0].text, options[0].value.split(':')[1], targetMessage.id);
  }

  // 多個版本，顯示 Select Menu 讓使用者選擇
  // 將 embed 解析結果暫存到快取供 Select Menu handler 使用
  const embedTexts = {};
  options.forEach(opt => { embedTexts[opt.value] = opt.text; });
  cacheTokens(`embed:${targetMessage.id}`, 'texts', [{ word: JSON.stringify(embedTexts) }]);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`wls:${targetMessage.id}`)
    .setPlaceholder('選擇要查詞的版本')
    .addOptions(options.map(opt => ({
      label: opt.label,
      value: opt.value,
    })));

  const row = new ActionRowBuilder().addComponents(selectMenu);
  await interaction.editReply({ content: '請選擇要查詞的版本：', components: [row] });
}

async function buildWordMenu(text, langCode, messageId) {
  const tokens = await segment(text, langCode);

  if (tokens.length === 0) return null;

  // 快取斷詞結果
  cacheTokens(messageId, langCode, tokens);

  // 去重：相同的 word 只顯示一個選項
  const seen = new Set();
  const uniqueEntries = [];
  for (const token of tokens) {
    if (!seen.has(token.word)) {
      seen.add(token.word);
      uniqueEntries.push({ token, index: tokens.indexOf(token) });
    }
  }

  const displayEntries = uniqueEntries.slice(0, MAX_OPTIONS);
  const truncated = uniqueEntries.length > MAX_OPTIONS;

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`wlw:${messageId}:${langCode}`)
    .setPlaceholder('選擇要查詢的單字')
    .addOptions(displayEntries.map(({ token, index }) => ({
      label: token.word.slice(0, 100),
      description: token.pos ? token.pos.slice(0, 100) : undefined,
      value: String(index),
    })));

  const row = new ActionRowBuilder().addComponents(selectMenu);

  let content = `偵測語言：**${getLangName(langCode) || langCode}**\n選擇要查詢的單字：`;
  if (truncated) content += `\n⚠️ 僅顯示前 ${MAX_OPTIONS} 個詞`;

  return { content, components: [row] };
}

async function sendWordMenu(interaction, text, langCode, messageId) {
  const payload = await buildWordMenu(text, langCode, messageId);
  if (!payload) {
    return interaction.editReply({ content: '無法從此訊息中分析出任何詞彙。' });
  }
  await interaction.editReply(payload);
}

module.exports = { data, execute, buildWordMenu };
