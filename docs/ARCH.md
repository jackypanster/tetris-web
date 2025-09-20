# ARCH.md（架構說明）

## 1. 整體概覽
- 前端：TypeScript + Vite + Canvas（可選 WebGL）渲染核心玩法。
- 後端：FastAPI + uv 管理依賴，暴露高分榜 API，可選部署。
- 契約：`docs/openapi.yaml` 為唯一事實源，驅動骨架、測試、文檔。
- 工具鏈：`Makefile` 串聯 plan → skeleton → tests → impl → gate → docs → accept；`tools/gate.sh` 執行 lint/type/test。

## 2. 前端模組劃分
- `core/`
  - `Board`：管理 10×20 棋盤、行消與行下沉。
  - `Piece`：方塊定義、旋轉表、牆踢資料。
  - `RNG`：Bag-7 隨機器，提供可測種子。
  - `Scoring`：計分、Back-to-Back、連擊邏輯。
  - `Game`：狀態機 `Spawn → Active → Lock → Clear → Over`，處理暫停/重新開始。
- `input/`：鍵盤事件去抖，自定 DAS/ARR；保留接口以支援手柄。
- `render/`：Canvas 渲染器，統計 FPS 與繪製 Ghost Piece。
- `net/`：高分榜客戶端，依 `openapi.yaml` 生成型別；須容錯後端關閉或節流。
- `ui/`：開始/暫停/重玩/排行榜視圖；可插槽式主題。

## 3. 後端模組劃分（可關閉）
- `api/`
  - `app/main.py`：建立 `FastAPI` 實例並掛載路由；本地 `uv run fastapi dev --reload` 啟動，部署用 `uv run fastapi run`。
  - `api/routes/scores.py`：`POST /scores` 與 `GET /scores`，使用 Pydantic 模型對應契約。
  - `api/deps.py`：依賴注入（DB/儲存）、速率限制與 CORS 設定。
  - `api/models.py`：資料模型與持久層抽象，可替換為記憶體或資料庫實作。
- 依賴管理：`pyproject.toml` + `uv.lock`；測試透過 `pytest`、靜態分析使用 `ruff`、`mypy`。

## 4. 數據與契約
- 高分榜請求/回應模型：`ScoreInput` 與 `Score`，欄位詳見 `openapi.yaml`。
- 行為：
  - `POST /scores`：驗證暱稱長度、分數 ≥ 0，回傳 201；對非法輸入回 400。
  - `GET /scores`：支援 `limit` 查詢，預設 10，最大 100；回傳時間序排序的排行榜。
- 客戶端需顯示速率限制/錯誤訊息，並在離線時緩存以供稍後補交（選做）。

## 5. 非功能性設計
- **性能**：前端 render loop 需在 16ms 內完成；後端 API 目標 P95 < 100ms。
- **可測性**：Vitest/Playwright 覆蓋前端；Pytest 覆蓋後端；CI 檢查覆蓋率及靜態分析。
- **安全**：後端限制暱稱字元、速率限制、CORS 白名單；避免儲存敏感資料。
- **可觀測**：開發模式輸出 FPS、行消統計；後端記錄請求計數與錯誤率。

## 6. 部署與運維
- 推薦流程：
  1. `uv sync` 安裝後端依賴；若僅前端可跳過。
  2. `make skeleton/tests/impl` 生成並實作核心功能。
  3. `make gate` 跑 lint/type/test；必要時加入性能基準。
  4. `make docs` 產生 API 文檔，`make review/accept` 形成審核輸出。
- 部署：前端可透過靜態主機（Vite build），後端可部署至容器或 Serverless（需確保 FastAPI 兼容）。
- 回滾策略：依 `docs/TASKS.md` DAG，可在節點失敗時回退至上一穩定輸出並重跑自動化。
