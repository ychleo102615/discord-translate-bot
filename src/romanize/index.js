const googleStrategy = require('./strategies/google');
const pinyinStrategy = require('./strategies/pinyin');
const hangulStrategy = require('./strategies/hangul');

const PINYIN_LANGS = new Set(['zh', 'zh-TW', 'zh-CN']);
const HANGUL_LANGS = new Set(['ko']);

function resolveStrategy(langCode) {
  if (PINYIN_LANGS.has(langCode)) return { type: 'pinyin' };
  if (HANGUL_LANGS.has(langCode)) return { type: 'hangul' };
  const base = langCode.split('-')[0];
  if (googleStrategy.SUPPORTED.has(base)) return { type: 'google', normalized: base };
  return null;
}

function needsRomanization(langCode) {
  return resolveStrategy(langCode) !== null;
}

async function romanize(text, langCode) {
  const resolved = resolveStrategy(langCode);
  if (!resolved) return null;

  let result;
  switch (resolved.type) {
    case 'pinyin':
      result = pinyinStrategy.romanize(text);
      break;
    case 'hangul':
      result = hangulStrategy.romanize(text);
      break;
    case 'google':
      result = await googleStrategy.romanize(text, resolved.normalized);
      break;
  }

  if (!result || result.toLowerCase() === text.toLowerCase()) return null;
  return result;
}

async function formatWithRomanization(text, langCode, maxLen = 1024) {
  const romanized = await romanize(text, langCode);
  if (!romanized) return text;
  const suffix = `\n> *${romanized}*`;
  const available = maxLen - suffix.length;
  if (available <= 0) return text.length > maxLen ? text.slice(0, maxLen - 3) + '...' : text;
  const truncatedText = text.length > available ? text.slice(0, available - 3) + '...' : text;
  return `${truncatedText}${suffix}`;
}

module.exports = { romanize, formatWithRomanization, needsRomanization };
