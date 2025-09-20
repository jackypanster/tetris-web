# TASKS.md（DAG / 里程碑 / 風險）

## 1. 流程總覽
```mermaid
graph TD
  A[PRD.md] --> B[ARCH.md]
  B --> C[CONTRACT: openapi.yaml]
  C --> D[TASKS.md 更新]
  D --> E[Skeleton 代碼生成 (Claude)]
  E --> F[測試草案 (Gemini)]
  F --> G[實作 & 重構 (Claude / 人工)]
  G --> H[交叉審查 (Codex ↔ Claude)]
  H --> I[工具閘門: lint/type/cover/perf]
  I --> J[文檔派生 (Gemini)]
  J --> K[最終驗收包 (Codex JSON)]
  G --> M[資料持久化擴充]
  G --> L[Telemetry / Service Worker]
  M --> H
  L --> H
  K -->|未達標| F
  I -->|未過| F
```

## 2. 節點詳解與狀態
| 節點 | 說明 | 主要輸入 | 產出 | Gate 條件 | 風險 | 回滾策略 | 狀態 |
|---|---|---|---|---|---|---|---|
| A | 定義產品需求（`docs/PRD.md`），同步遊戲規格、設定、排行榜範圍。 | 市場假設、`docs/HANDBOOK.md` §4/11 | PRD v0.3（本次更新） | PM/Tech Lead 確認；Acceptance A-001~A-007 映射完整 | 需求未反映新批次提交或 Service Worker | 回退至上一版 PRD，補齊需求後重跑 A→K | ✅ 已更新 v0.3 |
| B | 確立架構（`docs/ARCH.md`），拆分前端/後端模塊、離線資料流。 | PRD v0.3、Handbook §5 | 架構說明 v0.3 | 架構評審通過；模塊責任清晰 | 模塊邊界模糊、SW 與遙測策略未定 | 回退 A，修正 PRD/ARCH 後再行 B→K | ✅ 已更新 v0.3 |
| C | 契約設計（`docs/openapi.yaml`），提供單/批次提交與排行榜查詢。 | PRD、ARCH、Handbook §6 | OpenAPI 0.3.0 | openapi-cli 驗證；範例請求通過 | 契約與現行實作落差大 | 暫停部署，回退契約並調整計畫 | ✅ 已更新，等待實作同步 |
| D | 任務圖（本文件），列出 DAG、風險、回滾、外掛節點。 | PRD、ARCH、OpenAPI | TASKS v0.3 | DAG 覆蓋所有必須節點；狀態同步 | 表未覆蓋新工作項 | 回退舊版 TASKS，補欄位後重審 | ✅ 已更新 |
| E | 生成骨架（`make skeleton` → Claude），同步補齊 `web/` 與 `src/` 骨架。 | 文檔 v0.3、`prompts/skeleton` | 初始程式骨架 + TODO | 產出檔案受限於 `web/src`、`src/`；Lint/type 可通過 | 骨架覆蓋手寫程式 | 調整 prompts，使用 git revert 回到前一穩定點 | ⏳ 待依據新契約重跑 |
| F | 測試草案（`make tests` → Gemini），建立 Pytest/Vitest/Playwright 草案。 | OpenAPI 0.3、TESTPLAN | `tests/` 草案 + TODO | 測試可執行或明確 TODO；契約標註齊全 | 自動測試與程式結構不匹配 | 恢復前版 tests，調整 prompt 後重跑 | ⏳ 待更新 |
| G | 實作與重構（`make impl` → Claude 或人工）。 | Skeleton、Tests Ready 節點 | 程式變更 + 補測試 | 單元/整合測試綠燈；Review 無阻塞 | LLM 誤改契約；批次提交落地困難 | 使用 feature branch，必要時 revert + 更新 DAG | 🔄 進行中（後端 MVP 已有；需補批次提交、SW） |
| H | 交叉審查（`make review-backend` / `make review-frontend`）— Codex ↔ Claude。 | G 輸出、測試結果 | `reports/review_backend.md`、`reports/review_frontend.md` | 高風險缺陷清零；建議已處理或列 TODO | 審查忽略性能、安全議題 | 回到 G 重實作/補測試，再觸發審查 | ⏳ 未啟動 |
| I | 工具閘門（`make gate-backend` / `make gate-frontend` → `tools/gate.sh`）。 | 代碼倉庫、`uv`/`pnpm` | Lint/type/test/coverage 報告 | 覆蓋率 ≥80%/70%；lint/type 0 錯 | 閘門耗時 / 覆蓋率不足 | 拆批執行、調整測試權重；失敗回到 G | ⏳ 未啟動 |
| J | 文檔派生（`make docs` → Gemini），生成 API/開發者文檔。 | 契約、程式註釋、Handbook | API 文檔 + Quickstart | Docs build 成功；手寫區塊保留 | 自動文檔覆蓋手寫內容 | 手動合併或恢復手寫塊再 rerun | ⏳ 未啟動 |
| K | 驗收（`make accept` → Codex），對照 `docs/Acceptance.md`。 | 測試輸出、Acceptance | `reports/acceptance.json` | 所有 A-001~A-007 Pass | 验收缺少證據 | 回跑 F→I 取得證據後重試 | ⏳ 未啟動 |
| L | Telemetry / Service Worker 強化：SW 快取策略、離線事件緩存、遙測批次。 | PRD v0.3、ARCH v0.3 | SW + analytics 模組 | Playwright 離線案例通過；遙測隊列覆蓋率達標 | 瀏覽器相容性差異 | 拆成瀏覽器專用策略，保留回退 SW 版本 | 🟡 需求已定，待排程 |
| M | 儲存層持久化：SQLite/Redis 達到 Top-N + 14 天策略；批次 API 與資料庫一致。 | PRD、ARCH、OpenAPI | `ScoreRepository` 永久化實作 | 負載測試滿足 P95 < 250ms；資料保留腳本 | DB schema 演進風險 | 使用遷移腳本，必要時回退到記憶體 + 冷備份 | 🟡 需求已定，待排程 |

## 3. 里程碑追蹤
- **M1：設計凍結**（A+B+C+D）— ✅ 完成（v0.3）。
- **M2：Alpha 可跑**（E+F+G 基礎單筆提交）— 🔄 進行中，需重跑 skeleton/tests 以對齊契約。
- **M3：Beta 離線同步**（G 批次提交 + L + M 部分）— ⏳ 未啟動。
- **M4：GA 驗收**（H+I+J+K）— ⏳ 未啟動。

## 4. 風險與對策
- **R1：批次提交尚未實作** — 需在 G 節點列為阻塞；優先補後端與前端佇列邏輯。
- **R2：Service Worker 相容性** — Safari 對背景同步限制較多；必要時提供手動重送 UI。
- **R3：記憶體儲存易遺失** — 在 M 完成前，排定定時 snapshot 機制，並於 README 註明風險。
- **R4：遙測資料治理未定** — Beta 前與資料團隊確定管道，避免上線後缺乏可觀測性。
- **R5：LLM 提示不同步** — 任何手動修改骨架/test/docs 需同步更新 `prompts/` 並記錄於 PR。

## 5. 回溯與維護原則
- 任何節點狀態變更需更新本文件並註明時間/原因；未達 Gate 時禁止推進後續節點。
- 自動化前需確認 `prompts/` 與最新文檔一致；若差異過大先重跑 `make plan`。
- `reports/` 產物禁止手動更動；若為排錯臨時產出請另建 `docs/notes/` 說明。
- 變更契約後務必觸發 `pnpm dlx openapi-typescript` 與後端模型同步，避免前後端衝突。
