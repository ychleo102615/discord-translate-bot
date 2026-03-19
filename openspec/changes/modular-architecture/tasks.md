# 任務規劃

## Phase 1：TS + ESM 基礎建設

打地基。完成後 bot 功能完全不變，但已經跑在 TS + ESM 上。

### 1.1 專案設定
- [ ] 新增 `tsconfig.json`（strict, node16, outDir: dist）
- [ ] `package.json` 加 `"type": "module"`
- [ ] 加 dev dependencies：`typescript`, `tsx`, `@types/node`
- [ ] 加 scripts：`dev`（tsx --watch）、`build`（tsc）、`start`（node dist/index.js）
- [ ] `.gitignore` 加 `dist/`

### 1.2 全檔案 CJS → ESM + JS → TS
- [ ] 所有 `.js` 改副檔名為 `.ts`
- [ ] `require()` → `import`，`module.exports` → `export`
- [ ] `__dirname` → `import.meta.url`（i18n, serverConfig, userPrefs, usageTracker, vocabThread）
- [ ] 所有內部 import 路徑加 `.js` 副檔名
- [ ] 加上必要的型別標註（function signatures, 主要資料結構）
- [ ] `deploy-commands.js` → `deploy-commands.ts`

### 1.3 驗證
- [ ] `npm run build` 編譯通過
- [ ] `npm run dev` 啟動 bot，功能正常（手動測試翻譯、查詞、設定）

---

## Phase 2：模組化重構

將現有翻譯功能搬進模組結構，Bot 層變成純路由器。

### 2.1 建立模組框架
- [ ] 定義 `BotModule` / `ModuleContext` interface（`src/shared/types.ts`）
- [ ] 建立 `src/bot/loader.ts`：掃描 modules，呼叫 setup，收集 commands/events/interactions
- [ ] 建立 `src/bot/router.ts`：查表分派 interactionCreate
- [ ] 建立 `src/bot/client.ts`：建立 Discord Client

### 2.2 搬移翻譯模組
- [ ] 建立 `src/modules/translate/index.ts`（符合 BotModule 契約）
- [ ] 搬移 commands/ → `src/modules/translate/commands/`
- [ ] 搬移 events/ → `src/modules/translate/events/`
- [ ] 搬移 interactions/ → `src/modules/translate/interactions/`
- [ ] 搬移 romanize/, segment/ → `src/modules/translate/`
- [ ] 搬移 translate.ts, serverConfig.ts, usageTracker.ts, userPrefs.ts, vocabThread.ts → `src/modules/translate/`

### 2.3 共用層提取
- [ ] `src/shared/i18n.ts`（從 src/i18n.ts 搬入）
- [ ] `src/shared/languages.ts`

### 2.4 進入點重寫
- [ ] `src/index.ts`：啟動 Bot（+ 未來 API Server）
- [ ] 移除舊的 `src/bot.js`（邏輯已分散到 bot/ 和 modules/）

### 2.5 驗證
- [ ] 功能不變，手動測試翻譯、查詞、設定、用量

---

## Phase 3：API Server + 資料庫

為前端管理介面打基礎。

### 3.1 資料庫
- [ ] 安裝 `better-sqlite3` + `@types/better-sqlite3`
- [ ] `src/shared/db.ts`：初始化 SQLite，建立連線

### 3.2 Express API
- [ ] 安裝 `express` + `@types/express`
- [ ] `src/api/server.ts`：Express app 設定
- [ ] 在 `src/index.ts` 中同時啟動 Bot + API Server

### 3.3 Discord OAuth2
- [ ] `src/api/auth/discord.ts`：OAuth2 flow（authorize → callback → token）
- [ ] `src/api/auth/middleware.ts`：JWT 驗證 + Guild ManageGuild 權限檢查
- [ ] 安裝 `jsonwebtoken` + `@types/jsonwebtoken`

### 3.4 驗證
- [ ] API Server 啟動正常
- [ ] OAuth2 登入流程可走通
- [ ] 權限檢查正確

---

## Phase 4：Nuxt.js 前端

獨立的前端專案。

### 4.1 初始化
- [ ] 決定：monorepo（同 repo 子目錄）或獨立 repo
- [ ] `npx nuxi init` 建立 Nuxt 專案
- [ ] 設定為 SPA mode（`ssr: false`）

### 4.2 基礎頁面
- [ ] Discord OAuth2 登入頁
- [ ] Guild 選擇 / Dashboard
- [ ] API 串接層

---

## 依賴關係

```
Phase 1 ──▶ Phase 2 ──▶ Phase 3 ──▶ Phase 4
 TS+ESM      模組化       API+DB       前端

Phase 1 和 2 是架構遷移，不加新功能。
Phase 3 和 4 是新能力，為社群輔助模組做準備。
```
