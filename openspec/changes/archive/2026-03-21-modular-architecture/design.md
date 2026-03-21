# 設計文件：模組化架構

## 技術棧

| 層 | 選擇 | 備註 |
|---|---|---|
| 語言 | TypeScript（全面） | 無 JS 殘留 |
| 模組系統 | ESM | `"type": "module"` |
| Bot | discord.js | 現有 |
| API | Express.js | 與 Bot 同進程 |
| 前端 | Nuxt.js（純 SPA） | 獨立部署 |
| 資料庫 | SQLite（better-sqlite3） | 新模組用 |
| 認證 | Discord OAuth2 + JWT | Guild 管理者 |

## 目錄結構

```
src/
├── index.ts                  ← 進程入口：啟動 Bot + API Server
│
├── shared/                   ← 跨模組共用
│   ├── i18n.ts
│   ├── languages.ts
│   ├── db.ts                 ← SQLite 連線與初始化
│   └── ...
│
├── bot/                      ← Bot 核心（純路由器）
│   ├── client.ts             ← 建立 Discord Client
│   ├── loader.ts             ← 掃描 modules/*/index.ts，註冊 commands/events
│   └── router.ts             ← interactionCreate 查表分派
│
├── api/                      ← Express API Server
│   ├── server.ts             ← Express app 設定
│   ├── auth/                 ← Discord OAuth2
│   │   ├── discord.ts        ← OAuth2 callback、token 交換
│   │   └── middleware.ts     ← JWT 驗證 + Guild 權限檢查
│   └── routes/               ← API routes（按模組分）
│
└── modules/                  ← 主題模組
    ├── translate/            ← 現有翻譯功能搬入
    │   ├── index.ts          ← 模組入口（符合契約）
    │   ├── commands/
    │   ├── events/
    │   ├── interactions/
    │   ├── romanize/
    │   ├── segment/
    │   └── ...
    │
    └── community/            ← 社群輔助模組（未來）
        └── ...
```

## 模組契約

```ts
interface BotModule {
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

interface ModuleContext {
  client: Client;       // Discord Client（唯讀操作）
  db: Database;         // SQLite 連線
  config: AppConfig;    // 全局設定
}
```

## 模組載入機制

`bot/loader.ts`：

1. 掃描 `src/modules/*/index.ts`
2. 對每個模組呼叫 `setup(context)`
3. 收集 commands → 合併到全局 Collection
4. 收集 events → 註冊到 client
5. 收集 interactions → 建立路由表 `Map<prefix, handler>`

`bot/router.ts`（取代現在的 `interactionCreate.js`）：

```
收到 interaction
  ├─ isChatInputCommand / isContextMenu → commands.get(name).execute()
  ├─ isButton → 從 customId 取 prefix → buttonRouter.get(prefix)()
  └─ isSelectMenu → 從 customId 取 prefix → menuRouter.get(prefix)()
```

## 隔離邊界

```
       可以共用（src/shared/）           不能跨模組存取
 ┌────────────────────────────┐   ┌──────────────────────────┐
 │  • i18n                    │   │  • 各自的 commands        │
 │  • Discord Client（唯讀）   │   │  • 各自的 data store     │
 │  • DB 連線                 │   │  • 各自的 interactions    │
 │  • 共用 utils              │   │  • 各自的內部狀態         │
 └────────────────────────────┘   └──────────────────────────┘
```

## Discord OAuth2 認證流程

```
使用者 → 前端「用 Discord 登入」
  ├─ 重導向 Discord OAuth2（scope: identify + guilds）
  ├─ 授權後帶 code 回到 API callback
  ├─ API 用 code 換 access_token
  ├─ 取得 user 資訊 + guilds 列表
  ├─ 簽發 JWT（含 userId, guilds, permissions）
  └─ 前端後續請求帶 JWT
      → middleware 驗證 + 檢查 ManageGuild 權限
```

## TS + ESM 遷移要點

- `require()` → `import`，`module.exports` → `export`
- `__dirname` → `fileURLToPath(import.meta.url)` + `dirname()`（5 個檔案）
- 所有內部 import 路徑帶 `.js` 副檔名（TS 編譯後的路徑）
- `tsconfig.json`：`module: "node16"`, `moduleResolution: "node16"`
- `package.json`：`"type": "module"`
- 開發用 `tsx --watch`，生產先 `tsc` 再 `node dist/index.js`
