## ADDED Requirements

### Requirement: Pool belongs to a Guild
每個物品池 SHALL 歸屬於一個 Guild。不同 Guild 的物品池互相隔離，不可跨 Guild 存取或查詢。

#### Scenario: Guild isolation
- **WHEN** Guild A 的使用者查詢物品池
- **THEN** 只能看到 Guild A 的物品池，無法存取 Guild B 的資料

### Requirement: Pool has a fixed schema
每個物品池在建立時 SHALL 定義一組欄位 schema（欄位名稱與類型）。池子中所有物品 MUST 遵循此 schema。

#### Scenario: Create pool with schema
- **WHEN** 管理者建立物品池並指定 schema 為 `[{name: "name", type: "text"}, {name: "category", type: "text"}, {name: "rarity", type: "text"}, {name: "range", type: "number"}]`
- **THEN** 系統建立池子並記錄此 schema

#### Scenario: Item must match schema
- **WHEN** 新增物品時提供的欄位與 schema 不符（缺少必要欄位或類型錯誤）
- **THEN** 系統拒絕新增並回傳錯誤

### Requirement: Pool supports multiple items
一個物品池 SHALL 支援新增、修改、刪除多個物品。物品數量上限為 200。

#### Scenario: Add item to pool
- **WHEN** 管理者新增一筆符合 schema 的物品資料
- **THEN** 物品被加入池子

#### Scenario: Reject when pool is full
- **WHEN** 池子已有 200 筆物品，管理者嘗試新增
- **THEN** 系統拒絕新增並回傳錯誤

### Requirement: Multiple pools per Guild
一個 Guild SHALL 可以擁有多個物品池，每個池子有獨立的名稱和 schema。

#### Scenario: Create second pool
- **WHEN** Guild 已有「主武器庫」池子，管理者建立「副武器庫」
- **THEN** 兩個池子獨立存在，各有自己的 schema 和物品

### Requirement: Pool CRUD operations
系統 SHALL 提供物品池的建立、讀取、更新（名稱）、刪除功能。刪除池子時 MUST 同時刪除其中所有物品。

#### Scenario: Delete pool cascades items
- **WHEN** 管理者刪除一個物品池
- **THEN** 該池子的所有物品一併刪除
