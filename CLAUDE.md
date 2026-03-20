# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                   # 開發模式（tsx --watch，支援 hot reload）
npm run build                 # 編譯 TypeScript + 複製 locale JSON 到 dist/
npm start                     # 啟動 production bot（需先 build）
npm run deploy                # 部署 slash commands 到 Discord（修改命令定義後必須執行）
npx tsc --noEmit              # 型別檢查（不產出檔案）
```

無測試框架、無 linter。專案使用 TypeScript + ESM（`import`/`export`，`"type": "module"`）。

## Architecture

Discord 翻譯機器人，使用 Google Cloud Translation API 自動翻譯頻道訊息，並提供交互式查詞與詞彙本功能。採用模組化架構，bot 層為純路由器，功能以 `BotModule` 介面隔離。

### Directory structure

```
index.ts                      ← 進程入口（載入 dotenv，呼叫 startBot）
deploy-commands.ts            ← slash commands 部署腳本
src/
├── index.ts                  ← 應用入口（createClient + loadModules + createRouter）
├── locales/                  ← 語言 JSON 檔（自動探索）
├── shared/                   ← 跨模組共用
│   ├── types.ts              ← BotModule、Command、ModuleContext 介面
│   ├── i18n.ts               ← i18n 核心（t、getFlag、getLangName 等）
│   └── languages.ts          ← i18n 的薄包裝 re-export
├── bot/                      ← bot 框架
│   ├── client.ts             ← Discord Client 工廠
│   ├── loader.ts             ← 模組掃描與載入（動態 import）
│   └── router.ts             ← interactionCreate 事件路由器
└── modules/translate/        ← 翻譯模組（BotModule 實作）
    ├── index.ts              ← 模組入口（註冊 commands、events、interactions）
    ├── resolveLocale.ts      ← locale 解析（從 shared/i18n 分離）
    ├── commands/             ← translate、setup、usage、lookup、myLanguage
    ├── events/               ← messageCreate（自動翻譯）
    ├── interactions/         ← lookupButtons、lookupSelectMenu、lookupInline
    ├── romanize/             ← 羅馬拼音策略路由器（pinyin、hangul、google）
    ├── segment/              ← 斷詞策略路由器（googleNL、space）
    ├── translate.ts          ← Google Translate v2 client 包裝
    ├── serverConfig.ts       ← Guild 級設定（data/config.json）
    ├── usageTracker.ts       ← 月度用量追蹤（data/usage.json）
    ├── userPrefs.ts          ← 使用者語言偏好（data/userPrefs.json）
    └── vocabThread.ts        ← 詞彙本 Thread 管理（data/vocabThreads.json）
```

### Entry flow

`index.ts`（root）→ `src/index.ts`（`startBot()`）→ `bot/client.ts` 建立 Client → `bot/loader.ts` 掃描 `src/modules/*/index.ts` 動態載入模組 → `bot/router.ts` 建立 interactionCreate handler → 模組的 events 直接綁定到 client。

### BotModule 契約

每個模組必須 default export 一個 `BotModule` 物件（定義於 `src/shared/types.ts`）：

```ts
interface BotModule {
  name: string;
  commands: Collection<string, Command>;
  events: Array<{ event: string; handler: (...args: any[]) => void }>;
  interactions: {
    buttons?: Array<{ prefix: string; handler: (interaction: ButtonInteraction) => Promise<void> }>;
    selectMenus?: Array<{ prefix: string; handler: (interaction: StringSelectMenuInteraction) => Promise<void> }>;
  };
  setup(context: ModuleContext): void | Promise<void>;
}
```

新增模組：在 `src/modules/` 建立資料夾，export default 一個 `BotModule`，loader 會自動掃描載入。

### Module loader 注意事項

`bot/loader.ts` 使用 `.ts`/`.js` 雙重探測：dev 模式（`tsx`）載入 `.ts`，production（`node dist/`）載入 `.js`。

### Commands

| 指令 | 類型 | 用途 |
|------|------|------|
| `/translate` | Slash | 手動翻譯文字到指定語言 |
| `/translate-setup` | Slash（6 個子指令：add/remove/list/enable/disable/romanization） | Guild 級設定管理（需 ManageGuild） |
| `/usage` | Slash（show/reset） | 查詢用量與月度重置 |
| `/my-language` | Slash（set/show） | 設定/查詢個人語言偏好 |
| `查詞` | Context Menu | 從訊息快速查詞（支援翻譯 Embed 與一般訊息） |

### Romanization — Strategy Pattern

`modules/translate/romanize/index.ts` 是路由器，根據語言代碼分派到不同策略：

| 語言 | 策略檔案 | 工具 |
|------|---------|------|
| zh, zh-TW, zh-CN | `strategies/pinyin.ts` | `pinyin-pro`（本地，同步） |
| ko | `strategies/hangul.ts` | `hangul-romanization`（本地，同步） |
| ja, ru, ar 等 14 種 | `strategies/google.ts` | Google romanizeText v3 API（非同步） |

### Segmentation — Strategy Pattern

`modules/translate/segment/index.ts` 是斷詞路由器，附帶 15 分鐘 TTL 的記憶體快取（每 5 分鐘自動清理）：

| 語言 | 策略檔案 | 工具 |
|------|---------|------|
| zh, zh-TW, zh-CN, ja, th | `strategies/googleNL.ts` | Google Natural Language API `analyzeSyntax` |
| 其他（en, ko, fr 等） | `strategies/space.ts` | 正則空格分隔 |

### Data storage

本地 JSON 檔案存儲，程式會自動建立 `data/` 目錄和檔案。全部在 `.gitignore` 中：

| 檔案 | 用途 |
|------|------|
| `data/config.json` | Guild 級設定（enabledChannels, targetLanguages, showRomanization） |
| `data/usage.json` | 全局月度用量（totalChars, resetAt, limitReached） |
| `data/userPrefs.json` | 使用者偏好（userId → { language }） |
| `data/vocabThreads.json` | 詞彙本 Thread ID 快取（`{channelId}:{userId}` → threadId） |

### ESM + TypeScript 慣例

- 所有相對 import 必須加 `.js` 擴展名（`import { t } from '../shared/i18n.js'`）
- CJS 套件使用 default import（`import pkg from '@google-cloud/translate'`）
- `__dirname` 替代：`path.dirname(fileURLToPath(import.meta.url))`
- `t()` 的 params 型別為 `Record<string, string | number>`
- `locales/*.json` 不會被 `tsc` 複製，由 `npm run build` 的 `copy-assets` 腳本處理

## Environment

必要環境變數見 `.env.example`。認證使用 Service Account JSON key（`credentials.json`，已在 `.gitignore`）。
