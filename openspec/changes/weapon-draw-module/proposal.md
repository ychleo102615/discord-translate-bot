## Why

Bot 已完成模組化架構（Phase 1-4），現在要開發第一個社群輔助模組。社群中有遊戲武器抽選的需求：管理者定義物品池和抽選策略，透過 Discord 指令執行抽選，每位參與者獲得一個結果。需要前端管理物品池與策略，Discord 指令負責執行抽選。

## What Changes

- 新增 `src/modules/draw/` BotModule，提供武器抽選功能
- 新增物品池（Pool）管理：Guild 級別，每個池子有固定 schema，前端 CRUD
- 新增抽選策略（Strategy）管理：引用池子 + 多欄位篩選條件 + 分配方式，前端 CRUD
- 新增抽選 Session：從策略建立，支援消耗模式（抽過的 item 移除）和非消耗模式
- 新增 Discord slash commands：`/draw start`、`/draw next`、`/draw close`、`/draw history`
- 新增後端 API 端點：物品池 CRUD、策略 CRUD、歷史紀錄查詢
- 新增前端 Dashboard 頁面：物品池管理、策略編輯、歷史紀錄
- 資料儲存使用 SQLite（與現有 `shared/db.ts` 共用連線）

## Capabilities

### New Capabilities

- `draw-pool`: 物品池管理 — Guild 級物品池的建立、物品 CRUD、自訂欄位 schema
- `draw-strategy`: 抽選策略 — 篩選條件組合、分配方式（隨機/不重複等）、持久化管理
- `draw-session`: 抽選 Session — 建立、執行、跨指令持續、關閉、歷史紀錄
- `draw-commands`: Discord 指令介面 — `/draw start`、`/draw next`、`/draw close`、`/draw history`
- `draw-api`: 後端 REST API — 物品池、策略、歷史紀錄的端點
- `draw-dashboard`: 前端管理頁面 — 物品池與策略的視覺化編輯

### Modified Capabilities

（無既有 spec 需要修改）

## Impact

- **新模組**：`src/modules/draw/` — 遵循 BotModule 契約，loader 自動掃描載入
- **資料庫**：新增 pools、pool_items、strategies、sessions、session_items、draw_history 等資料表
- **API**：`src/api/routes/` 新增 draw 相關路由
- **前端**：`dashboard/app/pages/guilds/[guildId]/` 新增物品池和策略管理頁面
- **Deploy**：需執行 `npm run deploy` 註冊新的 slash commands
