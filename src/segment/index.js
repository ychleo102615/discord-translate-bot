// 斷詞路由器 + 快取管理

const spaceStrategy = require('./strategies/space');
const googleNLStrategy = require('./strategies/googleNL');

// 需要 Google NL API 斷詞的語言（CJK + 泰文等無空格語言）
const NL_LANGS = new Set(['zh', 'zh-TW', 'zh-CN', 'ja', 'th']);

// 記憶體快取：key = `${messageId}:${lang}`, value = { tokens, createdAt }
const segmentCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 分鐘

function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of segmentCache) {
    if (now - entry.createdAt > CACHE_TTL) {
      segmentCache.delete(key);
    }
  }
}

// 每 5 分鐘清理一次過期快取（unref 避免阻擋 process 退出）
setInterval(cleanExpiredCache, 5 * 60 * 1000).unref();

function resolveStrategy(langCode) {
  if (NL_LANGS.has(langCode)) return 'googleNL';
  const base = langCode.split('-')[0];
  if (NL_LANGS.has(base)) return 'googleNL';
  return 'space';
}

async function segment(text, langCode) {
  const strategy = resolveStrategy(langCode);
  if (strategy === 'googleNL') {
    return googleNLStrategy.segment(text, langCode);
  }
  return spaceStrategy.segment(text);
}

function cacheTokens(messageId, lang, tokens) {
  segmentCache.set(`${messageId}:${lang}`, {
    tokens,
    selected: new Set(),
    results: [],
    createdAt: Date.now(),
  });
}

function getCache(messageId, lang) {
  const entry = segmentCache.get(`${messageId}:${lang}`);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > CACHE_TTL) {
    segmentCache.delete(`${messageId}:${lang}`);
    return null;
  }
  return entry;
}

function getCachedTokens(messageId, lang) {
  return getCache(messageId, lang)?.tokens || null;
}

module.exports = { segment, cacheTokens, getCache, getCachedTokens };
