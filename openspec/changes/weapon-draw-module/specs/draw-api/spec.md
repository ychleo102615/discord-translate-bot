## ADDED Requirements

### Requirement: Pool CRUD API
系統 SHALL 提供 REST API 管理物品池。所有端點 MUST 驗證 JWT 並檢查 ManageGuild 權限。

#### Scenario: Create pool
- **WHEN** 管理者 POST `/api/guilds/:guildId/draw/pools` 帶有 name 和 schema
- **THEN** 系統建立物品池並回傳 pool 資料

#### Scenario: List pools
- **WHEN** 管理者 GET `/api/guilds/:guildId/draw/pools`
- **THEN** 系統回傳該 Guild 的所有物品池

#### Scenario: Unauthorized access
- **WHEN** 無 ManageGuild 權限的使用者呼叫 API
- **THEN** 系統回傳 403

### Requirement: Pool items CRUD API
系統 SHALL 提供 REST API 管理物品池中的物品。

#### Scenario: Add item
- **WHEN** 管理者 POST `/api/guilds/:guildId/draw/pools/:poolId/items` 帶有符合 schema 的物品資料
- **THEN** 系統新增物品並回傳資料

#### Scenario: List items
- **WHEN** 管理者 GET `/api/guilds/:guildId/draw/pools/:poolId/items`
- **THEN** 系統回傳該池子的所有物品

#### Scenario: Delete item
- **WHEN** 管理者 DELETE `/api/guilds/:guildId/draw/pools/:poolId/items/:itemId`
- **THEN** 系統刪除該物品

### Requirement: Strategy CRUD API
系統 SHALL 提供 REST API 管理抽選策略。

#### Scenario: Create strategy
- **WHEN** 管理者 POST `/api/guilds/:guildId/draw/strategies` 帶有 name、poolId、filter、distribution、consumable
- **THEN** 系統建立策略並回傳資料

#### Scenario: List strategies
- **WHEN** 管理者 GET `/api/guilds/:guildId/draw/strategies`
- **THEN** 系統回傳該 Guild 的所有策略

#### Scenario: Update strategy
- **WHEN** 管理者 PUT `/api/guilds/:guildId/draw/strategies/:strategyId`
- **THEN** 系統更新策略

### Requirement: Draw history API
系統 SHALL 提供 REST API 查詢抽選歷史紀錄。

#### Scenario: Get session history
- **WHEN** 管理者 GET `/api/guilds/:guildId/draw/sessions/:sessionId/history`
- **THEN** 系統回傳該 Session 的所有抽選紀錄
