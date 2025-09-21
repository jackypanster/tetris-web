# ARCH.md — Tetris Web 版（2025-09）

本文件敘述前後端的實際實作結構與資料流。產品範圍請參考 `docs/PRD.md`，測試與驗收詳見 `docs/TESTPLAN.md`、`docs/Acceptance.md`。

## 1. 系統概覽
```
+------------------+            +---------------------------+
|  Browser (SPA)   |  HTTP JSON |   FastAPI Highscore API   |
|  Vite + TypeScript| <--------> |   (in-memory repository)  |
+------------------+            +---------------------------+
        |                                   |
        | localStorage queue                | process memory (volatile)
        v                                   v
   OfflineScoreQueue                 MemoryScoreRepository
```
- 前端負責遊戲邏輯、畫面與 API 呼叫；若請求失敗則將分數寫入本地佇列並週期性重送。
- 後端提供 `/scores` 與 `/scores/bulk`，以記憶體列表存放排行榜資料；重啟後資料會被清除。

## 2. 前端組成（web/）
| 區塊 | 主要檔案 | 職責摘要 |
|------|----------|-----------|
| 遊戲核心 | `core/game.ts` | 管理棋盤、方塊生成、下一顆預覽與分數計算；提供 `GameSnapshot` 給 UI。 |
| 入口與 UI | `main.ts`、`style.css` | 建立左側資訊＋中間棋盤＋右側排行榜布局，負責按鈕、鍵盤事件與面板更新。 |
| API 存取 | `net/score-client.ts`、`net/client-factory.ts`、`net/offline-queue.ts` | 依 `import.meta.env.VITE_API_BASE_URL` 推導 base URL，提交單筆/批次分數並處理 429/timeout；`OfflineScoreQueue` 透過 `localStorage` 與 `setInterval` 管理待送分數。 |
| 其他模組 | `analytics/`、`render/`、`state/` 等 | 目前提供簡化占位（統一回傳/顯示基礎資訊），未啟用的功能會在後續迭代補完。 |

## 3. 後端組成（src/）
| 區塊 | 主要檔案 | 職責摘要 |
|------|----------|-----------|
| 應用入口 | `main.py` | 建立 FastAPI 應用、設定 CORS、掛載 `/scores` router 與 `/healthz` 健康檢查。 |
| 路由層 | `routers/scores.py` | 定義 `/scores` GET/POST 與 `/scores/bulk`，套用簡易 token bucket 限流、回傳 `ScoreWindow`。 |
| 業務邏輯 | `services/score_service.py` | 驗證暱稱/分數，呼叫儲存層，組裝批次提交結果。 |
| 儲存層 | `repositories/memory.py` | 使用 Python list 儲存排序後的分數，提供清除過期資料的輔助方法。 |
| 資料模型 | `models.py` | Pydantic v2 模型，與 `docs/openapi.yaml` 的 schema 字段一致。 |

## 4. 資料流細節
1. **排行榜載入**：`main.ts` 初始化時呼叫 `ScoreClient.getScores(limit=10)`，成功後將結果渲染於右側列表。
2. **遊戲結束**：`TetrisGame` 透過回呼傳回 `GameSessionResult`，前端組成 `ScoreInput`。
3. **上傳與佇列**：
   - 在線：`OfflineScoreQueue.enqueueScore` 會先嘗試 `submitScore`，成功即更新排行榜。
   - 離線或失敗：分數以 `localStorage`（Key `tetris-score-queue`）保存，並更新佇列統計。
   - 每分鐘或 `window.online` 事件觸發時呼叫 `submitScoresBulk`，伺服器回傳成功/失敗明細。
4. **健康檢查**：`/healthz` 用於左側狀態面板判斷伺服器是否可用。

## 5. 執行與設定
- 前端開發：`cd web && pnpm install && pnpm run dev`（預設連線 `http://localhost:8000`）。
- 後端開發：`uv sync && uv run fastapi dev src/main.py --reload`，記憶體儲存會在進程結束後清空。
- 建置：`pnpm run build`、`uv run fastapi run src.main:app --host 0.0.0.0 --port 8000`。
- 可設定 `VITE_API_BASE_URL` 指向部署後的 API；未設定時使用本地端或頁面來源。

## 6. 延伸與風險
- 記憶體儲存在伺服器重啟時遺失資料；需要時改寫成 SQLite 或雲端資料庫。
- 尚未啟用的模組（Service Worker、進階渲染、Telemetry）於未來迭代補齊時需同步更新本文與 PRD。
- 本專案目前僅有最小化手動測試；在擴充功能前需先補上自動化測試與部署流程。
