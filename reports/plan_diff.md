# plan_diff — 2025-09-20

## docs/PRD.md

--- docs/PRD.md	2025-09-20 19:25:32
+++ docs/PRD.md	2025-09-20 19:38:43
@@ -1,50 +1,87 @@
 # PRD.md（產品需求說明）— Tetris Web 版
 
 ## 1. 產品願景
-- 在桌面與筆電瀏覽器提供穩定 60 FPS 的經典俄羅斯方塊體驗，開啟即玩、無需登入。
-- 預設完全離線運作；若開啟網路功能，可與 FastAPI 後端同步高分榜並在 14 天內保留分數。
-- 所有產品規格、契約與開發流程均以 `docs/` 為唯一事實源，支援 plan → skeleton → tests → impl → gate → docs → accept 自動化。
+- 讓玩家在桌面瀏覽器於 1 秒內載入、即刻 60 FPS 遊玩經典俄羅斯方塊，無需登入即可離線練習，再於恢復網路時自動同步高分。
+- 將 Tetris 的節奏、可靠控制與競技透明度作為核心體驗支柱，確保從休閒到高手都能透過可觀測數據調整設定。
+- 所有規格、契約與流程以 `docs/` 為唯一事實源（SSOT），支援 plan → skeleton → tests → impl → gate → docs → accept 的自動化迴圈。
 
 ## 2. 目標使用者與情境
-- **休閒玩家**：午休或等候時間透過瀏覽器進行短局遊玩，期待低延遲操作與可視化統計。
-- **競技玩家**：希望量測 DAS/ARR、鎖定延遲並挑戰高分榜；需要可調參數與高可靠度的計分邏輯。
-- **開發 / 社群貢獻者**：使用者研究、LiveOps 與 open source 貢獻者依賴精準的契約與架構文檔維護迭代。
+- **休閒玩家（Play & Pause）**：午休、通勤等零碎時間希望快速進入與中斷；需要友善的預覽與教學。
+- **競技玩家（Optimize & Compare）**：追求 DAS/ARR、鎖定延遲的可調節與統計；需要可靠的計分與排行榜公平性。
+- **開發者 / 社群貢獻者（Extend & Audit）**：依賴版本化文檔、契約與自動化流程才能安全擴充功能、撰寫模組化測試。
 
-## 3. 核心玩法範圍
-- 棋盤 10×20、七種方塊（I/O/T/S/Z/J/L）使用 **Bag-7** 隨機器。
-- 旋轉系統採簡化 SRS，含牆踢；支援 soft drop、hard drop、暫停，鎖定延遲預設 500ms，可由設定面板調整。
-- 計分：單/雙/三/四消遞增，Back-to-Back 與 Combo 加成可於設定開關。
-- 提供 Ghost Piece、Hold、下一組預覽（至少 5 顆）與可切換的 180° 旋轉功能旗標。
-- 難度/速度：依行數提升下落速度，保證輸入延遲 P95 ≤ 16ms、渲染時間 < 16ms/frame。
+## 3. 體驗支柱與主要流程
+1. **即時反饋**：輸入 → 動畫呈現 ≤ 16ms，HUD 與 Ghost Piece 即時更新。
+2. **可調節節奏**：設定面板可在遊玩期間調整 DAS/ARR、鎖定延遲、180° 旋轉旗標並立即生效。
+3. **可回溯競賽**：離線可練習，恢復網路後透過批次提交保持紀錄完整；排行榜以 14 天窗口維持新鮮。
+4. **漸進式引導**：首次開啟提供教學 Overlay；之後可由設定開關。
 
-## 4. 高分榜後端範圍
-- API 入口位於 `POST /scores`（提交）與 `GET /scores`（查詢），詳見 `docs/openapi.yaml`。
-- 輸入欄位：暱稱（1-16 字元）、分數（≥ 0）、可選客戶端資訊（版本、UA）；支援匿名提交。
-- 儲存策略：保留最近 14 天或 Top-N（預設 100）；若後端停機，前端應顯示離線提示並允許稍後重送。
-- 速率限制：端點需限制頻率（暫以應用層拒絕，後續可整合反向代理策略）。
+## 4. 核心玩法規格
+- 棋盤：10×20，額外 2 行隱藏 Buffer；渲染與碰撞共用同一網格模型。
+- 方塊：I/O/T/S/Z/J/L 七種；採 **Bag-7** 隨機器，每輪保證七子各一次，支援固定種子以利測試與每日挑戰。
+- 旋轉系統：簡化 SRS + 180° 旋轉選項；牆踢表採資料驅動配置。
+- 遊戲狀態：`Spawn → Active → Lock Delay → Clear → Spawn`；鎖定延遲預設 500ms（可 100–1000ms），行消採動畫延遲 ≤ 150ms。
+- 控制：
+  - 必備：左/右、Soft Drop、Hard Drop、旋轉（順/逆）、Hold。
+  - 選配：180° 旋轉、手柄輸入、全域暫停。
+  - Input Buffer：保留 3 個輸入事件；可在鎖定延遲中使用。
+- 計分：
+  - 單/雙/三/四消：100/300/500/800 分；B2B +50%，Combo 累進（×n*50）。
+  - Perfect Clear：額外 1800 分。
+  - 速度等級：每消 10 行升 1 級，Drop 速度對應 PRD 附表（後續在 `docs/TESTPLAN.md` 補數值）。
+- HUD：顯示 Level、Lines、Score、Combo、B2B、Hold、Next（≥ 5 顆）、歷史最佳、當前配置（DAS/ARR/Lock Delay）。
 
-## 5. 用戶體驗與操作
-- 桌面鍵盤為主要輸入，預設配置遵循經典鍵位（Left/Right/Down/Space、Z/X/RShift）。
-- 設定面板可自訂 DAS、ARR、鎖定延遲、硬降觸發鍵與音效音量；支援保存於 LocalStorage。
-- 遊戲內 HUD 顯示：目前等級、Lines、Score、Combo、B2B、最高分紀錄與上次提交結果。
-- 開發環境顯示 Debug Overlay（影格耗時、輸入佇列、Bag 狀態）；正式版可關閉。
+## 5. 設定、可及性與本地狀態
+- 設定面板：滑桿或輸入框調整 DAS/ARR/Lock、音效音量、背景亮度、Ghost Piece 顯示、教學 Overlay。
+- 鍵盤重綁定：提供至少 2 組預設與自訂檔；儲存在 LocalStorage。
+- 可及性：支援色盲配色、震動關閉、視覺閃爍限制、音效音量獨立控制。
+- 本地狀態持久化：使用 IndexedDB 儲存設定與離線待送分數；升級 schema 時需具備遷移策略。
 
-## 6. 非功能性需求
-- **性能**：渲染與遊戲邏輯合計 < 16ms/影格；後端 API P95 延遲 < 100ms。
-- **可測性**：旋轉、行消、Bag、鎖定延遲、計分需具 Python/TypeScript 單元測試；提供最少一條 Playwright E2E 腳本覆蓋標準遊玩流程。
-- **穩定性**：前端狀態機需防止鎖定競態；後端對輸入做嚴格驗證並避免重複提交污染榜單。
-- **安全與隱私**：不收集敏感資料；限制暱稱字元集與敏感字詞；所有 API 回應需包含速率限制資訊（待建）。
-- **可觀測性**：開發模式導出 FPS、行消次數、平均下落距離、最大 Combo；後端紀錄請求數、成功率與錯誤碼分佈。
+## 6. 線上服務與排行榜
+- 後端 API：`POST /scores`、`POST /scores/bulk`、`GET /scores`，詳見 `docs/openapi.yaml`。
+- 離線容忍：前端將提交失敗的分數加入待送佇列，於重新上線或玩家手動觸發時批次重送。
+- 排行榜規則：保留近 14 天或 Top-N（預設 100）；伺服器可調整；回應需提供 retention 描述與下一個 cursor。
+- 欄位：暱稱 1–16 字元（過濾敏感詞）、分數 ≥ 0、選填 `lines`、`durationSeconds`、`levelReached`、`seed` 與 `client`（版本、UA）。
+- 速率限制：對 IP + device fingerprint 考量 30 req/min；超過時回應 429，包含 `Retry-After`。
+- 公平性：伺服器端做基本異常偵測（過短時長 / 異常高分），標記為 `suspect=true` 並暫不納入排行榜（需後端實作策略）。
 
-## 7. 成功指標
-- Acceptance 準則映射 `docs/Acceptance.md` A-001 ~ A-007；正式出貨需全部達標。
-- 指標：平均遊玩時長 ≥ 5 分鐘、次日留存 ≥ 25%、高分榜每日有效提交 ≥ 50、API 錯誤率 < 0.5%。
-- 技術指標：單元測試覆蓋率 行 ≥ 80%、分支 ≥ 70%；Playwright 腳本於 CI 穩定通過。
+## 7. 非功能性需求
+- **性能**：
+  - 前端渲染與邏輯合計 < 16ms/frame（P95，1080p/60Hz）。
+  - 後端 `/scores` P95 < 100ms；批次上傳 < 250ms（50 筆）。
+- **可靠性**：遊戲狀態機需避免硬降重入；Service Worker 需緩存關鍵資源並支援離線重載。
+- **兼容性**：支援 Chromium 110+/Firefox 110+/Safari 16+；鍵盤事件以標準代碼處理。
+- **安全與隱私**：避免收集個資；暱稱與客戶端資訊需清除敏感詞；API 回應含速率限制 Header；資料保留 14 天後刪除。
+- **可測性**：核心模組具可注入時間/輸入；所有契約變更需先更新 `docs/openapi.yaml` 與對應測試。
+- **可觀測性**：
+  - 前端：Debug Overlay 顯示 FPS、輸入佇列長度、Bag 狀態、平均下降距離。
+  - 後端：紀錄請求數、成功率、速率限制觸發、異常比率；預留 Prometheus endpoint。
 
-## 8. 範圍外與未來機會
-- 不含多人對戰、登入系統、雲端存檔、跨裝置同步與皮膚商城；若需求改變需先更新本 PRD 與 openapi。
-- 可選延伸：日/周賽事、自訂排名篩選、輔助模式（鬼影指示、手勢控制）。
+## 8. 遊戲內事件與遙測
+- 客戶端事件：`game_started`, `game_over`, `line_clear`, `hold_used`, `setting_changed`。
+- 遙測輸出：以批次上報，若離線則緩存；參考 `docs/ARCH.md` 對應數據流。
+- 分析儀表：Daily Active、平均遊玩時間、提交轉換率（提交分數 / 遊玩局數）、重送成功率。
 
-## 9. 依賴與版本治理
-- `docs/ARCH.md`、`docs/openapi.yaml`、`docs/TASKS.md` 需與本檔案同步維護；任何變更均需先更新 prompts 後再執行對應 `make` 目標。
-- `Makefile` 為唯一允許的流程進入點；提交前必須跑 `make gate` 與 `uv run pytest`（或提供跳過理由）。
+## 9. 成功指標
+- Acceptance 準則：對應 `docs/Acceptance.md` A-001 ~ A-007。
+- 產品指標：
+  - 平均遊玩時長 ≥ 5 分鐘。
+  - 次日留存 ≥ 25%。
+  - 每日有效提交 ≥ 75 筆；批次提交成功率 ≥ 98%。
+- 技術指標：
+  - 前端/後端 unit coverage ≥ 80%，branch ≥ 70%。
+  - Lighthouse Performance ≥ 90；Web Vitals p75 INP < 200ms。
+
+## 10. 發佈階段
+- **Alpha（內測）**：完成單局遊戲核心、設定面板 MVP、離線單筆提交；支援 `POST /scores`。
+- **Beta（公開測試）**：加入批次提交、Service Worker、排行榜 UI、速率限制；完成 `make gate` 綠燈。
+- **GA（正式版）**：完善遙測與 Debug Overlay、支援每日挑戰種子、完成 `make accept` 驗收及文檔派生。
+
+## 11. 範圍外與延伸構想
+- 不包含多人對戰、登入/社交分享、付費虛寶、跨裝置雲存檔、皮膚商城。
+- 延伸：每週挑戰、重播分享、訓練模式（固定種子）、自訂鍵盤佈局匯出。
+
+## 12. 依賴與治理
+- `docs/ARCH.md`、`docs/openapi.yaml`、`docs/TASKS.md` 必須同步更新；任何變更需先調整對應 prompts 再跑 `make plan/skeleton/tests`。
+- `Makefile` 為流程統一入口；提交前需執行 `make gate`、`uv run pytest`、`pnpm test --coverage` 或提供跳過理由。
+- `reports/` 產出禁止手動修改；若臨時修正需在 PR 中說明並更新 prompts 以免下輪覆寫。

## docs/ARCH.md

--- docs/ARCH.md	2025-09-20 19:25:55
+++ docs/ARCH.md	2025-09-20 19:39:16
@@ -1,58 +1,126 @@
 # ARCH.md（架構說明）— Tetris Web 版
 
 ## 1. 系統概覽
-- 單頁式前端（Vite + TypeScript）負責遊戲邏輯、渲染與 UI；後端（FastAPI）僅提供可選的高分榜 API。
-- 離線為預設行為；所有網路互動均具容錯並維持可玩性。資料契約以 `docs/openapi.yaml` 為唯一事實源。
-- 工具鏈：`Makefile` 串接 plan → skeleton → tests → impl → gate → docs → accept；`tools/gate.sh` 執行 lint/type/test，`uv` 管理 Python 依賴、`pnpm` 管理前端。
+- 單頁式前端（Vite + TypeScript + Canvas）負責遊戲核心、渲染、UI、離線佇列與 Service Worker；後端 FastAPI 僅提供高分榜與遙測入口。
+- 預設離線可玩：所有關鍵資源以 Service Worker 預快取，分數與遙測在恢復網路時批次同步。
+- 合約遵循 `docs/openapi.yaml`，任何契約變更需先更新文檔再驅動骨架/測試/實作。
 
 ## 2. 系統脈絡與資料流
 ```
-+--------------+        HTTPS/JSON         +------------------+
-|  Browser     | <----------------------> | FastAPI (scores) |
-|  Vite build  |                          |  uvicorn/uv      |
-+--------------+                          +------------------+
-        |                                        |
-        | canvas/gamepad/keyboard events         | in-memory store (MVP)
-        v                                        v
-  Game Loop / State Machine             ScoreService (抽象層)
++-----------------+    Canvas/Input    +------------------+
+|  Browser (SPA)  |<------------------>|  Keyboard/Gamepad|
++-----------------+                    +------------------+
+        |
+        | HTTP fetch / Background sync (Service Worker)
+        v
++-----------------+    HTTPS/JSON     +-------------------+
+|  Frontend SW    | <---------------> | FastAPI (uvicorn) |
++-----------------+                    +-------------------+
+        |                                      |
+        | IndexedDB (Scores queue, config)     | Storage adapter (memory → DB)
+        v                                      v
++-----------------+                    +-------------------+
+|   Replay/Cache  |                    | Telemetry Sink    |
++-----------------+                    +-------------------+
 ```
-- 前端使用 `fetch` 模組呼叫 `/scores`；若失敗則提示並排程重送。
-- 高分榜存儲階段為記憶體 List；預計以倉儲介面替換為持久化（Redis / SQLite）。
-- 觀測資料透過前端 Debug Overlay 即時呈現；後端保留擴充指標（Prometheus）介面。
+- 前端透過 `ScoreClient` 呼叫 `/scores` 與 `/scores/bulk`；Service Worker 提供背景重送與離線快取。
+- FastAPI 透過 `ScoreService` 封裝儲存層，可替換為 SQLite/Redis；遙測寫入後端紀錄器或未來訊息佇列。
 
 ## 3. 前端模組切分（`web/src/`）
-- `core/`：
-  - `board.ts`：網格狀態、行消、垃圾行注入。
-  - `piece.ts`：七種方塊資料、旋轉表、牆踢表（簡化 SRS + 180° 旗標）。
-  - `rng.ts`：Bag-7 隨機器，支援種子與可預測測試模式。
-  - `scoring.ts`：計分與 Combo/B2B 邏輯；輸出可序列化狀態。
-  - `game.ts`：`Spawn → Active → Lock → Clear → GameOver` 狀態機，含暫停、重開、鎖定延遲。
-- `input/`：鍵盤事件處理，實作 DAS/ARR 去抖；暴露 Observable 以利錄製重播；保留手柄擴充。
-- `render/`：Canvas 2D 渲染器，抽象出 `drawFrame(state, ctx)`，支援 Ghost Piece、網格與背景圖層；可升級至 WebGL。
-- `net/`：高分榜 API client，依 `openapi.yaml` 自動產生型別；含離線佇列與退避演算法。
-- `ui/`：顯示 HUD、設定面板、排行榜對話框；採組件式設計以利多佈景。
-- `state/`（預留）：集中管理設置、排行榜緩存、使用者偏好（LocalStorage）。
+- `core/`
+  - `board.ts`：網格狀態、行消演算法、垃圾行注入接口。
+  - `piece.ts`：七種方塊資料、旋轉/牆踢表、180° 旋轉旗標。
+  - `rng.ts`：Bag-7 隨機器，支援固定種子與迭代器模式。
+  - `scoring.ts`：計分、Combo/B2B、Perfect Clear、統計輸出。
+  - `game.ts`：狀態機 `Spawn → Active → Lock → Clear → GameOver`，可注入時鐘與輸入。
+- `input/`
+  - `keyboard.ts`：DAS/ARR、連按緩衝、可重綁定解析。
+  - `controller.ts`（待擴充）：手柄事件 normalize。
+- `render/`
+  - `canvas_renderer.ts`：Canvas 2D 渲染；以層（背景、網格、方塊、Ghost、HUD）劃分；支援高 DPI。
+  - `hud.ts`：HUD 與 Overlay；接受 game state snapshot。
+- `state/`
+  - `store.ts`：集中管理設定、排行榜、遊玩統計；使用 RxJS 或輕量自定 store；支援 time-travel（Debug）。
+  - `persist.ts`：LocalStorage/IndexedDB 存取抽象。
+- `net/`
+  - `score-client.ts`：根據 OpenAPI 生成型別，封裝單筆與批次提交、退避策略、速率限制 header 解析。
+  - `telemetry-client.ts`（預留）：上傳遙測事件。
+- `workers/`
+  - `service-worker.ts`：資源快取、背景同步、待送隊列重送。
+- `ui/`
+  - `App.tsx` or `App.ts`：組合遊戲核心與 UI 派生。
+  - `panels/`：設定面板、排行榜對話框、教學 Overlay。
+- `analytics/`：事件緩存與批次上報。
+- 測試：Vitest 覆蓋核心模組；Playwright 覆蓋整體流。
 
 ## 4. 後端模組切分（`src/`）
-- `main.py`：建立 FastAPI app、掛載 `/scores` router、註冊 CORS / 中介層（待加）。本地啟動 `uv run fastapi dev src/main.py --reload`。
-- `routers/scores.py`：處理 REST 路由、查詢參數與錯誤處理；依 `ScoreService` 提供業務邏輯。
-- `services/score_service.py`：封裝高分榜邏輯，目前使用記憶體 list；抽象方法 `get_top_scores(limit)` 與 `create_score(payload)` 以利未來替換儲存層。
-- `models.py`：Pydantic 模型（`ScoreInput`、`Score`、`ScoreList`、`ClientInfo`）；欄位與驗證需與 OpenAPI 同步。
-- 測試：`tests/api/test_scores.py` 利用 `TestClient` 覆蓋主要路徑；後續需補齊異常流程與速率限制測試。
+- `main.py`：建立 FastAPI app、註冊 CORS、時區設定、健康檢查、metrics endpoint（待實作）。
+- `routers/scores.py`：
+  - `GET /scores`：支援 `limit`、`cursor`、`since`；回傳 `ScoreWindow`。
+  - `POST /scores`：單筆提交，執行暱稱審核與速率限制檢查。
+  - `POST /scores/bulk`：批次提交，逐筆驗證，失敗項目回報。
+- `services/score_service.py`：
+  - 抽象儲存介面 `ScoreRepository`，初期為記憶體實作，預留 SQLite 驅動。
+  - 套用業務規則（重複提交、異常值偵測、保留政策）。
+- `repositories/`（新增）：
+  - `memory.py`：現有列表；
+  - `sqlite.py`（待建）：排序插入與 GC 任務。
+- `models.py`：Pydantic 模型與 DTO；提供 alias 與 `ConfigDict` 控制；與 OpenAPI 同步。
+- `rate_limit/`（預留）：簡易 Token Bucket 或整合外部中介層。
+- `telemetry/`（預留）：遙測事件緩存與批次寫入。
+- 測試：Pytest covering happy path（200/201/207/400/429/500）與邏輯測試。
 
 ## 5. 資料契約與型別同步
-- OpenAPI 3.0.3 文件透過 `docs/openapi.yaml` 維護；前端以 `pnpm dlx openapi-typescript` 產生型別（待在 `net/` 整合）。
-- 欄位命名：HTTP payload 使用 `camelCase`（`createdAt`、`generatedAt`），後端 Pydantic 使用 alias。
-- 快取策略：排行榜回應可在前端快取 30 秒；後端未實作 ETag，暫以查詢參數避免過期資料。
+- `docs/openapi.yaml` 為唯一契約；版本以 `semver` 進位（目前 0.3.0）。
+- 前端以 `pnpm dlx openapi-typescript` 產生型別至 `web/src/net/types.ts`；變更時需重新生成。
+- 後端透過 Pydantic `model_config` 與 `alias_generator` 保持 snake_case ↔ camelCase 映射。
+- 批次提交回應 207 Multi-Status（JSON body 詳列成功/失敗）。
 
-## 6. 品質屬性與守護策略
-- **性能**：前端遊戲迴圈以 `requestAnimationFrame` 驅動，將渲染與邏輯分離；後端儲存層需在 O(log n) 插入/查詢（引入資料庫時以排序集合實作）。
-- **可測性**：核心模組需具可注入依賴（例如時間、RNG）；提供 Record/Replay 以重現錯誤。CI 執行 `make gate` 確保 lint、type、test 三通。
-- **可靠性**：前端在 detach/visibility change 時進入暫停；後端以 UUID 作為主鍵避免碰撞，速率限制策略需避免單一 IP 擊穿。
-- **安全**：限制暱稱字元集、長度；所有錯誤訊息須去識別化。預留 API Key / CAPTCHA 擴展能力。
+## 6. 執行環境與部署
+- **開發**：
+  - 前端：`pnpm install && pnpm run dev`；支援 `pnpm run test -- --watch`。
+  - 後端：`uv sync && uv run fastapi dev src/main.py --reload`。
+- **測試**：`make gate` 執行 ESLint、Prettier、Vitest、Ruff、Mypy、Pytest；Playwright 於 CI 內執行 headless。
+- **部署**：
+  - 前端靜態資源以 Vite build → CDN（Netlify/Vercel/S3）。
+  - 後端以 uvicorn + gunicorn 或容器部署；需設定環境變數：`MAX_LIMIT`、`RETENTION_DAYS`、`BATCH_SIZE_LIMIT`。
+  - 遙測/日誌匯出：stdout JSON + 可選 OpenTelemetry。
 
-## 7. 部署與營運
-- **開發**：`pnpm install && pnpm run dev` 啟動前端；`uv sync && uv run fastapi dev src/main.py --reload` 啟動後端。
-- **打包**：`pnpm run build` 產生靜態資源；後端以 `uv run fastapi run src.main:app` 搭配容器或 Serverless，須設定 CORS、環境變數（排行榜保留日數、Top-N 配額）。
-- **監控**：部署後需整合 HTTP Metrics（Requests/sec、錯誤率、P95 latency）；前端透過 Web Vitals 與自訂事件上報（待設計）。
-- **回滾**：依 `docs/TASKS.md` DAG 回溯至最近穩定節點，重新觸發自動化並更新相關文檔。
+## 7. 品質屬性與守護策略
+- **性能**：
+  - 迴圈分離邏輯與渲染（requestAnimationFrame + 固定步長模擬）。
+  - 使用 OffscreenCanvas（可選）以降低主執行緒阻塞。
+  - 後端排序採優先佇列或索引查詢；批次插入需 O(n log n)。
+- **可靠性**：
+  - 前端 State Store 使用事件溯源紀錄，可回放錯誤案例。
+  - 後端提供健康檢查 `/healthz` 與自監控；記憶體儲存需快照備份機制（定期 dump 至磁碟）。
+- **安全**：
+  - 暱稱審查（正規化 + 禁詞表）；速率限制 + 指紋 heuristics。
+  - CORS 只允許前端來源；所有回應含 `X-Content-Type-Options` 與 `Cache-Control`。
+- **可觀測性**：
+  - 前端使用 Web Vitals 與自定事件（透過 `analytics/` 模組）上報。
+  - 後端暴露 Prometheus metrics（`/metrics`），記錄 `scores_submitted_total`、`rate_limit_block_total` 等。
+
+## 8. 開發流程與自動化
+- `Makefile` 任務：
+  - `make plan` 更新文檔（本次手動執行）。
+  - `make skeleton` 刷新前後端骨架。
+  - `make tests` 生成測試草案（Gemini）。
+  - `make impl` 負責實作 / 重構。
+  - `make gate` 呼叫 `tools/gate.sh` 進行 lint/type/test。
+  - `make docs` / `make accept` 生成文檔與驗收報告。
+- 所有 LLM 生成前需更新對應 `prompts/`，並在 PR 紀錄來源工具與版本。
+
+## 9. 演進路線
+- **短期**：補齊批次提交、Service Worker、SQLite 儲存、遙測骨架。
+- **中期**：引入 Replay 下載、每日挑戰種子回溯、排行榜分頁。
+- **長期**：考慮多玩家對戰模式、排行榜作弊偵測模型、跨裝置同步。
+
+## 10. 開放問題
+- 速率限制最終是否交由反向代理（NGINX/Cloudflare）或應用層？需與基礎設施團隊確認。
+- 遙測資料最終落點（S3 vs. 時序資料庫）與保留政策尚待定，必須在 Beta 前鎖定。
+
+## 11. 附件
+- 相關契約：`docs/openapi.yaml`
+- 測試計畫：`docs/TESTPLAN.md`
+- 驗收準則：`docs/Acceptance.md`

## docs/openapi.yaml

--- docs/openapi.yaml	2025-09-20 19:26:16
+++ docs/openapi.yaml	2025-09-20 19:39:48
@@ -1,30 +1,31 @@
 openapi: 3.0.3
 info:
   title: Tetris Web Highscore API
-  version: 0.2.0
+  version: 0.3.0
   description: >-
-    Optional FastAPI service that stores short-lived leaderboard entries for the
-    Tetris Web project. Clients are expected to run offline-first and resync when
-    connectivity is available. Rate limiting and strict validation protect the
-    shared leaderboard.
+    Offline-first leaderboard service for the Tetris Web project. Clients queue
+    submissions locally and resync when connectivity returns. Rate limiting and
+    validation protect shared resources. This document is the single source of
+    truth for the backend contract.
 servers:
   - url: https://api.example.com
     description: Placeholder production endpoint
   - url: http://localhost:8000
-    description: Local development via `uv run fastapi dev src/main.py --reload`
+    description: Local development (`uv run fastapi dev src/main.py --reload`)
 tags:
   - name: Scores
-    description: Submit and query high score entries
+    description: Submit and query leaderboard entries
 paths:
   /scores:
     get:
       tags: [Scores]
-      summary: List top scores
+      summary: List leaderboard scores
       operationId: listScores
       description: >-
         Return the most recent high score entries ordered by points descending
-        and then by creation time descending. Results are capped by the requested
-        limit or the server-side retention policy (14 days or Top-N).
+        then creation time descending. Supports cursor-based pagination and
+        optional freshness filters. Results are capped by the requested limit or
+        the server-side retention policy (default 14 days / Top-100).
       parameters:
         - in: query
           name: limit
@@ -34,38 +35,48 @@
             maximum: 100
             default: 10
           description: Maximum number of records to return.
+        - in: query
+          name: cursor
+          schema:
+            type: string
+          description: Pagination cursor from a previous response.
+        - in: query
+          name: since
+          schema:
+            type: string
+            format: date-time
+          description: Return scores created at or after this timestamp.
       responses:
         '200':
           description: A window of leaderboard entries.
+          headers:
+            X-RateLimit-Limit:
+              schema: { type: integer }
+              description: Maximum allowed requests per minute.
+            X-RateLimit-Remaining:
+              schema: { type: integer }
+              description: Remaining requests in the current window.
+            X-RateLimit-Reset:
+              schema: { type: integer }
+              description: Unix epoch seconds until the window resets.
           content:
             application/json:
               schema:
-                $ref: '#/components/schemas/ScoreList'
+                $ref: '#/components/schemas/ScoreWindow'
         '429':
-          description: Too many requests; caller should back off before retrying.
-          content:
-            application/json:
-              schema:
-                $ref: '#/components/schemas/ErrorResponse'
+          $ref: '#/components/responses/TooManyRequests'
         '500':
-          description: Unexpected server failure while listing scores.
-          content:
-            application/json:
-              schema:
-                $ref: '#/components/schemas/ErrorResponse'
+          $ref: '#/components/responses/ServerError'
         '422':
-          description: Invalid query parameter (handled by FastAPI validation).
-          content:
-            application/json:
-              schema:
-                $ref: '#/components/schemas/HTTPValidationError'
+          $ref: '#/components/responses/ValidationError'
     post:
       tags: [Scores]
-      summary: Submit a score
+      summary: Submit a single score
       operationId: submitScore
       description: >-
         Store a new score for a nickname. Clients should deduplicate submissions
-        on their side to avoid spamming the leaderboard.
+        locally. The server may flag suspicious records and omit them from
+        ranking.
       requestBody:
         required: true
         content:
@@ -75,52 +86,110 @@
       responses:
         '201':
           description: Score accepted and stored.
+          headers:
+            Retry-After:
+              schema: { type: integer }
+              description: Seconds until another submission is allowed (set when throttled).
           content:
             application/json:
               schema:
                 $ref: '#/components/schemas/Score'
-        '400':
-          description: Business rule violated (e.g., nickname banned, duplicate entry).
+        '207':
+          description: Score stored but flagged for review (suspect).
           content:
             application/json:
               schema:
-                $ref: '#/components/schemas/ErrorResponse'
-        '429':
-          description: Too many submissions from this client.
+                $ref: '#/components/schemas/Score'
+        '400':
+          description: Business rule violated (e.g., nickname banned, invalid timing).
           content:
             application/json:
               schema:
                 $ref: '#/components/schemas/ErrorResponse'
+        '429':
+          $ref: '#/components/responses/TooManyRequests'
         '500':
-          description: Unexpected server failure while storing the score.
+          $ref: '#/components/responses/ServerError'
+        '422':
+          $ref: '#/components/responses/ValidationError'
+  /scores/bulk:
+    post:
+      tags: [Scores]
+      summary: Submit multiple scores
+      operationId: submitScoresBulk
+      description: >-
+        Upload up to 50 queued scores in one request. Each item is validated
+        independently; the response details successes and failures.
+      requestBody:
+        required: true
+        content:
+          application/json:
+            schema:
+              $ref: '#/components/schemas/ScoreBatchInput'
+      responses:
+        '207':
+          description: Partial success with per-item status.
+          headers:
+            Retry-After:
+              schema: { type: integer }
+              description: Seconds until the queue may retry (set when throttled).
           content:
             application/json:
               schema:
-                $ref: '#/components/schemas/ErrorResponse'
-        '422':
-          description: Invalid payload (handled by FastAPI validation).
+                $ref: '#/components/schemas/ScoreBatchResult'
+        '413':
+          description: Payload too large or item count exceeded.
           content:
             application/json:
               schema:
-                $ref: '#/components/schemas/HTTPValidationError'
+                $ref: '#/components/schemas/ErrorResponse'
+        '429':
+          $ref: '#/components/responses/TooManyRequests'
+        '500':
+          $ref: '#/components/responses/ServerError'
+        '422':
+          $ref: '#/components/responses/ValidationError'
 components:
   schemas:
-    ScoreList:
+    ScoreWindow:
       type: object
-      required: [items, generatedAt]
+      required: [generatedAt, items, retention]
       properties:
         generatedAt:
           type: string
           format: date-time
-          description: Timestamp when the snapshot was generated by the server.
+          description: Timestamp when the snapshot was generated.
+        retention:
+          type: object
+          required: [days, maxRecords]
+          properties:
+            days:
+              type: integer
+              minimum: 1
+              description: Days of history the server keeps.
+            maxRecords:
+              type: integer
+              minimum: 1
+              description: Maximum number of records kept for the window.
+        nextCursor:
+          type: string
+          nullable: true
+          description: Cursor to request the next page; null when no more data.
         items:
           type: array
-          description: Ordered list of scores (highest points first).
+          description: Ordered list of scores.
           items:
             $ref: '#/components/schemas/Score'
     Score:
       type: object
-      required: [id, nickname, points, createdAt]
+      required:
+        - id
+        - nickname
+        - points
+        - createdAt
+        - durationSeconds
+        - lines
+        - levelReached
       properties:
         id:
           type: string
@@ -134,12 +203,37 @@
           type: integer
           minimum: 0
           description: Final score achieved at game over.
+        lines:
+          type: integer
+          minimum: 0
+          description: Lines cleared in the run.
+        levelReached:
+          type: integer
+          minimum: 0
+          description: Last level reached during the run.
+        durationSeconds:
+          type: integer
+          minimum: 0
+          description: Total run duration in seconds.
+        seed:
+          type: string
+          nullable: true
+          description: Optional seed used by the Bag RNG.
         createdAt:
           type: string
           format: date-time
           description: Time when the server accepted the score.
+        suspect:
+          type: boolean
+          default: false
+          description: Flag indicating the score is withheld from ranking pending review.
         client:
           $ref: '#/components/schemas/ClientInfo'
+        tags:
+          type: array
+          items:
+            type: string
+          description: Optional metadata labels provided by the client.
       additionalProperties: false
     ScoreInput:
       type: object
@@ -154,15 +248,82 @@
           type: integer
           minimum: 0
           description: Total points acquired during gameplay.
+        lines:
+          type: integer
+          minimum: 0
+          description: Lines cleared in the run.
+        levelReached:
+          type: integer
+          minimum: 0
+          description: Last level reached during the run.
+        durationSeconds:
+          type: integer
+          minimum: 0
+          description: Run duration in seconds.
+        seed:
+          type: string
+          description: Optional seed used by the client.
+        tags:
+          type: array
+          minItems: 0
+          maxItems: 5
+          items:
+            type: string
+            maxLength: 24
+          description: Optional metadata labels (e.g., "daily-challenge").
         client:
           $ref: '#/components/schemas/ClientInfo'
       additionalProperties: false
+    ScoreBatchInput:
+      type: object
+      required: [items]
+      properties:
+        clientTime:
+          type: string
+          format: date-time
+          description: Timestamp when the batch was generated on the client.
+        items:
+          type: array
+          minItems: 1
+          maxItems: 50
+          items:
+            $ref: '#/components/schemas/ScoreInput'
+          description: Scores queued locally awaiting upload.
+      additionalProperties: false
+    ScoreBatchResult:
+      type: object
+      required: [accepted, rejected]
+      properties:
+        accepted:
+          type: array
+          description: Scores that were stored successfully.
+          items:
+            $ref: '#/components/schemas/Score'
+        rejected:
+          type: array
+          description: Scores that failed validation or business rules.
+          items:
+            $ref: '#/components/schemas/ScoreRejection'
+      additionalProperties: false
+    ScoreRejection:
+      type: object
+      required: [reason, payload]
+      properties:
+        reason:
+          type: string
+          description: Error code explaining why the item failed.
+        payload:
+          $ref: '#/components/schemas/ScoreInput'
+      additionalProperties: false
     ClientInfo:
       type: object
       properties:
         version:
           type: string
-          description: Short client build identifier.
+          description: Client build identifier (semver or hash).
+        platform:
+          type: string
+          description: Simplified device/platform identifier.
         ua:
           type: string
           maxLength: 128
@@ -172,6 +333,9 @@
       type: object
       required: [detail]
       properties:
+        code:
+          type: string
+          description: Machine-readable error code.
         detail:
           oneOf:
             - type: string
@@ -193,6 +357,7 @@
           type: string
         type:
           type: string
+      additionalProperties: false
     HTTPValidationError:
       type: object
       properties:
@@ -200,3 +365,32 @@
           type: array
           items:
             $ref: '#/components/schemas/ValidationError'
+  responses:
+    TooManyRequests:
+      description: Too many requests; caller should back off before retrying.
+      headers:
+        Retry-After:
+          schema: { type: integer }
+          description: Seconds until the rate limit resets.
+        X-RateLimit-Limit:
+          schema: { type: integer }
+        X-RateLimit-Remaining:
+          schema: { type: integer }
+        X-RateLimit-Reset:
+          schema: { type: integer }
+      content:
+        application/json:
+          schema:
+            $ref: '#/components/schemas/ErrorResponse'
+    ServerError:
+      description: Unexpected server failure while processing the request.
+      content:
+        application/json:
+          schema:
+            $ref: '#/components/schemas/ErrorResponse'
+    ValidationError:
+      description: Invalid payload or query parameter.
+      content:
+        application/json:
+          schema:
+            $ref: '#/components/schemas/HTTPValidationError'

## docs/TASKS.md

--- docs/TASKS.md	2025-09-20 19:26:36
+++ docs/TASKS.md	2025-09-20 19:40:24
@@ -13,6 +13,10 @@
   H --> I[工具閘門: lint/type/cover/perf]
   I --> J[文檔派生 (Gemini)]
   J --> K[最終驗收包 (Codex JSON)]
+  G --> M[資料持久化擴充]
+  G --> L[Telemetry / Service Worker]
+  M --> H
+  L --> H
   K -->|未達標| F
   I -->|未過| F
 ```
@@ -20,31 +24,35 @@
 ## 2. 節點詳解與狀態
 | 節點 | 說明 | 主要輸入 | 產出 | Gate 條件 | 風險 | 回滾策略 | 狀態 |
 |---|---|---|---|---|---|---|---|
-| A | 定義產品需求（`docs/PRD.md`），同步遊戲規格、後端範圍、非功能指標。 | 市場假設、`docs/HANDBOOK.md` §4/11 | 已簽核 PRD 草案 | PM/Tech Lead 確認；Acceptance A-001~A-007 映射完成 | 需求缺漏；與架構不一致 | 回退至上一版 PRD，更新需求並重跑 A→K | ✅ 更新於本循環 |
-| B | 確立架構（`docs/ARCH.md`），拆分前端/後端模塊與依賴。 | PRD、Handbook §5 | 版本化架構說明 | 架構評審通過；模塊責任清晰 | 模塊邊界模糊；漏掉監控/安全 | 退回 A，修正 PRD/ARCH 後再行 B→K | ✅ 更新於本循環 |
-| C | 契約設計（`docs/openapi.yaml`），提供高分榜 API SSOT。 | PRD、ARCH、Handbook §6 | 簽核的 OpenAPI 契約 | JSON Schema 驗證通過；示例請求跑通 | 契約與實作偏離；廢棄欄位 | 回滾至上版契約，通知前端重新生成 | ✅ 更新於本循環 |
-| D | 任務圖（本文件），列出 DAG、風險、回滾與狀態。 | PRD、ARCH、OpenAPI、Handbook §3 | 更新的 TASKS 表與 Mermaid | 各節點具 inputs/outputs/gates/risks | DAG 遮蔽外部依賴；責任不清 | 回退到先前 TASKS，補充欄位後重審 | ✅ 更新於本循環 |
-| E | 生成骨架（`make skeleton` → Claude），同步補齊 `web/` 與 `src/` 養骨。 | PRD、ARCH、openapi、prompts/skeleton | 初始程式骨架 + TODO 標註 | 產生檔案僅限 `web/src`；Lint/type 檢查可通過 | 骨架覆蓋手寫程式；越權改檔 | 重置至最近穩定 commit，調整 prompts 後重跑 | ⏳ 待依據最新文檔重跑 |
-| F | 測試草案（`make tests` → Gemini），建立 Pytest 並為前端預留 Vitest/Playwright 草案。 | OpenAPI、TESTPLAN、TASKS | `tests/` + fixtures 標註 CONTRACT 條款 | 生成的測試可執行或留 TODO；契約標註齊全 | 自動測試與程式結構不匹配 | 恢復前一版 tests，改寫 prompt 或手動補齊 | ⏳ 部分完成（後端 pytest 現有，前端待補） |
-| G | 實作與重構（`make impl` → Claude 或人工）。 | Skeleton、Tests、TASKS Ready 節點 | 變更程式 + 補測試 | 單元/整合測試綠燈；Review 無阻塞 | LLM 誤改契約；覆蓋手動更動 | git revert 本節點提交，更新 DAG 後重跑 | 🔄 進行中（後端 MVP 已就緒，前端核心待實作） |
-| H | 交叉審查（`make review` → Codex / 手動 code review）。 | G 產出、測試結果 | `reports/review_codex.md` + Review 記錄 | 高風險缺陷清零；建議已處理或列入 TODO | 審查流於形式；漏掉性能問題 | 回到 G 重實作/補測試，再觸發審查 | ⏳ 未啟動 |
-| I | 工具閘門（`make gate` → `tools/gate.sh`）。 | 代碼倉庫、`pnpm`/`uv` 指令 | Lint/型別/測試/覆蓋率輸出 | 覆蓋率 ≥80%/70%，lint/type 0 錯 | 閘門耗時、資源不足 | 調整 gate 腳本或拆批執行；失敗即回到 G | ⏳ 未啟動 |
-| J | 文檔派生（`make docs` → Gemini），生成 API 文檔等。 | 契約、程式註釋、Handbook 指南 | API 文檔 + Quickstart | Docs build 成功；手寫區塊保留 | 自動文檔覆蓋手寫內容 | 手動合併，或恢復手寫塊再 rerun | ⏳ 未啟動 |
-| K | 驗收（`make accept` → Codex），對照 `docs/Acceptance.md`。 | 測試輸出、Acceptance 準則 | `reports/acceptance.json` | 所有 A-001~A-007 為 Pass | 驗收輸出不可信；缺少證據 | 重跑 F→I 取得證據，再 rerun K | ⏳ 未啟動 |
+| A | 定義產品需求（`docs/PRD.md`），同步遊戲規格、設定、排行榜範圍。 | 市場假設、`docs/HANDBOOK.md` §4/11 | PRD v0.3（本次更新） | PM/Tech Lead 確認；Acceptance A-001~A-007 映射完整 | 需求未反映新批次提交或 Service Worker | 回退至上一版 PRD，補齊需求後重跑 A→K | ✅ 已更新 v0.3 |
+| B | 確立架構（`docs/ARCH.md`），拆分前端/後端模塊、離線資料流。 | PRD v0.3、Handbook §5 | 架構說明 v0.3 | 架構評審通過；模塊責任清晰 | 模塊邊界模糊、SW 與遙測策略未定 | 回退 A，修正 PRD/ARCH 後再行 B→K | ✅ 已更新 v0.3 |
+| C | 契約設計（`docs/openapi.yaml`），提供單/批次提交與排行榜查詢。 | PRD、ARCH、Handbook §6 | OpenAPI 0.3.0 | openapi-cli 驗證；範例請求通過 | 契約與現行實作落差大 | 暫停部署，回退契約並調整計畫 | ✅ 已更新，等待實作同步 |
+| D | 任務圖（本文件），列出 DAG、風險、回滾、外掛節點。 | PRD、ARCH、OpenAPI | TASKS v0.3 | DAG 覆蓋所有必須節點；狀態同步 | 表未覆蓋新工作項 | 回退舊版 TASKS，補欄位後重審 | ✅ 已更新 |
+| E | 生成骨架（`make skeleton` → Claude），同步補齊 `web/` 與 `src/` 骨架。 | 文檔 v0.3、`prompts/skeleton` | 初始程式骨架 + TODO | 產出檔案受限於 `web/src`、`src/`；Lint/type 可通過 | 骨架覆蓋手寫程式 | 調整 prompts，使用 git revert 回到前一穩定點 | ⏳ 待依據新契約重跑 |
+| F | 測試草案（`make tests` → Gemini），建立 Pytest/Vitest/Playwright 草案。 | OpenAPI 0.3、TESTPLAN | `tests/` 草案 + TODO | 測試可執行或明確 TODO；契約標註齊全 | 自動測試與程式結構不匹配 | 恢復前版 tests，調整 prompt 後重跑 | ⏳ 待更新 |
+| G | 實作與重構（`make impl` → Claude 或人工）。 | Skeleton、Tests Ready 節點 | 程式變更 + 補測試 | 單元/整合測試綠燈；Review 無阻塞 | LLM 誤改契約；批次提交落地困難 | 使用 feature branch，必要時 revert + 更新 DAG | 🔄 進行中（後端 MVP 已有；需補批次提交、SW） |
+| H | 交叉審查（`make review`）— Codex ↔ Claude。 | G 輸出、測試結果 | `reports/review_codex.md` | 高風險缺陷清零；建議已處理或列 TODO | 審查忽略性能、安全議題 | 回到 G 重實作/補測試，再觸發審查 | ⏳ 未啟動 |
+| I | 工具閘門（`make gate` → `tools/gate.sh`）。 | 代碼倉庫、`uv`/`pnpm` | Lint/type/test/coverage 報告 | 覆蓋率 ≥80%/70%；lint/type 0 錯 | 閘門耗時 / 覆蓋率不足 | 拆批執行、調整測試權重；失敗回到 G | ⏳ 未啟動 |
+| J | 文檔派生（`make docs` → Gemini），生成 API/開發者文檔。 | 契約、程式註釋、Handbook | API 文檔 + Quickstart | Docs build 成功；手寫區塊保留 | 自動文檔覆蓋手寫內容 | 手動合併或恢復手寫塊再 rerun | ⏳ 未啟動 |
+| K | 驗收（`make accept` → Codex），對照 `docs/Acceptance.md`。 | 測試輸出、Acceptance | `reports/acceptance.json` | 所有 A-001~A-007 Pass | 验收缺少證據 | 回跑 F→I 取得證據後重試 | ⏳ 未啟動 |
+| L | Telemetry / Service Worker 強化：SW 快取策略、離線事件緩存、遙測批次。 | PRD v0.3、ARCH v0.3 | SW + analytics 模組 | Playwright 離線案例通過；遙測隊列覆蓋率達標 | 瀏覽器相容性差異 | 拆成瀏覽器專用策略，保留回退 SW 版本 | 🟡 需求已定，待排程 |
+| M | 儲存層持久化：SQLite/Redis 達到 Top-N + 14 天策略；批次 API 與資料庫一致。 | PRD、ARCH、OpenAPI | `ScoreRepository` 永久化實作 | 負載測試滿足 P95 < 250ms；資料保留腳本 | DB schema 演進風險 | 使用遷移腳本，必要時回退到記憶體 + 冷備份 | 🟡 需求已定，待排程 |
 
 ## 3. 里程碑追蹤
-- **M1：設計凍結**（A+B+C+D）— ✅ 完成，後端契約與文檔同步更新。
-- **M2：Alpha 可跑**（E+F+G）— 🔄 進行中；需依更新後 PRD/ARCH 重跑 skeleton 並補齊前端測試。
-- **M3：Beta 驗證**（H+I）— ⏳ 未啟動。
-- **M4：發佈包**（J+K）— ⏳ 未啟動。
+- **M1：設計凍結**（A+B+C+D）— ✅ 完成（v0.3）。
+- **M2：Alpha 可跑**（E+F+G 基礎單筆提交）— 🔄 進行中，需重跑 skeleton/tests 以對齊契約。
+- **M3：Beta 離線同步**（G 批次提交 + L + M 部分）— ⏳ 未啟動。
+- **M4：GA 驗收**（H+I+J+K）— ⏳ 未啟動。
 
 ## 4. 風險與對策
-- **R1：前端骨架滯後於最新規格** — 需於 `make skeleton` 前更新 `prompts/skeleton`，並在 PR 註記手動調整。
-- **R2：高分榜儲存層仍為記憶體** — 持久化前需界定資料生命週期；短期以定期快照或 export API 降低資料遺失風險。
-- **R3：測試覆蓋不足** — 前端核心模組尚未建立單元測試；待 `make tests` 輸出草案後補齊。
-- **R4：速率限制策略未定義** — 需與 DevOps 協作決議（應用層 vs. 反向代理）；在實作前於 PRD 標註 TODO 避免誤解。
+- **R1：批次提交尚未實作** — 需在 G 節點列為阻塞；優先補後端與前端佇列邏輯。
+- **R2：Service Worker 相容性** — Safari 對背景同步限制較多；必要時提供手動重送 UI。
+- **R3：記憶體儲存易遺失** — 在 M 完成前，排定定時 snapshot 機制，並於 README 註明風險。
+- **R4：遙測資料治理未定** — Beta 前與資料團隊確定管道，避免上線後缺乏可觀測性。
+- **R5：LLM 提示不同步** — 任何手動修改骨架/test/docs 需同步更新 `prompts/` 並記錄於 PR。
 
 ## 5. 回溯與維護原則
-- 任何節點失敗須更新本文件狀態並記錄原因；完成回滾後重跑受影響節點。
-- 自動化 prompt 更新必須與文檔同步提交，避免下一輪生成覆蓋手寫內容。
-- `reports/` 內檔案為生成輸出，禁止手動修改；若需補充說明，請在 `docs/` 撰寫備忘錄。
+- 任何節點狀態變更需更新本文件並註明時間/原因；未達 Gate 時禁止推進後續節點。
+- 自動化前需確認 `prompts/` 與最新文檔一致；若差異過大先重跑 `make plan`。
+- `reports/` 產物禁止手動更動；若為排錯臨時產出請另建 `docs/notes/` 說明。
+- 變更契約後務必觸發 `pnpm dlx openapi-typescript` 與後端模型同步，避免前後端衝突。
