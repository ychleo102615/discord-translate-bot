import * as googleStrategy from './strategies/google.js';
import * as pinyinStrategy from './strategies/pinyin.js';
import * as hangulStrategy from './strategies/hangul.js';

const PINYIN_LANGS = new Set(['zh', 'zh-TW', 'zh-CN']);
const HANGUL_LANGS = new Set(['ko']);

type ResolvedStrategy =
  | { type: 'pinyin' }
  | { type: 'hangul' }
  | { type: 'google'; normalized: string };

function resolveStrategy(langCode: string): ResolvedStrategy | null {
  if (PINYIN_LANGS.has(langCode)) return { type: 'pinyin' };
  if (HANGUL_LANGS.has(langCode)) return { type: 'hangul' };
  const base = langCode.split('-')[0];
  if (googleStrategy.SUPPORTED.has(base)) return { type: 'google', normalized: base };
  return null;
}

export function needsRomanization(langCode: string): boolean {
  return resolveStrategy(langCode) !== null;
}

export async function romanize(text: string, langCode: string): Promise<string | null> {
  const resolved = resolveStrategy(langCode);
  if (!resolved) return null;

  let result: string | null;
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

export async function formatWithRomanization(text: string, langCode: string, maxLen: number = 1024): Promise<string> {
  const romanized = await romanize(text, langCode);
  if (!romanized) return text;
  const suffix = `\n> *${romanized}*`;
  const available = maxLen - suffix.length;
  if (available <= 0) return text.length > maxLen ? text.slice(0, maxLen - 3) + '...' : text;
  const truncatedText = text.length > available ? text.slice(0, available - 3) + '...' : text;
  return `${truncatedText}${suffix}`;
}
