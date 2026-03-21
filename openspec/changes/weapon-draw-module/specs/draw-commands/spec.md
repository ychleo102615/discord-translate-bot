## ADDED Requirements

### Requirement: /draw start command
系統 SHALL 提供 `/draw start` slash command。參數包含 strategy（策略名稱）和被指定的使用者（mention）。執行後建立 Session 並立刻抽選一輪。

#### Scenario: Start draw with 3 users
- **WHEN** 管理者執行 `/draw start strategy:"射擊槍隨機" @user1 @user2 @user3`
- **THEN** 系統建立 Session，為每位使用者抽選一個物品，以 Embed 或訊息顯示結果

#### Scenario: Strategy not found
- **WHEN** 管理者指定不存在的策略名稱
- **THEN** 系統回報錯誤，提示策略不存在

### Requirement: /draw next command
系統 SHALL 提供 `/draw next` slash command。在既有 Session 中繼續抽選，指定 Session 和參與者。

#### Scenario: Continue session
- **WHEN** 管理者執行 `/draw next session:<id> @user4 @user5`
- **THEN** 在該 Session 中為指定使用者抽選，顯示結果

#### Scenario: Session is closed
- **WHEN** 管理者對已關閉的 Session 執行 `/draw next`
- **THEN** 系統回報錯誤，提示 Session 已關閉

### Requirement: /draw close command
系統 SHALL 提供 `/draw close` slash command，關閉一個 active Session。

#### Scenario: Close session
- **WHEN** 管理者執行 `/draw close session:<id>`
- **THEN** Session 狀態變為 closed，後續無法再抽選

### Requirement: /draw history command
系統 SHALL 提供 `/draw history` slash command，查看指定 Session 的抽選紀錄。

#### Scenario: View history
- **WHEN** 使用者執行 `/draw history session:<id>`
- **THEN** 系統顯示該 Session 的所有抽選紀錄（使用者、物品、時間）

### Requirement: Draw result notification
抽選結果 SHALL 以 Discord 訊息形式通知，包含每位參與者抽到的物品名稱及相關屬性。

#### Scenario: Result message
- **WHEN** 抽選完成
- **THEN** 機器人發送訊息，列出每位參與者及其抽到的物品
