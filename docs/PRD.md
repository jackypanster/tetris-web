# PRD.md（產品需求說明）— Tetris Web 版

## 1. 產品願景
- 讓玩家在桌面瀏覽器於 1 秒內載入、即刻 60 FPS 遊玩經典俄羅斯方塊，無需登入即可離線練習，再於恢復網路時自動同步高分。
- 將 Tetris 的節奏、可靠控制與競技透明度作為核心體驗支柱，確保從休閒到高手都能透過可觀測數據調整設定。
- 所有規格、契約與流程以 `docs/` 為唯一事實源（SSOT），支援 plan → skeleton → tests → impl → gate → docs → accept 的自動化迴圈。

## 2. 目標使用者與情境
- **休閒玩家（Play & Pause）**：午休、通勤等零碎時間希望快速進入與中斷；需要友善的預覽與教學。
- **競技玩家（Optimize & Compare）**：追求 DAS/ARR、鎖定延遲的可調節與統計；需要可靠的計分與排行榜公平性。
- **開發者 / 社群貢獻者（Extend & Audit）**：依賴版本化文檔、契約與自動化流程才能安全擴充功能、撰寫模組化測試。

## 3. 體驗支柱與主要流程
1. **即時反饋**：輸入 → 動畫呈現 ≤ 16ms，HUD 與 Ghost Piece 即時更新。
2. **可調節節奏**：設定面板可在遊玩期間調整 DAS/ARR、鎖定延遲、180° 旋轉旗標並立即生效。
3. **可回溯競賽**：離線可練習，恢復網路後透過批次提交保持紀錄完整；排行榜以 14 天窗口維持新鮮。
4. **漸進式引導**：首次開啟提供教學 Overlay；之後可由設定開關。

## 4. 核心玩法規格
- 棋盤：10×20，額外 2 行隱藏 Buffer；渲染與碰撞共用同一網格模型。
- 方塊：I/O/T/S/Z/J/L 七種；採 **Bag-7** 隨機器，每輪保證七子各一次，支援固定種子以利測試與每日挑戰。
- 旋轉系統：簡化 SRS + 180° 旋轉選項；牆踢表採資料驅動配置。
- 遊戲狀態：`Spawn → Active → Lock Delay → Clear → Spawn`；鎖定延遲預設 500ms（可 100–1000ms），行消採動畫延遲 ≤ 150ms。
- 控制：
  - 必備：左/右、Soft Drop、Hard Drop、旋轉（順/逆）、Hold。
  - 選配：180° 旋轉、手柄輸入、全域暫停。
  - Input Buffer：保留 3 個輸入事件；可在鎖定延遲中使用。
- 計分：
  - 單/雙/三/四消：100/300/500/800 分；B2B +50%，Combo 累進（×n*50）。
  - Perfect Clear：額外 1800 分。
  - 速度等級：每消 10 行升 1 級，Drop 速度對應 PRD 附表（後續在 `docs/TESTPLAN.md` 補數值）。
- HUD：顯示 Level、Lines、Score、Combo、B2B、Hold、Next（≥ 5 顆）、歷史最佳、當前配置（DAS/ARR/Lock Delay）。

## 5. 設定、可及性與本地狀態
- 設定面板：滑桿或輸入框調整 DAS/ARR/Lock、音效音量、背景亮度、Ghost Piece 顯示、教學 Overlay。
- 鍵盤重綁定：提供至少 2 組預設與自訂檔；儲存在 LocalStorage。
- 可及性：支援色盲配色、震動關閉、視覺閃爍限制、音效音量獨立控制。
- 本地狀態持久化：使用 IndexedDB 儲存設定與離線待送分數；升級 schema 時需具備遷移策略。

## 6. 線上服務與排行榜
- 後端 API：`POST /scores`、`POST /scores/bulk`、`GET /scores`，詳見 `docs/openapi.yaml`。
- 離線容忍：前端將提交失敗的分數加入待送佇列，於重新上線或玩家手動觸發時批次重送。
- 排行榜規則：保留近 14 天或 Top-N（預設 100）；伺服器可調整；回應需提供 retention 描述與下一個 cursor。
- 欄位：暱稱 1–16 字元（過濾敏感詞）、分數 ≥ 0、選填 `lines`、`durationSeconds`、`levelReached`、`seed` 與 `client`（版本、UA）。
- 速率限制：對 IP + device fingerprint 考量 30 req/min；超過時回應 429，包含 `Retry-After`。
- 公平性：伺服器端做基本異常偵測（過短時長 / 異常高分），標記為 `suspect=true` 並暫不納入排行榜（需後端實作策略）。

## 7. 非功能性需求
- **性能**：
  - 前端渲染與邏輯合計 < 16ms/frame（P95，1080p/60Hz）。
  - 後端 `/scores` P95 < 100ms；批次上傳 < 250ms（50 筆）。
- **可靠性**：遊戲狀態機需避免硬降重入；Service Worker 需緩存關鍵資源並支援離線重載。
- **兼容性**：支援 Chromium 110+/Firefox 110+/Safari 16+；鍵盤事件以標準代碼處理。
- **安全與隱私**：避免收集個資；暱稱與客戶端資訊需清除敏感詞；API 回應含速率限制 Header；資料保留 14 天後刪除。
- **可測性**：核心模組具可注入時間/輸入；所有契約變更需先更新 `docs/openapi.yaml` 與對應測試。
- **可觀測性**：
  - 前端：Debug Overlay 顯示 FPS、輸入佇列長度、Bag 狀態、平均下降距離。
  - 後端：紀錄請求數、成功率、速率限制觸發、異常比率；預留 Prometheus endpoint。

## 8. 遊戲內事件與遙測
- 客戶端事件：`game_started`, `game_over`, `line_clear`, `hold_used`, `setting_changed`。
- 遙測輸出：以批次上報，若離線則緩存；參考 `docs/ARCH.md` 對應數據流。
- 分析儀表：Daily Active、平均遊玩時間、提交轉換率（提交分數 / 遊玩局數）、重送成功率。

## 9. 成功指標
- Acceptance 準則：對應 `docs/Acceptance.md` A-001 ~ A-007。
- 產品指標：
  - 平均遊玩時長 ≥ 5 分鐘。
  - 次日留存 ≥ 25%。
  - 每日有效提交 ≥ 75 筆；批次提交成功率 ≥ 98%。
- 技術指標：
  - 前端/後端 unit coverage ≥ 80%，branch ≥ 70%。
  - Lighthouse Performance ≥ 90；Web Vitals p75 INP < 200ms。

## 10. 發佈階段
- **Alpha（內測）**：完成單局遊戲核心、設定面板 MVP、離線單筆提交；支援 `POST /scores`。
- **Beta（公開測試）**：加入批次提交、Service Worker、排行榜 UI、速率限制；完成 `make gate` 綠燈。
- **GA（正式版）**：完善遙測與 Debug Overlay、支援每日挑戰種子、完成 `make accept` 驗收及文檔派生。

## 11. 範圍外與延伸構想
- 不包含多人對戰、登入/社交分享、付費虛寶、跨裝置雲存檔、皮膚商城。
- 延伸：每週挑戰、重播分享、訓練模式（固定種子）、自訂鍵盤佈局匯出。

## 12. 依賴與治理
- `docs/ARCH.md`、`docs/openapi.yaml`、`docs/TASKS.md` 必須同步更新；任何變更需先調整對應 prompts 再跑 `make plan/skeleton/tests`。
- `Makefile` 為流程統一入口；提交前需執行 `make gate`、`uv run pytest`、`pnpm test --coverage` 或提供跳過理由。
- `reports/` 產出禁止手動修改；若臨時修正需在 PR 中說明並更新 prompts 以免下輪覆寫。
