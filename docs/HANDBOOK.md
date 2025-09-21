# 開發手冊 — Tetris Web 版（2025-09）

本手冊提供實作與維護本專案的快速指南。功能定義請參考 `docs/PRD.md`，技術結構請參考 `docs/ARCH.md`。

## 1. 專案結構速覽
```
.
├─ docs/      # 產品/架構/測試/驗收文件
├─ web/       # Vite + TypeScript 前端（遊戲/UI/API 客戶端）
├─ src/       # FastAPI 後端（高分榜 API）
├─ tests/     # 預留測試目錄
├─ tools/     # 自訂腳本與 gate.sh（尚未啟用）
└─ Makefile   # 待補：常用指令可集中於此
```

## 2. 開發環境準備
1. 安裝 Node.js 18+、pnpm，以及 Python 3.11（建議使用 `uv` 管理虛擬環境）。
2. 首次啟動：
   ```bash
   cd web && pnpm install
   cd .. && uv sync
   ```
3. 建置 / 靜態檢查：`pnpm run build`；若後端需要型別/格式檢查，可手動執行 `uv run ruff check src`（TODO）。

## 3. 常用指令
| 情境 | 指令 |
|------|------|
| 前端開發伺服器 | `cd web && pnpm run dev`（預設連線 http://localhost:8000） |
| 後端開發伺服器 | `uv run fastapi dev src/main.py --reload` |
| 重新產生 OpenAPI 型別 | `cd web && pnpm run generate:api` |
| 生產建置 | `cd web && pnpm run build`，後端可用 `uv run fastapi run src.main:app --host 0.0.0.0 --port 8000` |

## 4. 開發注意事項
- `web/src/main.ts` 統一掌握 UI 行為與 ScoreClient，修改版面或流程時請同步更新 `docs/PRD.md`。
- 離線佇列採 `localStorage` 儲存；若需清空可在 DevTools 執行 `localStorage.removeItem('tetris-score-queue')`。
- 所有 API 型別以 `docs/openapi.yaml` 為準；變更契約後務必重跑 `pnpm run generate:api` 並更新對應文件。
- 目前未配置 Service Worker、資料庫與自動化測試；若啟用新功能，需同步更新 `docs/TASKS.md`、`docs/TESTPLAN.md` 與 `docs/Acceptance.md`。

## 5. 提交流程建議
1. 進行開發前，檢查 `docs/TASKS.md` 是否有相應待辦項目。
2. 修改程式碼後，手動走完 `docs/TESTPLAN.md` 的 M-01 ~ M-07 檢查。
3. 更新文件與測試結果，於 PR 說明列出已執行的指令與手動檢查項。
4. Commit 建議遵循 Conventional Commits，如 `feat: add next-piece preview`。

## 6. 未來規劃（提醒）
- 引入自動化測試與 CI pipeline，避免手動驗證成為瓶頸。
- 規劃資料庫與部署策略後，於本手冊追加部署章節與環境變數說明。
