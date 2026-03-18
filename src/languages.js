// 薄包裝：語言相關函式全部委託給 i18n.js
const { getSupportedLanguages, getFlag, getLangName, getNativeName, getLangCode } = require('./i18n');

module.exports = { getSupportedLanguages, getFlag, getLangName, getNativeName, getLangCode };
