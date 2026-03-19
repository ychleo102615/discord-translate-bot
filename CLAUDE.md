# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
node index.js                  # 啟動 bot
node deploy-commands.js        # 部署 slash commands 到 Discord（修改命令定義後必須執行）
```

無測試框架、無 build step、無 linter。專案使用 CommonJS（`require`/`module.exports`）。

## Architecture

Discord 翻譯機器人，使用 Google Cloud Translation API 自動翻譯頻道訊息，並提供交互式查詞與詞彙本功能。

### Entry flow

`index.js` → `src/bot.js`（建立 Discord client、綁定事件）→ 事件觸發時委託到 `src/events/` 和 `src/commands/`。

### Key modules

- **`src/i18n.js`** — i18n 核心。啟動時自動掃描 `src/locales/*.json` 載入所有 locale。提供 `t(key, locale, params)`、`resolveLocale(interaction)`、`resolveLocaleForGuild(guildId)`、`getSupportedLanguages()`、`getFlag()`、`getLangName()`、`getNativeName()`、`getLangCode()`。Fallback 鏈：locale → _fallback → zh-TW → raw key
- **`src/locales/*.json`** — 語言定義的唯一來源。檔案名稱 = 語言代碼，自動探索。新增語言只需新增一個 JSON 檔案，不改任何程式碼。`zh-CN.json` 和 `zh.json` 為薄殼，透過 `_fallback` 共用 `zh-TW` 的翻譯
- **`src/languages.js`** — `i18n.js` 的薄包裝，re-export 語言相關函式
- **`src/translate.js`** — Google Translate v2 client 包裝（翻譯 + 語言偵測），使用 Service Account 認證（`GOOGLE_APPLICATION_CREDENTIALS`）
- **`src/serverConfig.js`** — 伺服器級設定的讀寫層，存儲在 `data/config.json`。每個 guild 有獨立的 enabledChannels、targetLanguages、showRomanization 設定
- **`src/usageTracker.js`** — 全局月度字元用量追蹤，存儲在 `data/usage.json`。`tryAddChars()` 合併檢查+更新為單一操作避免 race condition。預設上限 500,000 字元（可由 `TRANSLATE_CHAR_LIMIT` 環境變數配置）
- **`src/userPrefs.js`** — 使用者個人語言偏好，存儲在 `data/userPrefs.json`。提供 `getUserLanguage(userId)` / `setUserLanguage(userId, language)`
- **`src/vocabThread.js`** — 詞彙本 Thread 管理。Private Thread 優先策略（無權限時回退到公開 Thread）。`pendingCreations` Map 防止同一 key 同時建立多個 Thread 的 race condition。提供外部辭典連結（Jisho、MDBG、Naver、Merriam-Webster、Wiktionary）
- **`src/commands/index.js`** — 以 Discord.js Collection 註冊所有 slash commands，`interactionCreate` 事件透過 `commandName` 查表執行

### Commands

| 指令 | 類型 | 用途 |
|------|------|------|
| `/translate` | Slash | 手動翻譯文字到指定語言 |
| `/translate-setup` | Slash（6 個子指令：add/remove/list/enable/disable/romanization） | Guild 級設定管理（需 ManageGuild） |
| `/usage` | Slash（show/reset） | 查詢用量與月度重置 |
| `/my-language` | Slash（set/show） | 設定/查詢個人語言偏好 |
| `查詞` | Context Menu | 從訊息快速查詞（支援翻譯 Embed 與一般訊息） |

### Events

- **`src/events/messageCreate.js`** — 自動翻譯核心。偵測來源語言 → 過濾相同語言目標 → 原子用量檢查 → 並行翻譯所有目標語言 → 構造 Embed（含查詞按鈕列）
- **`src/events/interactionCreate.js`** — 互動事件路由器。分派 slash commands、context menu、以及 `wlt:`/`wlw:`/`wlp:`/`wls:`/`wlm:` 前綴的按鈕與選單互動

### Interactions（查詞子系統）

- **`src/interactions/lookupButtons.js`** — 查詞處理核心。共用 `processWordLookup()` 處理翻譯、詞彙本發佈、外部連結。支援按鈕模式（≤25 詞）和分頁 SelectMenu 模式（>25 詞）
- **`src/interactions/lookupSelectMenu.js`** — Embed 翻譯版本選擇。使用者從 Select Menu 選擇原文或翻譯版本後進行斷詞
- **`src/interactions/lookupInline.js`** — Embed 內嵌直接查詞。點擊自動翻譯訊息下方的旗幟按鈕觸發

### Romanization — Strategy Pattern

`src/romanize/index.js` 是路由器，根據語言代碼分派到不同策略：

| 語言 | 策略檔案 | 工具 |
|------|---------|------|
| zh, zh-TW, zh-CN | `strategies/pinyin.js` | `pinyin-pro`（本地，同步） |
| ko | `strategies/hangul.js` | `hangul-romanization`（本地，同步） |
| ja, ru, ar 等 14 種 | `strategies/google.js` | Google romanizeText v3 API（非同步） |

對外統一介面：`needsRomanization(langCode)`、`formatWithRomanization(text, langCode, maxLen)`。新增語言支援只需加 strategy 檔案並在 `index.js` 的 `resolveStrategy()` 加入路由。

### Segmentation — Strategy Pattern

`src/segment/index.js` 是斷詞路由器，附帶 15 分鐘 TTL 的記憶體快取（每 5 分鐘自動清理）：

| 語言 | 策略檔案 | 工具 |
|------|---------|------|
| zh, zh-TW, zh-CN, ja, th | `strategies/googleNL.js` | Google Natural Language API `analyzeSyntax`（回傳 word/lemma/pos） |
| 其他（en, ko, fr 等） | `strategies/space.js` | 正則空格分隔 |

快取結構：`{ tokens, selected (Set), results (Array), createdAt }`，以 `${messageId}:${langCode}` 為 key。

### Data storage

本地 JSON 檔案存儲，程式會自動建立 `data/` 目錄和檔案。全部在 `.gitignore` 中：

| 檔案 | 用途 |
|------|------|
| `data/config.json` | Guild 級設定（enabledChannels, targetLanguages, showRomanization） |
| `data/usage.json` | 全局月度用量（totalChars, resetAt, limitReached） |
| `data/userPrefs.json` | 使用者偏好（userId → { language }） |
| `data/vocabThreads.json` | 詞彙本 Thread ID 快取（`{channelId}:{userId}` → threadId） |

## Environment

必要環境變數見 `.env.example`。認證使用 Service Account JSON key（`credentials.json`，已在 `.gitignore`）。
