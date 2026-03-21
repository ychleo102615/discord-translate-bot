## ADDED Requirements

### Requirement: Session is created from a strategy
Session SHALL 從一個策略建立。建立時 MUST 根據策略的篩選條件從物品池複製候選物品。

#### Scenario: Create session
- **WHEN** 使用者以策略「射擊槍隨機」建立 Session
- **THEN** 系統建立 Session，複製該策略篩選後的物品作為候選集合

### Requirement: Session has lifecycle
Session SHALL 有 `active` 和 `closed` 兩種狀態。只有 `active` 的 Session 可以執行抽選。

#### Scenario: Draw in active session
- **WHEN** Session 狀態為 active，使用者執行抽選
- **THEN** 抽選正常執行

#### Scenario: Draw in closed session
- **WHEN** Session 狀態為 closed，使用者嘗試抽選
- **THEN** 系統拒絕並回報 Session 已關閉

### Requirement: Session supports consumable mode
當策略為消耗模式時，Session 中被抽走的物品 SHALL 從候選集合中移除。

#### Scenario: Item consumed after draw
- **WHEN** 消耗模式 Session 中 User A 抽到物品 X
- **THEN** 物品 X 從 Session 的候選集合中移除，後續抽選不會再出現

### Requirement: Session records draw history
每次抽選結果 SHALL 記錄參與者、抽到的物品、時間戳。

#### Scenario: History recorded
- **WHEN** User A 在 Session 中抽到 AK-47
- **THEN** 歷史紀錄包含 userId、itemId、timestamp

### Requirement: Session can span multiple draw rounds
Session SHALL 支援跨多次指令執行抽選。每次 `/draw next` 在同一 Session 中繼續。

#### Scenario: Multiple rounds
- **WHEN** 第一輪 3 人抽選完成後，使用者對同一 Session 執行第二輪
- **THEN** 第二輪在同一 Session 中進行，消耗模式下已抽走的物品不會出現

### Requirement: Multiple concurrent sessions
一個 Guild SHALL 允許同時存在多個 active Session。

#### Scenario: Two active sessions
- **WHEN** Guild 中已有 Session A（active），使用者建立 Session B
- **THEN** 兩個 Session 獨立運作，互不影響

### Requirement: Session belongs to a Guild
Session SHALL 歸屬於一個 Guild，不可跨 Guild 存取。

#### Scenario: Guild isolation
- **WHEN** Guild A 的使用者查詢 Session
- **THEN** 只能看到 Guild A 的 Session
