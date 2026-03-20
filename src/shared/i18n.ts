import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LOCALES_DIR = path.join(__dirname, '..', 'locales');
const DEFAULT_LOCALE = 'zh-TW';

interface LocaleData {
  _fallback?: string;
  _flag?: string;
  [key: string]: string | undefined;
}

interface LocalesMap {
  [code: string]: LocaleData;
}

// 啟動時自動掃描 src/locales/*.json 載入所有 locale
const locales: LocalesMap = {};
for (const file of fs.readdirSync(LOCALES_DIR)) {
  if (!file.endsWith('.json')) continue;
  const code = path.basename(file, '.json');
  locales[code] = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8')) as LocaleData;
}

/**
 * 翻譯函式，支援 {param} 插值。
 * Fallback 鏈：locale[key] → locale._fallback[key] → zh-TW[key] → raw key
 */
export function t(key: string, locale: string, params: Record<string, string | number> = {}): string {
  let value = locales[locale]?.[key];

  if (value === undefined && locales[locale]?._fallback) {
    value = locales[locales[locale]._fallback!]?.[key];
  }

  if (value === undefined) {
    value = locales[DEFAULT_LOCALE]?.[key];
  }

  if (value === undefined) return key;

  return value.replace(/\{(\w+)\}/g, (_, k: string) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`
  );
}

export function getSupportedLanguages(): string[] {
  return Object.keys(locales);
}

export function getFlag(code: string): string {
  return locales[code]?._flag || '\u{1f310}';
}

export function getLangName(code: string, locale: string = DEFAULT_LOCALE): string {
  return t(`lang_name.${code}`, locale);
}

/** 取得語言的自稱名稱（endonym），例如 English、日本語、한국어 */
export function getNativeName(code: string): string {
  return t(`lang_name.${code}`, code);
}

/** 搜尋所有 locale 的 lang_name.* 值，反查語言代碼 */
export function getLangCode(name: string): string | null {
  for (const data of Object.values(locales)) {
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('lang_name.') && value === name) {
        return key.slice('lang_name.'.length);
      }
    }
  }
  return null;
}
