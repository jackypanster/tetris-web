# Backend Review

## 缺陷清單
- **High – `/scores/bulk` 超過 50 筆時回傳 422 而非契約要求的 413** (`src/routers/scores.py:105`, `docs/openapi.yaml:138`) [FIXED 2025-09-21]
  - 這版刪除了原本手動檢查 `len(batch_input.items) > 50` 並改由 Pydantic 驗證，但 `ScoreBatchInput` 失敗時 FastAPI 會直接回 422。依據 OpenAPI，超量應回 413 並沿用 `ErrorResponse`。現行實作與新測試 `test_submit_scores_bulk_too_many_items` 都期望 422，會讓依據契約處理 413 的前端或自動化流程行為錯誤。
  - **修復驗證**: 在 `submit_scores_bulk` 端點添加了明確的長度檢查，當超過50項時返回HTTP 413狀態碼；同時更新了相關測試以驗證正確的契約行為。
- **Medium – `X-RateLimit-Reset` header 格式不符契約** (`src/routers/scores.py:32`, `docs/openapi.yaml:52`)
  - 契約描述該 header 為「Unix epoch seconds until the window resets」，但目前以 `str(int(retry_after) + 60)` 回傳固定的剩餘秒數。這不但不是 epoch，也無法真實反映下一個視窗的時間點，客戶端會無法據此計算等待時間。
- **Medium – 新增 `/healthz` 端點未同步更新 OpenAPI** (`src/main.py:31`, `docs/openapi.yaml`)
  - 服務現在提供健康檢查，但契約仍未列出該路徑，導致自動化工具與使用者無法從官方文件得知其存在，違反「docs/ 為單一真相來源」的專案手冊。

## 風險
- 測試治具直接操作 `score_service._repository._scores` 這類私有細節 (`tests/api/test_scores.py:12`)。若未來改成其他 Repository 實作（例如資料庫），測試會失效；建議改成曝露明確的重設掛鉤。

## 修復建議
- **`/scores/bulk` 契約修正**：在進入 service 前重新檢查 `len(batch_input.items) > 50`，以 413 搭配 `ErrorResponse` 回傳，並修正對應測試期待值。
- **Rate limit header**：改以 `int(time.time() + retry_after)`（或等效的 UTC epoch 秒數）設定 `X-RateLimit-Reset`，確保與契約一致，也讓 429 時 `Retry-After` 與 reset 互相對應。
- **文件同步**：將 `/healthz` 路由加入 `docs/openapi.yaml`（路徑、回應結構與標籤），避免實作與契約分岐。
- **測試隔離**：未必需立即修改，但可考慮在 `ScoreService` 暴露重設方法或提供 fixture hook，讓測試不依賴 `_repository._scores` 內部結構。
