const fs = require('fs');
const path = require('path');
const { getUserLanguage } = require('./userPrefs');
const { getGuildConfig } = require('./serverConfig');

const LOCALES_DIR = path.join(__dirname, 'locales');
const DEFAULT_LOCALE = 'zh-TW';

// 啟動時自動掃描 src/locales/*.json 載入所有 locale
const locales = {};
for (const file of fs.readdirSync(LOCALES_DIR)) {
  if (!file.endsWith('.json')) continue;
  const code = path.basename(file, '.json');
  locales[code] = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8'));
}

/**
 * 翻譯函式，支援 {param} 插值。
 * Fallback 鏈：locale[key] → locale._fallback[key] → zh-TW[key] → raw key
 */
function t(key, locale, params = {}) {
  let value = locales[locale]?.[key];

  if (value === undefined && locales[locale]?._fallback) {
    value = locales[locales[locale]._fallback]?.[key];
  }

  if (value === undefined) {
    value = locales[DEFAULT_LOCALE]?.[key];
  }

  if (value === undefined) return key;

  return value.replace(/\{(\w+)\}/g, (_, k) =>
    params[k] !== undefined ? params[k] : `{${k}}`
  );
}

/** user my-language > guild targetLang[0] > 'zh-TW' */
function resolveLocale(interaction) {
  const userLang = getUserLanguage(interaction.user.id);
  if (userLang && locales[userLang]) return userLang;

  if (interaction.guildId) {
    const config = getGuildConfig(interaction.guildId);
    if (config.targetLanguages?.[0] && locales[config.targetLanguages[0]]) {
      return config.targetLanguages[0];
    }
  }

  return DEFAULT_LOCALE;
}

/** guild targetLang[0] > 'zh-TW' */
function resolveLocaleForGuild(guildId) {
  const config = getGuildConfig(guildId);
  if (config.targetLanguages?.[0] && locales[config.targetLanguages[0]]) {
    return config.targetLanguages[0];
  }
  return DEFAULT_LOCALE;
}

function getSupportedLanguages() {
  return Object.keys(locales);
}

function getFlag(code) {
  return locales[code]?._flag || '🌐';
}

function getLangName(code, locale = DEFAULT_LOCALE) {
  return t(`lang_name.${code}`, locale);
}

/** 取得語言的自稱名稱（endonym），例如 English、日本語、한국어 */
function getNativeName(code) {
  return t(`lang_name.${code}`, code);
}

/** 搜尋所有 locale 的 lang_name.* 值，反查語言代碼 */
function getLangCode(name) {
  for (const data of Object.values(locales)) {
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('lang_name.') && value === name) {
        return key.slice('lang_name.'.length);
      }
    }
  }
  return null;
}

module.exports = {
  t,
  resolveLocale,
  resolveLocaleForGuild,
  getSupportedLanguages,
  getFlag,
  getLangName,
  getNativeName,
  getLangCode,
};
