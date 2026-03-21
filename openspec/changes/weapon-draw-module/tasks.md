# 任務規劃：武器抽選模組

## Phase 1：資料層 + Migration

- [x] 1.1 建立 `src/modules/draw/data/migration.ts` — draw 模組 DB migration（建立 draw_pools、draw_pool_items、draw_strategies、draw_sessions、draw_session_items、draw_history 表）
- [x] 1.2 建立 `src/modules/draw/data/pools.ts` — 物品池 CRUD（createPool, getPool, listPools, updatePool, deletePool, addItem, getItems, updateItem, deleteItem）
- [x] 1.3 建立 `src/modules/draw/data/strategies.ts` — 策略 CRUD（createStrategy, getStrategy, listStrategies, updateStrategy, deleteStrategy）
- [x] 1.4 建立 `src/modules/draw/data/sessions.ts` — Session 管理（createSession, getSession, closeSession, getSessionItems, consumeItem, addHistory, getHistory）
- [x] 1.5 撰寫資料層測試（pools, strategies, sessions 的 CRUD 測試）

## Phase 2：篩選引擎 + 分配策略

- [ ] 2.1 建立 `src/modules/draw/filter.ts` — 篩選引擎（applyFilters: 接收 FilterCondition[] 和物品列表，回傳篩選結果）
- [ ] 2.2 建立 `src/modules/draw/distribution/strategies/randomUnique.ts` — 隨機不重複分配
- [ ] 2.3 建立 `src/modules/draw/distribution/index.ts` — 分配策略路由器
- [ ] 2.4 撰寫篩選引擎和分配策略測試

## Phase 3：BotModule + Discord 指令

- [ ] 3.1 建立 `src/modules/draw/index.ts` — BotModule 入口（setup 執行 migration，註冊 commands/events/interactions）
- [ ] 3.2 建立 `src/modules/draw/commands/draw.ts` — `/draw` 指令（含 start, next, close, history 子指令）
- [ ] 3.3 更新 `deploy-commands.ts` — 確認 loader 能掃描到新模組的指令
- [ ] 3.4 手動測試 Discord 指令（deploy → 執行 /draw start, next, close, history）

## Phase 4：REST API

- [ ] 4.1 建立 `src/api/routes/draw.ts` — 物品池 CRUD 端點（POST/GET/PUT/DELETE /api/guilds/:guildId/draw/pools）
- [ ] 4.2 新增物品 CRUD 端點（POST/GET/DELETE /api/guilds/:guildId/draw/pools/:poolId/items）
- [ ] 4.3 新增策略 CRUD 端點（POST/GET/PUT/DELETE /api/guilds/:guildId/draw/strategies）
- [ ] 4.4 新增 Session/歷史查詢端點（GET /api/guilds/:guildId/draw/sessions, GET .../history）
- [ ] 4.5 在 `src/api/server.ts` 註冊 draw 路由
- [ ] 4.6 撰寫 API 路由測試

## Phase 5：前端 Dashboard

- [ ] 5.1 建立 `dashboard/app/pages/guilds/[guildId]/draw/index.vue` — 物品池列表頁
- [ ] 5.2 建立 `dashboard/app/pages/guilds/[guildId]/draw/pools/[poolId].vue` — 物品池管理頁（schema 顯示、物品 CRUD 表格）
- [ ] 5.3 建立 `dashboard/app/pages/guilds/[guildId]/draw/strategies/index.vue` — 策略列表頁
- [ ] 5.4 建立 `dashboard/app/pages/guilds/[guildId]/draw/strategies/[strategyId].vue` — 策略編輯頁（篩選條件編輯器、分配方式選擇）
- [ ] 5.5 建立 `dashboard/app/pages/guilds/[guildId]/draw/history.vue` — 歷史紀錄頁
- [ ] 5.6 更新 `dashboard/app/pages/guilds/[guildId].vue` — Dashboard 頁面加入 draw 模組入口連結

## Phase 6：收尾

- [ ] 6.1 型別檢查（`npx tsc --noEmit` + `npx nuxt typecheck`）
- [ ] 6.2 全部測試通過（`npx vitest run`）
- [ ] 6.3 手動整合測試（前端操作 → API → Discord 指令完整流程）
