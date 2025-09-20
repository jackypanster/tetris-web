# ARCH.md（架構說明）— Tetris Web 版

## 1. 系統概覽
- 單頁式前端（Vite + TypeScript + Canvas）負責遊戲核心、渲染、UI、離線佇列與 Service Worker；後端 FastAPI 僅提供高分榜與遙測入口。
- 預設離線可玩：所有關鍵資源以 Service Worker 預快取，分數與遙測在恢復網路時批次同步。
- 合約遵循 `docs/openapi.yaml`，任何契約變更需先更新文檔再驅動骨架/測試/實作。

## 2. 系統脈絡與資料流
```
+-----------------+    Canvas/Input    +------------------+
|  Browser (SPA)  |<------------------>|  Keyboard/Gamepad|
+-----------------+                    +------------------+
        |
        | HTTP fetch / Background sync (Service Worker)
        v
+-----------------+    HTTPS/JSON     +-------------------+
|  Frontend SW    | <---------------> | FastAPI (uvicorn) |
+-----------------+                    +-------------------+
        |                                      |
        | IndexedDB (Scores queue, config)     | Storage adapter (memory → DB)
        v                                      v
+-----------------+                    +-------------------+
|   Replay/Cache  |                    | Telemetry Sink    |
+-----------------+                    +-------------------+
```
- 前端透過 `ScoreClient` 呼叫 `/scores` 與 `/scores/bulk`；Service Worker 提供背景重送與離線快取。
- FastAPI 透過 `ScoreService` 封裝儲存層，可替換為 SQLite/Redis；遙測寫入後端紀錄器或未來訊息佇列。

## 3. 前端模組切分（`web/src/`）
- `core/`
  - `board.ts`：網格狀態、行消演算法、垃圾行注入接口。
  - `piece.ts`：七種方塊資料、旋轉/牆踢表、180° 旋轉旗標。
  - `rng.ts`：Bag-7 隨機器，支援固定種子與迭代器模式。
  - `scoring.ts`：計分、Combo/B2B、Perfect Clear、統計輸出。
  - `game.ts`：狀態機 `Spawn → Active → Lock → Clear → GameOver`，可注入時鐘與輸入。
- `input/`
  - `keyboard.ts`：DAS/ARR、連按緩衝、可重綁定解析。
  - `controller.ts`（待擴充）：手柄事件 normalize。
- `render/`
  - `canvas_renderer.ts`：Canvas 2D 渲染；以層（背景、網格、方塊、Ghost、HUD）劃分；支援高 DPI。
  - `hud.ts`：HUD 與 Overlay；接受 game state snapshot。
- `state/`
  - `store.ts`：集中管理設定、排行榜、遊玩統計；使用 RxJS 或輕量自定 store；支援 time-travel（Debug）。
  - `persist.ts`：LocalStorage/IndexedDB 存取抽象。
- `net/`
  - `score-client.ts`：根據 OpenAPI 生成型別，封裝單筆與批次提交、退避策略、速率限制 header 解析。
  - `telemetry-client.ts`（預留）：上傳遙測事件。
- `workers/`
  - `service-worker.ts`：資源快取、背景同步、待送隊列重送。
- `ui/`
  - `App.tsx` or `App.ts`：組合遊戲核心與 UI 派生。
  - `panels/`：設定面板、排行榜對話框、教學 Overlay。
- `analytics/`：事件緩存與批次上報。
- 測試：Vitest 覆蓋核心模組；Playwright 覆蓋整體流。

## 4. 後端模組切分（`src/`）
- `main.py`：建立 FastAPI app、註冊 CORS、時區設定、健康檢查、metrics endpoint（待實作）。
- `routers/scores.py`：
  - `GET /scores`：支援 `limit`、`cursor`、`since`；回傳 `ScoreWindow`。
  - `POST /scores`：單筆提交，執行暱稱審核與速率限制檢查。
  - `POST /scores/bulk`：批次提交，逐筆驗證，失敗項目回報。
- `services/score_service.py`：
  - 抽象儲存介面 `ScoreRepository`，初期為記憶體實作，預留 SQLite 驅動。
  - 套用業務規則（重複提交、異常值偵測、保留政策）。
- `repositories/`（新增）：
  - `memory.py`：現有列表；
  - `sqlite.py`（待建）：排序插入與 GC 任務。
- `models.py`：Pydantic 模型與 DTO；提供 alias 與 `ConfigDict` 控制；與 OpenAPI 同步。
- `rate_limit/`（預留）：簡易 Token Bucket 或整合外部中介層。
- `telemetry/`（預留）：遙測事件緩存與批次寫入。
- 測試：Pytest covering happy path（200/201/207/400/429/500）與邏輯測試。

## 5. 資料契約與型別同步
- `docs/openapi.yaml` 為唯一契約；版本以 `semver` 進位（目前 0.3.0）。
- 前端以 `pnpm dlx openapi-typescript` 產生型別至 `web/src/net/types.ts`；變更時需重新生成。
- 後端透過 Pydantic `model_config` 與 `alias_generator` 保持 snake_case ↔ camelCase 映射。
- 批次提交回應 207 Multi-Status（JSON body 詳列成功/失敗）。

## 6. 執行環境與部署
- **開發**：
  - 前端：`pnpm install && pnpm run dev`；支援 `pnpm run test -- --watch`。
  - 後端：`uv sync && uv run fastapi dev src/main.py --reload`。
- **測試**：`make gate` 執行 ESLint、Prettier、Vitest、Ruff、Mypy、Pytest；Playwright 於 CI 內執行 headless。
- **部署**：
  - 前端靜態資源以 Vite build → CDN（Netlify/Vercel/S3）。
  - 後端以 uvicorn + gunicorn 或容器部署；需設定環境變數：`MAX_LIMIT`、`RETENTION_DAYS`、`BATCH_SIZE_LIMIT`。
  - 遙測/日誌匯出：stdout JSON + 可選 OpenTelemetry。

## 7. 品質屬性與守護策略
- **性能**：
  - 迴圈分離邏輯與渲染（requestAnimationFrame + 固定步長模擬）。
  - 使用 OffscreenCanvas（可選）以降低主執行緒阻塞。
  - 後端排序採優先佇列或索引查詢；批次插入需 O(n log n)。
- **可靠性**：
  - 前端 State Store 使用事件溯源紀錄，可回放錯誤案例。
  - 後端提供健康檢查 `/healthz` 與自監控；記憶體儲存需快照備份機制（定期 dump 至磁碟）。
- **安全**：
  - 暱稱審查（正規化 + 禁詞表）；速率限制 + 指紋 heuristics。
  - CORS 只允許前端來源；所有回應含 `X-Content-Type-Options` 與 `Cache-Control`。
- **可觀測性**：
  - 前端使用 Web Vitals 與自定事件（透過 `analytics/` 模組）上報。
  - 後端暴露 Prometheus metrics（`/metrics`），記錄 `scores_submitted_total`、`rate_limit_block_total` 等。

## 8. 開發流程與自動化
- `Makefile` 任務：
  - `make plan` 更新文檔（本次手動執行）。
  - `make skeleton` 刷新前後端骨架。
  - `make tests` 生成測試草案（Gemini）。
  - `make impl` 負責實作 / 重構。
  - `make gate` 呼叫 `tools/gate.sh` 進行 lint/type/test。
  - `make docs` / `make accept` 生成文檔與驗收報告。
- 所有 LLM 生成前需更新對應 `prompts/`，並在 PR 紀錄來源工具與版本。

## 9. 演進路線
- **短期**：補齊批次提交、Service Worker、SQLite 儲存、遙測骨架。
- **中期**：引入 Replay 下載、每日挑戰種子回溯、排行榜分頁。
- **長期**：考慮多玩家對戰模式、排行榜作弊偵測模型、跨裝置同步。

## 10. 開放問題
- 速率限制最終是否交由反向代理（NGINX/Cloudflare）或應用層？需與基礎設施團隊確認。
- 遙測資料最終落點（S3 vs. 時序資料庫）與保留政策尚待定，必須在 Beta 前鎖定。

## 11. 附件
- 相關契約：`docs/openapi.yaml`
- 測試計畫：`docs/TESTPLAN.md`
- 驗收準則：`docs/Acceptance.md`
