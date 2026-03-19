// 斷詞路由器 + 快取管理

import * as spaceStrategy from './strategies/space.js';
import * as googleNLStrategy from './strategies/googleNL.js';

export interface Token {
  word: string;
  lemma: string;
  pos: string | null;
}

export interface CacheEntry {
  tokens: Token[];
  selected: Set<number>;
  results: Array<{ word: string; translation: string }>;
  createdAt: number;
}

// 需要 Google NL API 斷詞的語言（CJK + 泰文等無空格語言）
const NL_LANGS = new Set(['zh', 'zh-TW', 'zh-CN', 'ja', 'th']);

// 記憶體快取：key = `${messageId}:${lang}`, value = CacheEntry
const segmentCache = new Map<string, CacheEntry>();
const CACHE_TTL = 15 * 60 * 1000; // 15 分鐘

function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of segmentCache) {
    if (now - entry.createdAt > CACHE_TTL) {
      segmentCache.delete(key);
    }
  }
}

// 每 5 分鐘清理一次過期快取（unref 避免阻擋 process 退出）
setInterval(cleanExpiredCache, 5 * 60 * 1000).unref();

function resolveStrategy(langCode: string): 'googleNL' | 'space' {
  if (NL_LANGS.has(langCode)) return 'googleNL';
  const base = langCode.split('-')[0];
  if (NL_LANGS.has(base)) return 'googleNL';
  return 'space';
}

export async function segment(text: string, langCode: string): Promise<Token[]> {
  const strategy = resolveStrategy(langCode);
  if (strategy === 'googleNL') {
    return googleNLStrategy.segment(text, langCode);
  }
  return spaceStrategy.segment(text);
}

export function cacheTokens(messageId: string, lang: string, tokens: Token[]): void {
  segmentCache.set(`${messageId}:${lang}`, {
    tokens,
    selected: new Set(),
    results: [],
    createdAt: Date.now(),
  });
}

export function getCache(messageId: string, lang: string): CacheEntry | null {
  const entry = segmentCache.get(`${messageId}:${lang}`);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > CACHE_TTL) {
    segmentCache.delete(`${messageId}:${lang}`);
    return null;
  }
  return entry;
}

export function getCachedTokens(messageId: string, lang: string): Token[] | null {
  return getCache(messageId, lang)?.tokens || null;
}
