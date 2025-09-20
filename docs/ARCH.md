ARCH.md（架構說明）
**前端模塊**：
- `core/`：
  - `Board`（10×20 棋盤 + 消行演算法）
  - `Piece`（方塊形狀/旋轉/SRS 踢牆）
  - `RNG`（Bag-7 隨機）
  - `Scoring`（計分/連擊/B2B）
  - `Game`（狀態機：Spawn/Active/Lock/Clear/Over）
- `input/`：鍵盤事件去抖與連發處理（DAS/ARR 可選）。
- `render/`：Canvas 渲染器（方塊皮膚 + 幀率監控）。
- `net/`：高分榜 API 客戶端（可替換）。
- `ui/`：開始/暫停/重新開始/排行榜視圖。

**後端模塊（可關閉）**：
- `api/`（Node/Express）：
  - POST `/scores` 新增分數
  - GET `/scores` 查詢排行
  - 簡易速率限制 + 輸入校驗 + CORS 設定

**邊界與契約**：
- 唯一事實源：`docs/openapi.yaml`（見下一節）；前端 `net/` 自動從契約生成型別與客戶端（可用 openapi-typescript）。
