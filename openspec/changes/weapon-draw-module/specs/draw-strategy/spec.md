## ADDED Requirements

### Requirement: Strategy references a pool
每個策略 SHALL 引用一個物品池作為資料來源。

#### Scenario: Create strategy with pool reference
- **WHEN** 管理者建立策略並指定 poolId
- **THEN** 策略記錄該 pool 的引用

#### Scenario: Referenced pool must exist
- **WHEN** 管理者建立策略時指定不存在的 poolId
- **THEN** 系統拒絕建立並回傳錯誤

### Requirement: Strategy has filter conditions
策略 SHALL 支援對物品池進行多欄位篩選。篩選條件可組合多個欄位，支援等於、包含（IN）、數值比較（>=, <=）等操作。

#### Scenario: Single field filter
- **WHEN** 策略篩選條件為 `category = "步槍"`
- **THEN** 抽選時只從 category 為「步槍」的物品中抽取

#### Scenario: Multi-field filter
- **WHEN** 策略篩選條件為 `category = "步槍" AND rarity IN ("金", "紫")`
- **THEN** 抽選時只從同時滿足兩個條件的物品中抽取

#### Scenario: No filter
- **WHEN** 策略未設定篩選條件
- **THEN** 抽選時使用池子中所有物品

### Requirement: Strategy has distribution method
策略 SHALL 指定分配方式。第一版 MUST 支援「隨機不重複」（每人抽到不同物品）。架構 SHALL 預留擴展空間以支援其他分配方式（隨機可重複、加權等）。

#### Scenario: Random without replacement
- **WHEN** 策略分配方式為「隨機不重複」，3 人抽選
- **THEN** 每人抽到不同的物品

#### Scenario: Insufficient candidates
- **WHEN** 篩選後候選物品數量少於參與人數
- **THEN** 系統回報錯誤，說明候選不足

### Requirement: Strategy has consumable flag
策略 SHALL 指定是否為消耗模式。消耗模式下，Session 中抽過的物品從候選中移除。

#### Scenario: Consumable mode
- **WHEN** 策略設定為消耗模式，Session 中 User A 抽到 AWP
- **THEN** 後續同一 Session 的抽選中 AWP 不再出現

#### Scenario: Non-consumable mode
- **WHEN** 策略設定為非消耗模式
- **THEN** 每次抽選都從完整的篩選結果中抽取

### Requirement: Strategy CRUD operations
系統 SHALL 提供策略的建立、讀取、更新、刪除功能。策略為 Guild 級別，持久化儲存。

#### Scenario: Update strategy filter
- **WHEN** 管理者修改策略的篩選條件
- **THEN** 系統更新策略，不影響已建立的 Session

### Requirement: Strategy belongs to a Guild
策略 SHALL 歸屬於一個 Guild，不可跨 Guild 存取。

#### Scenario: Guild isolation
- **WHEN** Guild A 的使用者查詢策略
- **THEN** 只能看到 Guild A 的策略
