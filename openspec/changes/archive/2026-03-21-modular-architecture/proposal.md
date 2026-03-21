# 模組化架構重構

## 背景

目前的 Discord 翻譯機器人是單一用途設計，所有 commands、events、interactions 直接耦合在 bot 層。要擴展為多主題平台（翻譯、社群輔助等），需要引入模組化架構，同時加入後端 API 和前端管理介面。

## 目標

1. **全面遷移至 TypeScript + ESM**：現有 ~20 個 JS/CJS 檔案全部轉換
2. **模組化 Bot 架構**：Bot 層變成純路由器，各主題成為獨立模組
3. **後端 API**：Express.js 提供 RESTful API，與 Bot 同進程
4. **前端管理介面**：Nuxt.js 純前端 SPA，獨立部署。Guild 管理者透過 Discord OAuth2 登入
5. **資料庫**：引入 SQLite（better-sqlite3）作為新模組的資料層

## 關鍵架構決策

- **同進程，保持可分離**：Bot 和 API Server 先跑在同一個 Node 進程，模組之間不互相 require、透過 DB 溝通，未來拆進程成本低
- **全面 TS + ESM**：不做漸進式，一次到位。乾淨、無 JS/TS 共存和 CJS/ESM 互通問題
- **Nuxt.js 作為純前端**：享受 Nuxt 的前端 DX，但不用它的 server routes。API 由 Express 提供
- **SQLite**：同進程下零依賴、零部署成本。翻譯模組的 JSON 暫不遷移，新模組直接用 DB

## 非目標

- 翻譯模組的功能變更（維持現狀）
- 多進程部署（保持可分離但不現在拆）
- 翻譯模組資料遷移到 DB（維持 JSON）
- 社群輔助模組的功能設計（另案處理）
