# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
node index.js                  # 啟動 bot
node deploy-commands.js        # 部署 slash commands 到 Discord（修改命令定義後必須執行）
```

無測試框架、無 build step、無 linter。專案使用 CommonJS（`require`/`module.exports`）。

## Architecture

Discord 翻譯機器人，使用 Google Cloud Translation API 自動翻譯頻道訊息。

### Entry flow

`index.js` → `src/bot.js`（建立 Discord client、綁定事件）→ 事件觸發時委託到 `src/events/` 和 `src/commands/`。

### Key modules

- **`src/translate.js`** — Google Translate v2 client 包裝（翻譯 + 語言偵測），使用 Service Account 認證（`GOOGLE_APPLICATION_CREDENTIALS`）
- **`src/serverConfig.js`** — 伺服器級設定的讀寫層，存儲在 `data/config.json`。每個 guild 有獨立的 enabledChannels、targetLanguages、showRomanization 設定
- **`src/usageTracker.js`** — 全局月度字元用量追蹤，存儲在 `data/usage.json`。`tryAddChars()` 合併檢查+更新為單一操作避免 race condition
- **`src/commands/index.js`** — 以 Discord.js Collection 註冊所有 slash commands，`interactionCreate` 事件透過 `commandName` 查表執行

### Romanization — Strategy Pattern

`src/romanize/index.js` 是路由器，根據語言代碼分派到不同策略：

| 語言 | 策略檔案 | 工具 |
|------|---------|------|
| zh, zh-TW, zh-CN | `strategies/pinyin.js` | `pinyin-pro`（本地，同步） |
| ko | `strategies/hangul.js` | `hangul-romanization`（本地，同步） |
| ja, ru, ar 等 | `strategies/google.js` | Google romanizeText v3 API（非同步） |

對外統一介面：`needsRomanization(langCode)`、`formatWithRomanization(text, langCode, maxLen)`。新增語言支援只需加 strategy 檔案並在 `index.js` 的 `resolveStrategy()` 加入路由。

### Data storage

`data/config.json` 和 `data/usage.json` 為本地 JSON 檔案存儲，程式會自動建立 `data/` 目錄和檔案。兩者都在 `.gitignore` 中。

## Environment

必要環境變數見 `.env.example`。認證使用 Service Account JSON key（`credentials.json`，已在 `.gitignore`）。
