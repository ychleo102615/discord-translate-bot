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

// 語言名稱 → 代碼的反查映射
const LANG_CODES = Object.fromEntries(
  Object.entries(LANG_NAMES).map(([code, name]) => [name, code])
);

function getFlag(lang) {
  return LANG_FLAGS[lang] || '🌐';
}

function getLangName(lang) {
  return LANG_NAMES[lang] || lang;
}

function getLangCode(name) {
  return LANG_CODES[name] || null;
}

module.exports = { LANG_FLAGS, LANG_NAMES, LANG_CODES, getFlag, getLangName, getLangCode };
