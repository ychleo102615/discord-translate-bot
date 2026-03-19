# Modular Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Discord translate bot from JavaScript/CommonJS to TypeScript/ESM, then restructure into a modular architecture where the bot layer is a pure router and each feature (translate, future community, etc.) is an isolated module.

**Architecture:** Two-phase refactor. Phase 1 converts all ~20 JS/CJS files to TS/ESM in one atomic pass (required because `"type": "module"` affects all files at once). Phase 2 restructures into `src/bot/` (router framework), `src/shared/` (cross-module utilities), and `src/modules/translate/` (the existing translate feature packaged as a module). The module system uses a `BotModule` interface contract so new modules can be added without modifying bot core.

**Tech Stack:** TypeScript, ESM (`"type": "module"`), discord.js v14, Node.js, tsx (dev runner)

**Reference:** See `openspec/changes/modular-architecture/` for proposal, design, and task overview.

---

## File Structure

### Phase 1: TS + ESM Migration (rename in-place, no restructuring)

All existing `.js` files renamed to `.ts` with ESM syntax. No directory changes.

| File | Action | Notes |
|------|--------|-------|
| `tsconfig.json` | Create | strict, node16, outDir: dist |
| `package.json` | Modify | type: module, add scripts, add devDeps |
| `.gitignore` | Modify | add dist/ |
| `index.js` → `index.ts` | Rename + convert | ESM syntax |
| `deploy-commands.js` → `deploy-commands.ts` | Rename + convert | ESM syntax |
| `src/bot.js` → `src/bot.ts` | Rename + convert | ESM syntax |
| `src/i18n.js` → `src/i18n.ts` | Rename + convert | __dirname → import.meta.url |
| `src/languages.js` → `src/languages.ts` | Rename + convert | ESM syntax |
| `src/translate.js` → `src/translate.ts` | Rename + convert | ESM syntax |
| `src/serverConfig.js` → `src/serverConfig.ts` | Rename + convert | __dirname → import.meta.url |
| `src/usageTracker.js` → `src/usageTracker.ts` | Rename + convert | __dirname → import.meta.url |
| `src/userPrefs.js` → `src/userPrefs.ts` | Rename + convert | __dirname → import.meta.url |
| `src/vocabThread.js` → `src/vocabThread.ts` | Rename + convert | __dirname → import.meta.url |
| `src/commands/index.js` → `.ts` | Rename + convert | ESM syntax |
| `src/commands/translate.js` → `.ts` | Rename + convert | ESM syntax |
| `src/commands/setup.js` → `.ts` | Rename + convert | ESM syntax |
| `src/commands/usage.js` → `.ts` | Rename + convert | ESM syntax |
| `src/commands/lookup.js` → `.ts` | Rename + convert | ESM syntax |
| `src/commands/myLanguage.js` → `.ts` | Rename + convert | ESM syntax |
| `src/events/messageCreate.js` → `.ts` | Rename + convert | ESM syntax |
| `src/events/interactionCreate.js` → `.ts` | Rename + convert | ESM syntax |
| `src/interactions/lookupButtons.js` → `.ts` | Rename + convert | ESM syntax |
| `src/interactions/lookupSelectMenu.js` → `.ts` | Rename + convert | ESM syntax |
| `src/interactions/lookupInline.js` → `.ts` | Rename + convert | ESM syntax |
| `src/romanize/index.js` → `.ts` | Rename + convert | ESM syntax |
| `src/romanize/strategies/pinyin.js` → `.ts` | Rename + convert | ESM syntax |
| `src/romanize/strategies/hangul.js` → `.ts` | Rename + convert | ESM syntax |
| `src/romanize/strategies/google.js` → `.ts` | Rename + convert | ESM syntax |
| `src/segment/index.js` → `.ts` | Rename + convert | ESM syntax |
| `src/segment/strategies/googleNL.js` → `.ts` | Rename + convert | ESM syntax |
| `src/segment/strategies/space.js` → `.ts` | Rename + convert | ESM syntax |

### Phase 2: Modular Restructuring

| File | Action | Notes |
|------|--------|-------|
| `src/shared/types.ts` | Create | BotModule, ModuleContext interfaces |
| `src/shared/i18n.ts` | Move from `src/i18n.ts` | |
| `src/shared/languages.ts` | Move from `src/languages.ts` | |
| `src/bot/client.ts` | Create | Discord Client factory |
| `src/bot/loader.ts` | Create | Module scanner + registrar |
| `src/bot/router.ts` | Create | interactionCreate dispatcher |
| `src/modules/translate/index.ts` | Create | BotModule entry point |
| `src/modules/translate/commands/*` | Move from `src/commands/*` | |
| `src/modules/translate/events/*` | Move from `src/events/*` | |
| `src/modules/translate/interactions/*` | Move from `src/interactions/*` | |
| `src/modules/translate/romanize/*` | Move from `src/romanize/*` | |
| `src/modules/translate/segment/*` | Move from `src/segment/*` | |
| `src/modules/translate/translate.ts` | Move from `src/translate.ts` | |
| `src/modules/translate/serverConfig.ts` | Move from `src/serverConfig.ts` | |
| `src/modules/translate/usageTracker.ts` | Move from `src/usageTracker.ts` | |
| `src/modules/translate/userPrefs.ts` | Move from `src/userPrefs.ts` | |
| `src/modules/translate/vocabThread.ts` | Move from `src/vocabThread.ts` | |
| `src/index.ts` | Rewrite | New entry point using loader |
| `deploy-commands.ts` | Modify | Import from new module paths |
| `src/bot.ts` | Delete | Replaced by bot/client + bot/loader |

---

## Phase 1: TypeScript + ESM Migration

### Task 1: Project Setup

**Files:**
- Create: `tsconfig.json`
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Install dev dependencies**

```bash
npm install --save-dev typescript tsx @types/node
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "node16",
    "moduleResolution": "node16",
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts", "index.ts", "deploy-commands.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Update package.json**

Set `"type": "module"` and add scripts:

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx --watch index.ts",
    "build": "tsc && npm run copy-assets",
    "copy-assets": "cp -r src/locales dist/src/locales",
    "start": "node dist/index.js",
    "deploy": "tsx deploy-commands.ts"
  }
}
```

Remove the old `"test"` script placeholder.

Note on `copy-assets`: `tsc` only compiles `.ts` files — it does NOT copy `.json` locale files to `dist/`. The `copy-assets` script ensures `src/locales/*.json` is available at `dist/src/locales/` so that `i18n.ts`'s `__dirname`-based path resolves correctly in production mode.

- [ ] **Step 4: Update .gitignore**

Add `dist/` line.

- [ ] **Step 5: Commit**

```bash
git add tsconfig.json package.json package-lock.json .gitignore
git commit -m "chore: add TypeScript + ESM project setup"
```

---

### Task 2: Convert Leaf Modules (no internal dependencies)

These files only import external npm packages — no internal `require()` calls. Convert them first because they have zero dependency risk.

**Files:**
- Rename: `src/translate.js` → `src/translate.ts`
- Rename: `src/romanize/strategies/pinyin.js` → `.ts`
- Rename: `src/romanize/strategies/hangul.js` → `.ts`
- Rename: `src/romanize/strategies/google.js` → `.ts`
- Rename: `src/segment/strategies/googleNL.js` → `.ts`
- Rename: `src/segment/strategies/space.js` → `.ts`

- [ ] **Step 1: Rename all 6 files**

```bash
cd /Users/leo-huang/Projects/node/discord-translate-bot
git mv src/translate.js src/translate.ts
git mv src/romanize/strategies/pinyin.js src/romanize/strategies/pinyin.ts
git mv src/romanize/strategies/hangul.js src/romanize/strategies/hangul.ts
git mv src/romanize/strategies/google.js src/romanize/strategies/google.ts
git mv src/segment/strategies/googleNL.js src/segment/strategies/googleNL.ts
git mv src/segment/strategies/space.js src/segment/strategies/space.ts
```

- [ ] **Step 2: Convert src/translate.ts**

From:
```js
const { Translate } = require('@google-cloud/translate').v2;
// ...
module.exports = { detect, translate };
```

To:
```ts
import Translate from '@google-cloud/translate';

const { Translate: TranslateClient } = Translate.v2;
const translator = new TranslateClient();

export async function detect(text: string): Promise<string> {
  const [detections] = await translator.detect(text);
  return detections.language;
}

export async function translate(text: string, targetLang: string): Promise<string> {
  const [translation] = await translator.translate(text, targetLang);
  return translation;
}
```

Note: `@google-cloud/translate` is a CJS package. ESM importing CJS uses default import. Access `.v2` after import. Verify the actual export shape — if `import { v2 } from '@google-cloud/translate'` works, prefer that. Otherwise use `import pkg from '...'` + `const { Translate } = pkg.v2`.

- [ ] **Step 3: Convert src/romanize/strategies/pinyin.ts**

```ts
import { pinyin } from 'pinyin-pro';

export function romanize(text: string): string {
  return pinyin(text, { toneType: 'symbol' });
}
```

- [ ] **Step 4: Convert src/romanize/strategies/hangul.ts**

```ts
import hangul from 'hangul-romanization';

export function romanize(text: string): string {
  return hangul.convert(text);
}
```

Note: `hangul-romanization` is CJS — use default import.

- [ ] **Step 5: Convert src/romanize/strategies/google.ts**

```ts
import { v3 } from '@google-cloud/translate';

const client = new v3.TranslationServiceClient();
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'discord-tranlate-bot';
const PARENT = `projects/${PROJECT_ID}/locations/global`;

export const SUPPORTED = new Set(['ar', 'am', 'bn', 'be', 'gu', 'hi', 'ja', 'kn', 'my', 'ru', 'sr', 'ta', 'te', 'uk']);

export async function romanize(text: string, sourceLanguageCode: string): Promise<string | null> {
  const [response] = await client.romanizeText({
    parent: PARENT,
    contents: [text],
    sourceLanguageCode,
  });
  return response.romanizations?.[0]?.romanizedText || null;
}
```

Note: Check if `import { v3 } from '@google-cloud/translate'` works. If not, use `import pkg from '@google-cloud/translate'; const { v3 } = pkg;`. The v2 and v3 imports may need different strategies since this is a CJS package.

- [ ] **Step 6: Convert src/segment/strategies/googleNL.ts**

```ts
import language from '@google-cloud/language';

const client = new language.LanguageServiceClient();

interface Token {
  word: string;
  lemma: string;
  pos: string | null;
}

export async function segment(text: string, lang: string): Promise<Token[]> {
  const document = {
    content: text,
    type: 'PLAIN_TEXT' as const,
    language: lang,
  };

  const [result] = await client.analyzeSyntax({ document, encodingType: 'UTF8' });
  const tokens = result.tokens || [];

  return tokens
    .filter((t: any) => t.partOfSpeech?.tag !== 'PUNCT')
    .map((t: any) => ({
      word: t.text?.content || '',
      lemma: t.lemma || t.text?.content || '',
      pos: t.partOfSpeech?.tag || null,
    }))
    .filter((t: Token) => t.word.length > 0);
}
```

Note: `@google-cloud/language` is CJS. Use default import.

- [ ] **Step 7: Convert src/segment/strategies/space.ts**

```ts
interface Token {
  word: string;
  lemma: string;
  pos: null;
}

export function segment(text: string): Token[] {
  return text
    .split(/[\s,.!?;:。、！？；：「」『』（）""''…—\-–]+/)
    .map(w => w.trim())
    .filter(w => w.length > 0)
    .map(word => ({ word, lemma: word, pos: null }));
}
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: convert leaf modules to TypeScript + ESM"
```

---

### Task 3: Convert Strategy Routers

These import the strategies converted in Task 2.

**Files:**
- Rename: `src/romanize/index.js` → `.ts`
- Rename: `src/segment/index.js` → `.ts`

- [ ] **Step 1: Rename files**

```bash
git mv src/romanize/index.js src/romanize/index.ts
git mv src/segment/index.js src/segment/index.ts
```

- [ ] **Step 2: Convert src/romanize/index.ts**

```ts
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

export async function formatWithRomanization(text: string, langCode: string, maxLen = 1024): Promise<string> {
  const romanized = await romanize(text, langCode);
  if (!romanized) return text;
  const suffix = `\n> *${romanized}*`;
  const available = maxLen - suffix.length;
  if (available <= 0) return text.length > maxLen ? text.slice(0, maxLen - 3) + '...' : text;
  const truncatedText = text.length > available ? text.slice(0, available - 3) + '...' : text;
  return `${truncatedText}${suffix}`;
}
```

- [ ] **Step 3: Convert src/segment/index.ts**

```ts
import * as spaceStrategy from './strategies/space.js';
import * as googleNLStrategy from './strategies/googleNL.js';

export interface Token {
  word: string;
  lemma: string;
  pos: string | null;
}

interface CacheEntry {
  tokens: Token[];
  selected: Set<number>;
  results: string[];
  createdAt: number;
}

const NL_LANGS = new Set(['zh', 'zh-TW', 'zh-CN', 'ja', 'th']);

const segmentCache = new Map<string, CacheEntry>();
const CACHE_TTL = 15 * 60 * 1000;

function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of segmentCache) {
    if (now - entry.createdAt > CACHE_TTL) {
      segmentCache.delete(key);
    }
  }
}

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
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: convert strategy routers to TypeScript + ESM"
```

---

### Task 4: Convert Data Layer (files using __dirname)

These files use `__dirname` for constructing file paths to `data/` or `locales/`. All need the `import.meta.url` conversion.

**Files:**
- Rename: `src/userPrefs.js` → `.ts`
- Rename: `src/serverConfig.js` → `.ts`
- Rename: `src/usageTracker.js` → `.ts`
- Rename: `src/vocabThread.js` → `.ts`
- Rename: `src/i18n.js` → `.ts`
- Rename: `src/languages.js` → `.ts`

- [ ] **Step 1: Rename all 6 files**

```bash
git mv src/userPrefs.js src/userPrefs.ts
git mv src/serverConfig.js src/serverConfig.ts
git mv src/usageTracker.js src/usageTracker.ts
git mv src/vocabThread.js src/vocabThread.ts
git mv src/i18n.js src/i18n.ts
git mv src/languages.js src/languages.ts
```

- [ ] **Step 2: Convert src/userPrefs.ts**

```ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const PREFS_PATH = path.join(DATA_DIR, 'userPrefs.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface UserPrefsData {
  [userId: string]: { language?: string };
}

function loadPrefs(): UserPrefsData {
  ensureDataDir();
  if (!fs.existsSync(PREFS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(PREFS_PATH, 'utf8'));
  } catch (err: any) {
    console.warn('[userPrefs] userPrefs.json 損毀，重新建立：', err.message);
    return {};
  }
}

function savePrefs(prefs: UserPrefsData): void {
  ensureDataDir();
  fs.writeFileSync(PREFS_PATH, JSON.stringify(prefs, null, 2));
}

export function getUserLanguage(userId: string): string | null {
  const prefs = loadPrefs();
  return prefs[userId]?.language || null;
}

export function setUserLanguage(userId: string, language: string): void {
  const prefs = loadPrefs();
  if (!prefs[userId]) prefs[userId] = {};
  prefs[userId].language = language;
  savePrefs(prefs);
}
```

- [ ] **Step 3: Convert src/serverConfig.ts**

```ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface GuildConfig {
  enabledChannels: string[];
  targetLanguages: string[];
  showRomanization?: boolean;
}

interface ConfigData {
  [guildId: string]: GuildConfig;
}

function loadConfig(): ConfigData {
  ensureDataDir();
  if (!fs.existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (err: any) {
    console.warn('[serverConfig] config.json 損毀，重新建立：', err.message);
    return {};
  }
}

function saveConfig(config: ConfigData): void {
  ensureDataDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

const DEFAULT_GUILD_CONFIG: GuildConfig = { enabledChannels: [], targetLanguages: [], showRomanization: false };

export function getGuildConfig(guildId: string): GuildConfig {
  const config = loadConfig();
  return config[guildId] || DEFAULT_GUILD_CONFIG;
}

export function addLanguage(guildId: string, lang: string): boolean {
  const config = loadConfig();
  if (!config[guildId]) config[guildId] = { enabledChannels: [], targetLanguages: [] };
  if (!config[guildId].targetLanguages.includes(lang)) {
    config[guildId].targetLanguages.push(lang);
    saveConfig(config);
    return true;
  }
  return false;
}

export function removeLanguage(guildId: string, lang: string): boolean {
  const config = loadConfig();
  if (!config[guildId]) return false;
  const idx = config[guildId].targetLanguages.indexOf(lang);
  if (idx === -1) return false;
  config[guildId].targetLanguages.splice(idx, 1);
  saveConfig(config);
  return true;
}

export function enableChannel(guildId: string, channelId: string): boolean {
  const config = loadConfig();
  if (!config[guildId]) config[guildId] = { enabledChannels: [], targetLanguages: [] };
  if (!config[guildId].enabledChannels.includes(channelId)) {
    config[guildId].enabledChannels.push(channelId);
    saveConfig(config);
    return true;
  }
  return false;
}

export function disableChannel(guildId: string, channelId: string): boolean {
  const config = loadConfig();
  if (!config[guildId]) return false;
  const idx = config[guildId].enabledChannels.indexOf(channelId);
  if (idx === -1) return false;
  config[guildId].enabledChannels.splice(idx, 1);
  saveConfig(config);
  return true;
}

export function isChannelEnabled(guildId: string, channelId: string): boolean {
  const guildConfig = getGuildConfig(guildId);
  return guildConfig.enabledChannels.includes(channelId);
}

export function setRomanization(guildId: string, enabled: boolean): void {
  const config = loadConfig();
  if (!config[guildId]) config[guildId] = { enabledChannels: [], targetLanguages: [], showRomanization: false };
  config[guildId].showRomanization = enabled;
  saveConfig(config);
}

export function isRomanizationEnabled(guildId: string): boolean {
  const guildConfig = getGuildConfig(guildId);
  return guildConfig.showRomanization === true;
}
```

- [ ] **Step 4: Convert src/usageTracker.ts**

```ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const USAGE_PATH = path.join(DATA_DIR, 'usage.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface UsageData {
  totalChars: number;
  resetAt: string;
  limitReached: boolean;
}

function createDefaultUsage(): UsageData {
  return { totalChars: 0, resetAt: getNextResetDate(), limitReached: false };
}

function getNextResetDate(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

function loadUsage(): UsageData {
  ensureDataDir();
  if (!fs.existsSync(USAGE_PATH)) {
    const initial = createDefaultUsage();
    fs.writeFileSync(USAGE_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(USAGE_PATH, 'utf8'));
  } catch (err: any) {
    console.warn('[usageTracker] usage.json 損毀，重新建立：', err.message);
    const initial = createDefaultUsage();
    fs.writeFileSync(USAGE_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
}

function saveUsage(usage: UsageData): void {
  ensureDataDir();
  fs.writeFileSync(USAGE_PATH, JSON.stringify(usage, null, 2));
}

function checkAndAutoReset(): UsageData {
  const usage = loadUsage();
  const now = new Date();
  if (now >= new Date(usage.resetAt)) {
    const reset = createDefaultUsage();
    saveUsage(reset);
    return reset;
  }
  return usage;
}

export function getLimit(): number {
  return parseInt(process.env.TRANSLATE_CHAR_LIMIT || '500000', 10);
}

export function tryAddChars(count: number): { usage: UsageData; allowed: boolean } {
  const usage = checkAndAutoReset();
  if (usage.limitReached) return { usage, allowed: false };

  usage.totalChars += count;
  if (usage.totalChars >= getLimit()) {
    usage.limitReached = true;
  }
  saveUsage(usage);
  return { usage, allowed: true };
}

export function resetUsage(): UsageData {
  const reset = createDefaultUsage();
  saveUsage(reset);
  return reset;
}

export function getUsage(): UsageData {
  return checkAndAutoReset();
}

export function startResetSchedule(): void {
  setInterval(() => {
    checkAndAutoReset();
  }, 60 * 60 * 1000);
}
```

- [ ] **Step 5: Convert src/i18n.ts**

```ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getUserLanguage } from './userPrefs.js';
import { getGuildConfig } from './serverConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, 'locales');
const DEFAULT_LOCALE = 'zh-TW';

interface LocaleData {
  [key: string]: string;
}

const locales: Record<string, LocaleData> = {};
for (const file of fs.readdirSync(LOCALES_DIR)) {
  if (!file.endsWith('.json')) continue;
  const code = path.basename(file, '.json');
  locales[code] = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8'));
}

export function t(key: string, locale: string, params: Record<string, string | number> = {}): string {
  let value: string | undefined = locales[locale]?.[key];

  if (value === undefined && locales[locale]?._fallback) {
    value = locales[locales[locale]._fallback]?.[key];
  }

  if (value === undefined) {
    value = locales[DEFAULT_LOCALE]?.[key];
  }

  if (value === undefined) return key;

  return value.replace(/\{(\w+)\}/g, (_, k) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`
  );
}

export function resolveLocale(interaction: any): string {
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

export function resolveLocaleForGuild(guildId: string): string {
  const config = getGuildConfig(guildId);
  if (config.targetLanguages?.[0] && locales[config.targetLanguages[0]]) {
    return config.targetLanguages[0];
  }
  return DEFAULT_LOCALE;
}

export function getSupportedLanguages(): string[] {
  return Object.keys(locales);
}

export function getFlag(code: string): string {
  return locales[code]?._flag || '🌐';
}

export function getLangName(code: string, locale = DEFAULT_LOCALE): string {
  return t(`lang_name.${code}`, locale);
}

export function getNativeName(code: string): string {
  return t(`lang_name.${code}`, code);
}

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
```

- [ ] **Step 6: Convert src/languages.ts**

```ts
export { getSupportedLanguages, getFlag, getLangName, getNativeName, getLangCode } from './i18n.js';
```

- [ ] **Step 7: Convert src/vocabThread.ts**

Replace `require` with `import`, `__dirname` with `import.meta.url`, `module.exports` with `export`. Same pattern as other data layer files. Key imports:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EmbedBuilder, ChannelType } from 'discord.js';
import { romanize } from './romanize/index.js';
import { t } from './i18n.js';
```

All functions get type annotations. Export `findOrCreateVocabThread` and `postVocabEntry`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: convert data layer and i18n to TypeScript + ESM"
```

---

### Task 5: Convert Commands

**Files:**
- Rename: `src/commands/translate.js` → `.ts`
- Rename: `src/commands/setup.js` → `.ts`
- Rename: `src/commands/usage.js` → `.ts`
- Rename: `src/commands/lookup.js` → `.ts`
- Rename: `src/commands/myLanguage.js` → `.ts`
- Rename: `src/commands/index.js` → `.ts`

- [ ] **Step 1: Rename all 6 files**

```bash
git mv src/commands/translate.js src/commands/translate.ts
git mv src/commands/setup.js src/commands/setup.ts
git mv src/commands/usage.js src/commands/usage.ts
git mv src/commands/lookup.js src/commands/lookup.ts
git mv src/commands/myLanguage.js src/commands/myLanguage.ts
git mv src/commands/index.js src/commands/index.ts
```

- [ ] **Step 2: Convert each command file**

Pattern for each command file:
1. Replace all `require('discord.js')` with `import { ... } from 'discord.js'`
2. Replace all `require('../...')` with `import { ... } from '../....js'` (note `.js` extension)
3. Replace `module.exports = { data, execute }` with `export { data, execute }` or `export const data = ...`
4. Add type annotations to function parameters

Example for `src/commands/translate.ts` imports:
```ts
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { translate, detect } from '../translate.js';
import { tryAddChars } from '../usageTracker.js';
import { isRomanizationEnabled } from '../serverConfig.js';
import { formatWithRomanization } from '../romanize/index.js';
import { t, resolveLocale, getSupportedLanguages, getNativeName } from '../i18n.js';
```

Example for `src/commands/index.ts`:
```ts
import { Collection } from 'discord.js';
import * as translateCommand from './translate.js';
import * as setupCommand from './setup.js';
import * as usageCommand from './usage.js';
import * as lookupCommand from './lookup.js';
import * as myLanguageCommand from './myLanguage.js';

const commands = new Collection<string, any>();
commands.set(translateCommand.data.name, translateCommand);
commands.set(setupCommand.data.name, setupCommand);
commands.set(usageCommand.data.name, usageCommand);
commands.set(lookupCommand.data.name, lookupCommand);
commands.set(myLanguageCommand.data.name, myLanguageCommand);

export default commands;
```

Note: `commands/index.ts` changes from `module.exports = commands` (a Collection) to `export default commands`. All consumers of this module must update their import accordingly.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: convert commands to TypeScript + ESM"
```

---

### Task 6: Convert Interactions and Events

**Files:**
- Rename: `src/interactions/lookupButtons.js` → `.ts`
- Rename: `src/interactions/lookupSelectMenu.js` → `.ts`
- Rename: `src/interactions/lookupInline.js` → `.ts`
- Rename: `src/events/messageCreate.js` → `.ts`
- Rename: `src/events/interactionCreate.js` → `.ts`

- [ ] **Step 1: Rename all 5 files**

```bash
git mv src/interactions/lookupButtons.js src/interactions/lookupButtons.ts
git mv src/interactions/lookupSelectMenu.js src/interactions/lookupSelectMenu.ts
git mv src/interactions/lookupInline.js src/interactions/lookupInline.ts
git mv src/events/messageCreate.js src/events/messageCreate.ts
git mv src/events/interactionCreate.js src/events/interactionCreate.ts
```

- [ ] **Step 2: Convert each file**

Same pattern: `require` → `import` with `.js` extensions, `module.exports` → `export`.

Key detail for `interactionCreate.ts` — it imports `commands` which is now a default export:
```ts
import commands from '../commands/index.js';
```

For `messageCreate.ts` — the default export changes from:
```js
module.exports = async (message) => {
```
To:
```ts
import type { Message } from 'discord.js';

export default async function messageCreateHandler(message: Message): Promise<void> {
```

Same pattern for `interactionCreate.ts`:
```ts
import type { Interaction } from 'discord.js';

export default async function interactionCreateHandler(interaction: Interaction): Promise<void> {
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: convert interactions and events to TypeScript + ESM"
```

---

### Task 7: Convert Entry Points

**Files:**
- Rename: `src/bot.js` → `src/bot.ts`
- Rename: `index.js` → `index.ts`
- Rename: `deploy-commands.js` → `deploy-commands.ts`

- [ ] **Step 1: Rename all 3 files**

```bash
git mv src/bot.js src/bot.ts
git mv index.js index.ts
git mv deploy-commands.js deploy-commands.ts
```

- [ ] **Step 2: Convert src/bot.ts**

```ts
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import messageCreateHandler from './events/messageCreate.js';
import interactionCreateHandler from './events/interactionCreate.js';
import { startResetSchedule } from './usageTracker.js';

export function startBot(): void {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel],
  });

  client.once('ready', () => {
    console.log(`[Bot] 已登入為 ${client.user?.tag}`);
    startResetSchedule();
  });

  client.on('messageCreate', messageCreateHandler);
  client.on('interactionCreate', interactionCreateHandler);

  client.login(process.env.DISCORD_TOKEN);
}
```

- [ ] **Step 3: Convert index.ts**

```ts
import 'dotenv/config';
import { startBot } from './src/bot.js';

startBot();
```

Note: `dotenv/config` is a side-effect import that replaces `require('dotenv').config()`.

- [ ] **Step 4: Convert deploy-commands.ts**

```ts
import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import * as translateCommand from './src/commands/translate.js';
import * as setupCommand from './src/commands/setup.js';
import * as usageCommand from './src/commands/usage.js';
import * as lookupCommand from './src/commands/lookup.js';
import * as myLanguageCommand from './src/commands/myLanguage.js';

const commands = [
  translateCommand.data.toJSON(),
  setupCommand.data.toJSON(),
  usageCommand.data.toJSON(),
  lookupCommand.data.toJSON(),
  myLanguageCommand.data.toJSON(),
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

const clientId = process.env.DISCORD_CLIENT_ID!;
const guildId = process.env.DISCORD_GUILD_ID;

(async () => {
  try {
    const route = guildId
      ? Routes.applicationGuildCommands(clientId, guildId)
      : Routes.applicationCommands(clientId);

    if (guildId) {
      const globalCommands = await rest.get(Routes.applicationCommands(clientId)) as any[];
      if (globalCommands.length > 0) {
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        console.log(`已清除 ${globalCommands.length} 個殘留的全域命令。`);
      }
    }

    console.log(`開始部署 slash commands...（${guildId ? 'Guild，立即生效' : '全域，最多 1 小時生效'}）`);
    const data = await rest.put(route, { body: commands }) as any[];
    console.log(`成功部署 ${data.length} 個 slash commands。`);
  } catch (err) {
    console.error('部署失敗：', err);
  }
})();
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: convert entry points to TypeScript + ESM"
```

---

### Task 8: Build Verification

- [ ] **Step 1: Run TypeScript compiler**

```bash
npx tsc --noEmit
```

Expected: 0 errors. If there are errors, fix them one by one. Common issues:
- Missing `.js` extension in import paths
- CJS packages needing `import pkg from '...'` instead of `import { x } from '...'`
- Implicit `any` types that need annotation

- [ ] **Step 2: Run the bot with tsx**

```bash
npx tsx index.ts
```

Expected: `[Bot] 已登入為 <bot-tag>` appears. Test basic functionality manually (send a message in an enabled channel, use `/translate`, use context menu lookup).

- [ ] **Step 3: Test build + production run**

```bash
npm run build && npm start
```

Expected: `tsc` completes, `dist/` directory is created, `node dist/index.js` starts the bot.

- [ ] **Step 4: Test deploy-commands**

```bash
npm run deploy
```

Expected: `成功部署 5 個 slash commands。`

- [ ] **Step 5: Fix any issues found, then final commit**

```bash
git add -A
git commit -m "fix: resolve TypeScript compilation and runtime issues"
```

---

## Phase 2: Modular Restructuring

### Task 9: Define Module Types

**Files:**
- Create: `src/shared/types.ts`

- [ ] **Step 1: Create src/shared/types.ts**

```ts
import type { Client, Collection, ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';

export interface Command {
  data: { name: string; toJSON(): unknown };
  execute(interaction: any): Promise<void>;
}

export interface BotModule {
  name: string;
  commands: Collection<string, Command>;
  events: Array<{
    event: string;
    handler: (...args: any[]) => void;
  }>;
  interactions: {
    buttons?: Array<{ prefix: string; handler: (interaction: ButtonInteraction) => Promise<void> }>;
    selectMenus?: Array<{ prefix: string; handler: (interaction: StringSelectMenuInteraction) => Promise<void> }>;
  };
  setup(context: ModuleContext): void | Promise<void>;
}

export interface ModuleContext {
  client: Client;
}
```

Note: `ModuleContext` starts minimal. This is intentionally a **Phase 3 expansion point**: when the database is introduced, `db: Database` and `config: AppConfig` will be added to this interface, and `loader.ts`'s context construction will need updating. The `setup()` signature won't break — it just receives a richer context.

- [ ] **Step 2: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: define BotModule and ModuleContext interfaces"
```

---

### Task 10: Create Bot Framework

**Files:**
- Create: `src/bot/client.ts`
- Create: `src/bot/loader.ts`
- Create: `src/bot/router.ts`

- [ ] **Step 1: Create src/bot/client.ts**

```ts
import { Client, GatewayIntentBits, Partials } from 'discord.js';

export function createClient(): Client {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel],
  });
}
```

- [ ] **Step 2: Create src/bot/loader.ts**

```ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Collection } from 'discord.js';
import type { Client } from 'discord.js';
import type { BotModule, Command, ModuleContext } from '../shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULES_DIR = path.join(__dirname, '..', 'modules');

export interface LoadedModules {
  commands: Collection<string, Command>;
  buttonHandlers: Map<string, (interaction: any) => Promise<void>>;
  menuHandlers: Map<string, (interaction: any) => Promise<void>>;
}

export async function loadModules(client: Client): Promise<LoadedModules> {
  const commands = new Collection<string, Command>();
  const buttonHandlers = new Map<string, (interaction: any) => Promise<void>>();
  const menuHandlers = new Map<string, (interaction: any) => Promise<void>>();

  const context: ModuleContext = { client };

  const entries = fs.readdirSync(MODULES_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    // Support both dev (tsx → .ts) and prod (node → .js)
    const tsPath = path.join(MODULES_DIR, entry.name, 'index.ts');
    const jsPath = path.join(MODULES_DIR, entry.name, 'index.js');
    const indexPath = fs.existsSync(tsPath) ? tsPath : jsPath;
    if (!fs.existsSync(indexPath)) continue;

    const mod: BotModule = (await import(indexPath)).default;

    // Setup
    await mod.setup(context);

    // Commands
    for (const [name, cmd] of mod.commands) {
      commands.set(name, cmd);
    }

    // Events
    for (const { event, handler } of mod.events) {
      client.on(event, handler);
    }

    // Interactions
    if (mod.interactions.buttons) {
      for (const { prefix, handler } of mod.interactions.buttons) {
        buttonHandlers.set(prefix, handler);
      }
    }
    if (mod.interactions.selectMenus) {
      for (const { prefix, handler } of mod.interactions.selectMenus) {
        menuHandlers.set(prefix, handler);
      }
    }

    console.log(`[Loader] 載入模組: ${mod.name}`);
  }

  return { commands, buttonHandlers, menuHandlers };
}
```

Note on dynamic import: The loader probes for `.ts` first (dev mode with `tsx`), then falls back to `.js` (prod mode after `tsc`). This ensures the same code works in both environments.

- [ ] **Step 3: Create src/bot/router.ts**

Note: This router intentionally does NOT import from `shared/i18n.ts` — that module hasn't been moved to `shared/` yet (that happens in Task 11). Error handling uses a generic message. After Task 11, you can optionally enhance it with i18n if desired.

```ts
import type { Interaction } from 'discord.js';
import type { LoadedModules } from './loader.js';

function errorHandler(label: string) {
  return async (interaction: any, err: unknown) => {
    console.error(`[interactionCreate] ${label}失敗：`, err);
    const msg = { content: '發生錯誤，請稍後再試。', ephemeral: true };
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg);
      } else {
        await interaction.reply(msg);
      }
    } catch {
      // interaction may have expired
    }
  };
}

export function createRouter(modules: LoadedModules) {
  const { commands, buttonHandlers, menuHandlers } = modules;

  return async (interaction: Interaction) => {
    // Slash commands and Context Menu commands
    if (interaction.isChatInputCommand() || interaction.isMessageContextMenuCommand()) {
      const command = commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (err) {
        await errorHandler(`指令 ${interaction.commandName}`)(interaction, err);
      }
      return;
    }

    // Button interactions
    if (interaction.isButton()) {
      const customId = interaction.customId;
      try {
        for (const [prefix, handler] of buttonHandlers) {
          if (customId.startsWith(`${prefix}:`)) {
            await handler(interaction);
            return;
          }
        }
      } catch (err) {
        await errorHandler('按鈕處理')(interaction, err);
      }
      return;
    }

    // Select Menu interactions
    if (interaction.isStringSelectMenu()) {
      const customId = interaction.customId;
      try {
        for (const [prefix, handler] of menuHandlers) {
          if (customId.startsWith(`${prefix}:`)) {
            await handler(interaction);
            return;
          }
        }
      } catch (err) {
        await errorHandler('選單處理')(interaction, err);
      }
      return;
    }
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/bot/
git commit -m "feat: create bot framework (client, loader, router)"
```

---

### Task 11: Move Shared Modules

**Files:**
- Move: `src/i18n.ts` → `src/shared/i18n.ts`
- Move: `src/languages.ts` → `src/shared/languages.ts`

- [ ] **Step 1: Move files**

```bash
mkdir -p src/shared
git mv src/i18n.ts src/shared/i18n.ts
git mv src/languages.ts src/shared/languages.ts
```

- [ ] **Step 2: Update imports in src/shared/i18n.ts**

The i18n module imports from `userPrefs` and `serverConfig`, which will be in `modules/translate/`. This creates a cross-module dependency.

**Critical design decision:** i18n depends on `getUserLanguage` and `getGuildConfig` for `resolveLocale()`. These are translate-module-specific. Options:

1. Keep `resolveLocale` in i18n but inject the dependency functions via setup
2. Move `resolveLocale` out of i18n — make the caller responsible

**Recommended: Option 2.** The core i18n (`t()`, `getFlag()`, `getLangName()`, etc.) is truly shared. But `resolveLocale()` depends on user prefs and guild config — those belong to the translate module (or a future user/guild module). Move `resolveLocale` and `resolveLocaleForGuild` to the translate module.

Update `src/shared/i18n.ts`:
- Remove imports of `userPrefs` and `serverConfig`
- Remove `resolveLocale()` and `resolveLocaleForGuild()`
- Keep: `t`, `getSupportedLanguages`, `getFlag`, `getLangName`, `getNativeName`, `getLangCode`
- The `locales` path (`__dirname + '/locales'`) needs updating — locales stay under `src/locales/` (not `src/shared/locales/`), so use a relative path `path.join(__dirname, '..', 'locales')`

Create `src/modules/translate/resolveLocale.ts` later (Task 12) that contains the moved functions.

- [ ] **Step 3: Update src/shared/languages.ts imports**

```ts
export { getSupportedLanguages, getFlag, getLangName, getNativeName, getLangCode } from './i18n.js';
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: extract shared i18n and languages modules"
```

---

### Task 12: Create Translate Module

Move all translate-specific files into `src/modules/translate/` and create the module entry point.

**Files:**
- Move: `src/commands/translate.ts` → `src/modules/translate/commands/translate.ts`
- Move: `src/commands/setup.ts` → `src/modules/translate/commands/setup.ts`
- Move: `src/commands/usage.ts` → `src/modules/translate/commands/usage.ts`
- Move: `src/commands/lookup.ts` → `src/modules/translate/commands/lookup.ts`
- Move: `src/commands/myLanguage.ts` → `src/modules/translate/commands/myLanguage.ts`
- Move: `src/events/messageCreate.ts` → `src/modules/translate/events/messageCreate.ts`
- Move: `src/interactions/lookupButtons.ts` → `src/modules/translate/interactions/lookupButtons.ts`
- Move: `src/interactions/lookupSelectMenu.ts` → `src/modules/translate/interactions/lookupSelectMenu.ts`
- Move: `src/interactions/lookupInline.ts` → `src/modules/translate/interactions/lookupInline.ts`
- Move: `src/romanize/` → `src/modules/translate/romanize/`
- Move: `src/segment/` → `src/modules/translate/segment/`
- Move: `src/translate.ts` → `src/modules/translate/translate.ts`
- Move: `src/serverConfig.ts` → `src/modules/translate/serverConfig.ts`
- Move: `src/usageTracker.ts` → `src/modules/translate/usageTracker.ts`
- Move: `src/userPrefs.ts` → `src/modules/translate/userPrefs.ts`
- Move: `src/vocabThread.ts` → `src/modules/translate/vocabThread.ts`
- Create: `src/modules/translate/resolveLocale.ts`
- Create: `src/modules/translate/index.ts`
- Delete: `src/commands/index.ts` (replaced by module index)
- Delete: `src/events/interactionCreate.ts` (replaced by router)
- Delete: `src/bot.ts` (replaced by bot framework)

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p src/modules/translate/commands
mkdir -p src/modules/translate/events
mkdir -p src/modules/translate/interactions
```

- [ ] **Step 2: Move all files**

```bash
# Commands
git mv src/commands/translate.ts src/modules/translate/commands/translate.ts
git mv src/commands/setup.ts src/modules/translate/commands/setup.ts
git mv src/commands/usage.ts src/modules/translate/commands/usage.ts
git mv src/commands/lookup.ts src/modules/translate/commands/lookup.ts
git mv src/commands/myLanguage.ts src/modules/translate/commands/myLanguage.ts

# Events
git mv src/events/messageCreate.ts src/modules/translate/events/messageCreate.ts

# Interactions
git mv src/interactions/lookupButtons.ts src/modules/translate/interactions/lookupButtons.ts
git mv src/interactions/lookupSelectMenu.ts src/modules/translate/interactions/lookupSelectMenu.ts
git mv src/interactions/lookupInline.ts src/modules/translate/interactions/lookupInline.ts

# Strategy modules
git mv src/romanize src/modules/translate/romanize
git mv src/segment src/modules/translate/segment

# Services
git mv src/translate.ts src/modules/translate/translate.ts
git mv src/serverConfig.ts src/modules/translate/serverConfig.ts
git mv src/usageTracker.ts src/modules/translate/usageTracker.ts
git mv src/userPrefs.ts src/modules/translate/userPrefs.ts
git mv src/vocabThread.ts src/modules/translate/vocabThread.ts
```

- [ ] **Step 3: Update all internal import paths AND data directory paths**

After the move, two categories of paths need updating:

**A. Import paths** — every file's `import` statements need path review:

In `src/modules/translate/commands/translate.ts`:
```ts
// Before (from src/commands/):
import { translate, detect } from '../translate.js';
import { tryAddChars } from '../usageTracker.js';
import { t, resolveLocale, getSupportedLanguages, getNativeName } from '../i18n.js';

// After (from src/modules/translate/commands/):
import { translate, detect } from '../translate.js';        // same — still one level up
import { tryAddChars } from '../usageTracker.js';           // same
import { t, getSupportedLanguages, getNativeName } from '../../../shared/i18n.js';
import { resolveLocale } from '../resolveLocale.js';
```

**Every file needs its imports reviewed and adjusted.** The key changes:
- `../i18n` → `../../shared/i18n.js` or `../../../shared/i18n.js` (depending on depth)
- `../serverConfig` → `../serverConfig.js` (unchanged for files at same depth)
- Cross-references between commands/events/interactions need path updates

**B. DATA_DIR paths** — files that use `__dirname` to locate `data/` need depth adjustment:

The `data/` directory is at project root. After moving from `src/` to `src/modules/translate/`, the relative path changes:

| File | Before (from `src/`) | After (from `src/modules/translate/`) |
|------|---------------------|--------------------------------------|
| `serverConfig.ts` | `path.join(__dirname, '..', 'data')` | `path.join(__dirname, '..', '..', '..', 'data')` |
| `usageTracker.ts` | `path.join(__dirname, '..', 'data')` | `path.join(__dirname, '..', '..', '..', 'data')` |
| `userPrefs.ts` | `path.join(__dirname, '..', 'data')` | `path.join(__dirname, '..', '..', '..', 'data')` |
| `vocabThread.ts` | `path.join(__dirname, '..', 'data')` | `path.join(__dirname, '..', '..', '..', 'data')` |

Update the `DATA_DIR` constant in each of these 4 files.

- [ ] **Step 4: Create src/modules/translate/resolveLocale.ts**

```ts
import { getUserLanguage } from './userPrefs.js';
import { getGuildConfig } from './serverConfig.js';
import { getSupportedLanguages } from '../../shared/i18n.js';

const DEFAULT_LOCALE = 'zh-TW';

// Build a set of supported locales for quick lookup
const supportedLocales = new Set(getSupportedLanguages());

export function resolveLocale(interaction: any): string {
  const userLang = getUserLanguage(interaction.user.id);
  if (userLang && supportedLocales.has(userLang)) return userLang;

  if (interaction.guildId) {
    const config = getGuildConfig(interaction.guildId);
    if (config.targetLanguages?.[0] && supportedLocales.has(config.targetLanguages[0])) {
      return config.targetLanguages[0];
    }
  }

  return DEFAULT_LOCALE;
}

export function resolveLocaleForGuild(guildId: string): string {
  const config = getGuildConfig(guildId);
  if (config.targetLanguages?.[0] && supportedLocales.has(config.targetLanguages[0])) {
    return config.targetLanguages[0];
  }
  return DEFAULT_LOCALE;
}
```

- [ ] **Step 5: Create src/modules/translate/index.ts**

```ts
import { Collection } from 'discord.js';
import type { BotModule, Command, ModuleContext } from '../../shared/types.js';
import * as translateCommand from './commands/translate.js';
import * as setupCommand from './commands/setup.js';
import * as usageCommand from './commands/usage.js';
import * as lookupCommand from './commands/lookup.js';
import * as myLanguageCommand from './commands/myLanguage.js';
import messageCreateHandler from './events/messageCreate.js';
import { handleWordSelect, handleWordMenuSelect, handlePageNav } from './interactions/lookupButtons.js';
import { handleLangSelect } from './interactions/lookupSelectMenu.js';
import { handleInlineLookup } from './interactions/lookupInline.js';
import { startResetSchedule } from './usageTracker.js';

const commands = new Collection<string, Command>();
commands.set(translateCommand.data.name, translateCommand);
commands.set(setupCommand.data.name, setupCommand);
commands.set(usageCommand.data.name, usageCommand);
commands.set(lookupCommand.data.name, lookupCommand);
commands.set(myLanguageCommand.data.name, myLanguageCommand);

const translateModule: BotModule = {
  name: 'translate',

  commands,

  events: [
    { event: 'messageCreate', handler: messageCreateHandler },
  ],

  interactions: {
    buttons: [
      { prefix: 'wlt', handler: handleInlineLookup },
      { prefix: 'wlw', handler: handleWordSelect },
      { prefix: 'wlp', handler: handlePageNav },
    ],
    selectMenus: [
      { prefix: 'wls', handler: handleLangSelect },
      { prefix: 'wlm', handler: handleWordMenuSelect },
    ],
  },

  setup(_context: ModuleContext) {
    startResetSchedule();
  },
};

export default translateModule;
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: move translate feature into modules/translate"
```

---

### Task 13: Rewrite Entry Points

**Architecture note:** The project uses a thin-wrapper entry point pattern:
- `index.ts` (root) — loads env vars, calls `startBot()`. This is what `npm run dev` and `npm start` execute.
- `src/index.ts` — the real application entry point with bot + loader logic.

This is intentional, not transitional. Root `index.ts` stays as the process entry point; `src/index.ts` is the application entry point. `tsconfig.json` includes both.

**Files:**
- Rewrite: `src/index.ts` (new, replaces `src/bot.ts`)
- Modify: `deploy-commands.ts`
- Delete: `src/bot.ts`
- Delete: `src/commands/index.ts`
- Delete: `src/events/interactionCreate.ts`

- [ ] **Step 1: Delete replaced files**

```bash
git rm src/bot.ts
git rm src/commands/index.ts
git rm src/events/interactionCreate.ts
rmdir src/commands src/events src/interactions 2>/dev/null || true
```

- [ ] **Step 2: Create new src/index.ts**

Move the entry point from `index.ts` (root) into `src/index.ts`:

```ts
import { createClient } from './bot/client.js';
import { loadModules } from './bot/loader.js';
import { createRouter } from './bot/router.js';

export async function startBot(): Promise<void> {
  const client = createClient();

  const modules = await loadModules(client);
  const router = createRouter(modules);

  client.on('interactionCreate', router);

  client.once('ready', () => {
    console.log(`[Bot] 已登入為 ${client.user?.tag}`);
  });

  await client.login(process.env.DISCORD_TOKEN);
}
```

- [ ] **Step 3: Update root index.ts**

```ts
import 'dotenv/config';
import { startBot } from './src/index.js';

startBot();
```

- [ ] **Step 4: Update deploy-commands.ts**

Update imports to point to new module paths:

```ts
import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import * as translateCommand from './src/modules/translate/commands/translate.js';
import * as setupCommand from './src/modules/translate/commands/setup.js';
import * as usageCommand from './src/modules/translate/commands/usage.js';
import * as lookupCommand from './src/modules/translate/commands/lookup.js';
import * as myLanguageCommand from './src/modules/translate/commands/myLanguage.js';

// ... rest unchanged
```

**Known tech debt:** `deploy-commands.ts` still hardcodes individual command imports rather than scanning modules. When a new module (e.g., community) is added in the future, this file needs manual updates. This is acceptable for now — a dynamic approach can be added in Phase 3 when the second module is introduced.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: rewrite entry points to use modular bot framework"
```

---

### Task 14: Final Verification

- [ ] **Step 1: TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Run with tsx**

```bash
npx tsx index.ts
```

Expected: `[Loader] 載入模組: translate` then `[Bot] 已登入為 <tag>`.

- [ ] **Step 3: Test all features manually**

Checklist:
- Send a message in an enabled channel → auto-translate embed appears
- Click flag buttons on embed → word lookup works
- Use `/translate` → manual translate works
- Use `/translate-setup list` → shows config
- Use `/usage show` → shows usage
- Use `/my-language show` → shows preference
- Use Context Menu「查詞」→ word segmentation works

- [ ] **Step 4: Build and run production**

```bash
npm run build && npm start
```

- [ ] **Step 5: Deploy commands**

```bash
npm run deploy
```

- [ ] **Step 6: Clean up empty directories if any remain**

```bash
rmdir src/commands src/events src/interactions 2>/dev/null || true
```

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: complete modular architecture migration"
```

---

## Important Notes for Implementer

### CJS Package Imports in ESM

Several dependencies are CJS packages. When importing from ESM, you may encounter issues:

- `@google-cloud/translate` — try `import { v2 } from '@google-cloud/translate'` first. If it fails, use `import pkg from '@google-cloud/translate'; const { v2 } = pkg;`
- `@google-cloud/language` — same pattern
- `hangul-romanization` — use `import hangul from 'hangul-romanization'`
- `pinyin-pro` — has ESM exports, `import { pinyin } from 'pinyin-pro'` should work

**Always verify each import works at runtime, not just compilation.** CJS interop can pass `tsc` but fail at runtime.

### The .js Extension Rule

In ESM with `moduleResolution: "node16"`, all relative imports MUST include the `.js` extension:
```ts
import { t } from '../shared/i18n.js';  // ✓ correct
import { t } from '../shared/i18n';     // ✗ fails at runtime
import { t } from '../shared/i18n.ts';  // ✗ TypeScript error
```

### Data Path After Move

After moving files to `modules/translate/`, the `__dirname`-based paths to `data/` change:
- Before: `path.join(__dirname, '..', 'data')` (from `src/`)
- After: `path.join(__dirname, '..', '..', '..', 'data')` (from `src/modules/translate/`)

Verify these paths are correct after the move. Consider extracting a shared `DATA_DIR` constant.

### Locales Path After Move

`src/shared/i18n.ts` loads locales from `src/locales/`. After moving to `src/shared/`:
- Path becomes: `path.join(__dirname, '..', 'locales')`
- In dev mode (`tsx`): `__dirname` is `<project>/src/shared` → `../locales` = `<project>/src/locales` ✓
- In prod mode (`node dist/`): `__dirname` is `<project>/dist/src/shared` → `../locales` = `<project>/dist/src/locales`
- **The `npm run build` script includes `copy-assets` which copies `src/locales/` to `dist/src/locales/`** — this ensures the path resolves correctly in both modes.
- If the copy-assets path is wrong, the bot will crash at startup with a missing directory error. Always verify after first build.
