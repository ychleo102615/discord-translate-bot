// 薄包裝：語言相關函式全部委託給 i18n.js
const { getSupportedLanguages, getFlag, getLangName, getLangCode } = require('./i18n');

module.exports = { getSupportedLanguages, getFlag, getLangName, getLangCode };
