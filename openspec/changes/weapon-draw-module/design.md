## Context

Bot 已完成模組化架構，包含 BotModule 契約、Express API、Discord OAuth2、Nuxt 4 Dashboard。現在要開發第一個社群模組：武器抽選。此模組跨越 Bot 指令、API 端點、前端頁面三個層面。

現有基礎設施：
- `BotModule` 介面 + loader 自動掃描 `src/modules/*/index.ts`
- SQLite（`better-sqlite3`）透過 `ModuleContext.db` 傳入
- Express API 路由在 `src/api/routes/`
- Nuxt 4 Dashboard 在 `dashboard/app/`
- JWT + ManageGuild 權限檢查已就緒

## Goals / Non-Goals

**Goals:**
- 建立 `src/modules/draw/` BotModule，遵循現有契約
- 物品池：Guild 級、自訂固定 schema、最多 200 items
- 策略：多欄位篩選 + 分配方式 + 消耗旗標，持久化
- Session：從策略建立、複製候選、跨指令持續、歷史紀錄
- API：物品池 / 策略 / 歷史 CRUD
- 前端：物品池管理、策略編輯（含視覺化篩選器）、歷史查看
- 抽選策略架構可擴展（Strategy Pattern）

**Non-Goals:**
- 多槽位抽選（每槽位不同篩選）— 架構預留但不實作
- 跨武器數值約束（組合搜索，如 SUM(range)=5）— 架構預留但不實作
- 加權分配、保底機制 — 架構預留但不實作
- 物品池跨 Guild 共享

## Decisions

### 1. 資料庫 Schema 設計

物品的自訂欄位使用 **JSON 欄位**儲存，而非動態建表。

```sql
-- 物品池
CREATE TABLE draw_pools (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  schema TEXT NOT NULL,  -- JSON: [{name, type}]
  created_at INTEGER NOT NULL
);

-- 物品（欄位值存在 JSON 中）
CREATE TABLE draw_pool_items (
  id TEXT PRIMARY KEY,
  pool_id TEXT NOT NULL REFERENCES draw_pools(id) ON DELETE CASCADE,
  data TEXT NOT NULL,  -- JSON: {name: "AK-47", category: "步槍", ...}
  created_at INTEGER NOT NULL
);

-- 策略
CREATE TABLE draw_strategies (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  pool_id TEXT NOT NULL REFERENCES draw_pools(id),
  filter TEXT NOT NULL,       -- JSON: 篩選條件
  distribution TEXT NOT NULL, -- 分配方式識別碼
  consumable INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

-- Session
CREATE TABLE draw_sessions (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  strategy_id TEXT NOT NULL REFERENCES draw_strategies(id),
  status TEXT NOT NULL DEFAULT 'active',  -- active | closed
  created_at INTEGER NOT NULL
);

-- Session 候選物品（從池子複製）
CREATE TABLE draw_session_items (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES draw_sessions(id) ON DELETE CASCADE,
  pool_item_id TEXT NOT NULL,
  data TEXT NOT NULL,    -- JSON: 複製的物品資料
  consumed INTEGER NOT NULL DEFAULT 0,
  consumed_at INTEGER
);

-- 抽選歷史
CREATE TABLE draw_history (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES draw_sessions(id),
  user_id TEXT NOT NULL,
  session_item_id TEXT NOT NULL,
  round INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
```

**理由：** 物品欄位由使用者自訂，動態建表複雜且不安全。JSON 欄位配合應用層篩選（物品不超過 200）效能足夠。SQLite JSON 函數可在未來用於進階查詢。

**替代方案：** EAV（Entity-Attribute-Value）模式 — 更正規但查詢複雜度高，對此規模不值得。

### 2. 篩選條件的資料結構

篩選條件以 JSON 陣列儲存，每個條件是一個物件：

```typescript
interface FilterCondition {
  field: string;          // 欄位名稱
  operator: 'eq' | 'neq' | 'in' | 'gte' | 'lte' | 'gt' | 'lt';
  value: string | number | string[];
}

// 策略的 filter 欄位：FilterCondition[]
// 條件之間以 AND 組合
```

**理由：** 結構化 JSON 比原始 SQL 安全（無注入風險），前端可直接操作，且容易序列化/反序列化。應用層做篩選（遍歷候選、逐條件檢查），200 筆以內效能無虞。

**擴展路徑：** 未來若需要 OR、巢狀條件，可擴展為樹狀結構 `{ and: [condition, { or: [...] }] }`。

### 3. 分配方式的擴展架構（Strategy Pattern）

```typescript
// 分配策略介面
interface DistributionStrategy {
  name: string;
  distribute(candidates: PoolItem[], count: number): PoolItem[];
}

// 第一版只實作 RandomUnique
// 未來可加入 RandomWithReplacement, Weighted 等
```

分配方式以字串識別碼（`"random-unique"`）儲存在策略中，執行時由路由器解析為對應的 `DistributionStrategy` 實作。此設計與現有 `romanize/` 和 `segment/` 的 Strategy Pattern 一致。

### 4. 目錄結構

```
src/modules/draw/
├── index.ts              ← BotModule 入口
├── commands/
│   └── draw.ts           ← /draw 指令（含 start, next, close, history 子指令）
├── data/
│   ├── pools.ts          ← 物品池資料存取
│   ├── strategies.ts     ← 策略資料存取
│   ├── sessions.ts       ← Session 資料存取
│   └── migration.ts      ← draw 模組的 DB migration
├── distribution/
│   ├── index.ts          ← 策略路由器
│   └── strategies/
│       └── randomUnique.ts
└── filter.ts             ← 篩選引擎（應用 FilterCondition[] 到物品列表）

src/api/routes/
└── draw.ts               ← draw API 路由

dashboard/app/pages/guilds/[guildId]/
├── draw/
│   ├── index.vue         ← 物品池列表
│   ├── pools/
│   │   └── [poolId].vue  ← 物品池管理（物品 CRUD）
│   ├── strategies/
│   │   ├── index.vue     ← 策略列表
│   │   └── [strategyId].vue  ← 策略編輯
│   └── history.vue       ← 抽選歷史
```

### 5. Migration 策略

draw 模組在 `setup()` 時執行自己的 migration，不修改 `shared/db.ts` 的全局 migration。每個模組管理自己的資料表。

**理由：** 模組隔離原則 — 新增模組不應修改共用基礎設施。

### 6. 前端篩選編輯器

使用 UI 元件組合而非資料庫語法。每個條件是一列：`[欄位下拉] [操作符下拉] [值輸入]`，可新增/刪除列。條件之間固定為 AND。

**理由：** 使用者不需學習查詢語法，前端直接產出 `FilterCondition[]` JSON。

## Risks / Trade-offs

- **[JSON 欄位篩選效能]** → 應用層遍歷篩選，200 筆以內無效能問題。若未來池子變大，可改用 SQLite JSON 函數做 DB 層篩選。
- **[模組級 migration]** → 每個模組管理自己的表，需避免表名衝突。統一加 `draw_` 前綴。
- **[篩選條件僅支援 AND]** → 第一版足夠，未來擴展為樹狀結構需同時更新前端編輯器。
- **[Session 長期存活]** → Session 可跨指令持續，需考慮清理機制。可加定時任務關閉超過 N 天的 Session。

## Open Questions

- Session 自動過期時間？（建議 7 天未操作自動關閉，但可暫不實作）
- 物品池 schema 支援的欄位類型？（第一版建議 `text` 和 `number` 兩種）
- 前端篩選編輯器是否需要即時預覽篩選結果數量？（建議有，但可列為 nice-to-have）
