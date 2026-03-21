## ADDED Requirements

### Requirement: Pool management page
前端 SHALL 提供物品池管理頁面，讓 Guild 管理者建立池子、定義 schema、新增/修改/刪除物品。

#### Scenario: Create pool with schema
- **WHEN** 管理者在前端建立新物品池，定義欄位 name(text), category(text), rarity(text), range(number)
- **THEN** 系統建立池子，頁面顯示空的物品列表

#### Scenario: Add items via form
- **WHEN** 管理者在物品池頁面點擊新增，填入物品資料
- **THEN** 物品加入池子，列表即時更新

### Requirement: Strategy management page
前端 SHALL 提供策略管理頁面，讓管理者建立和編輯抽選策略。

#### Scenario: Create strategy with filter
- **WHEN** 管理者建立策略，選擇池子、設定篩選條件、選擇分配方式
- **THEN** 策略建立完成，顯示在策略列表中

#### Scenario: Edit strategy filter
- **WHEN** 管理者編輯策略的篩選條件
- **THEN** 策略更新，不影響已建立的 Session

### Requirement: Filter condition editor
前端 SHALL 提供篩選條件的視覺化編輯器。管理者可組合多個條件，不需要撰寫資料庫語法。

#### Scenario: Add multiple conditions
- **WHEN** 管理者新增條件 `category = "步槍"` 並再新增 `rarity IN ("金", "紫")`
- **THEN** 兩個條件以 AND 組合，預覽顯示篩選後的物品數量

### Requirement: Draw history viewer
前端 SHALL 提供歷史紀錄查看頁面，顯示 Session 列表和各 Session 的抽選結果。

#### Scenario: View session history
- **WHEN** 管理者點擊某個 Session
- **THEN** 顯示該 Session 的所有抽選紀錄，包含每輪的參與者和結果
