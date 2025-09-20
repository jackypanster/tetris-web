# TASKS.md（DAG / 里程碑 / 風險）

## 1. 流程總覽
```mermaid
graph TD
  A[PRD.md] --> B[ARCH.md]
  B --> C[CONTRACT: openapi.yaml]
  C --> D[TASKS.md (DAG/里程碑/風險)]
  D --> E[Skeleton 代碼生成 (Claude)]
  E --> F[測試草案 (Gemini)]
  F --> G[實作 & 重構 (Claude)]
  G --> H[交叉審查 (Codex ↔ Claude)]
  H --> I[工具閘門: lint/type/cover/perf]
  I --> J[文檔派生 (Gemini)]
  J --> K[最終驗收包 (Codex JSON)]
  K -->|未達標| F
  I -->|未過| F
```

## 2. 節點詳解
| 節點 | 說明 | 主要輸入 | 產出 | Gate 條件 | 風險 | 回滾策略 |
|---|---|---|---|---|---|---|
| A | 定義產品需求（`docs/PRD.md`），同步遊戲規格、後端範圍、非功能指標。 | 市場假設、`docs/HANDBOOK.md` §4/11 | 已簽核 PRD 草案 | PM/Tech Lead 確認；Acceptance A-001~A-007 映射完成 | 需求缺漏；與架構不一致 | 回退至上一版 PRD，更新需求並重跑 A→K |
| B | 確立架構（`docs/ARCH.md`），拆分前端/後端模塊與依賴。 | PRD、Handbook §5 | 版本化架構說明 | 架構評審通過；模塊責任清晰 | 模塊邊界模糊；漏掉監控/安全 | 退回 A，修正 PRD/ARCH 後再行 B→K |
| C | 契約設計（`docs/openapi.yaml`），提供高分榜 API SSOT。 | PRD、ARCH、Handbook §6 | 簽核的 OpenAPI 契約 | JSON Schema 驗證通過；示例請求跑通 | 契約與實作偏離；廢棄欄位 | 回滾至上版契約，通知前端重新生成 |
| D | 任務圖（本文件），列出 DAG、風險、回滾。 | PRD、ARCH、OpenAPI、Handbook §3 | 更新的 TASKS 表與 Mermaid | 各節點具 inputs/outputs/gates/risks | DAG 遮蔽外部依賴；責任不清 | 回退到先前 TASKS，補充欄位後重審 |
| E | 生成骨架（`make skeleton` → Claude），同步補齊 `web/` 前端與 `src/` 後端基礎檔。 | PRD、ARCH、openapi、prompts/skeleton | 初始程式骨架 + TODO 標註 | 產生檔案僅限 web/src；Lint/type 檢查可通過 | 骨架覆蓋手寫程式；越權改檔 | 重置至最近穩定 commit，調整 prompts 後重跑 |
| F | 測試草案（`make tests` → Gemini），建立 Pytest 並為前端預留 Vitest/Playwright 草案。 | OpenAPI、TESTPLAN、TASKS | `tests/` + fixtures 標註 CONTRACT 條款 | 生成的測試可執行或留 TODO；契約標註齊全 | 自動測試與程式結構不匹配 | 恢復前一版 tests，改寫 prompt 或手動補齊 |
| G | 實作與重構（`make impl` → Claude 或人工）。 | Skeleton、Tests、TASKS Ready 節點 | 變更程式 + 補測試 | 單元/整合測試綠燈；Review 無阻塞 | LLM 誤改契約；覆蓋手動更動 | git revert 本節點提交，更新 DAG 後重跑 |
| H | 交叉審查（`make review` → Codex / 手動 code review）。 | G 產出、測試結果 | `reports/review_codex.md` + Review 記錄 | 高風險缺陷清零；建議已處理或列入 TODO | 審查流於形式；漏掉性能問題 | 回到 G 重實作/補測試，再觸發審查 |
| I | 工具閘門（`make gate` → `tools/gate.sh`）。 | 代碼倉庫、`pnpm`/`uv` 指令 | Lint/型別/測試/覆蓋率輸出 | 覆蓋率 ≥80%/70%，lint/type 0 錯 | 閘門耗時、資源不足 | 調整 gate 腳本或拆批執行；失敗即回到 G |
| J | 文檔派生（`make docs` → Gemini），生成 `docs/api.md` 等。 | 契約、程式註釋、Handbook 指南 | API 文檔 + Quickstart | Docs build 成功；手寫區塊保留 | 自動文檔覆蓋手寫內容 | 手動合併，或恢復手寫塊再 rerun |
| K | 驗收（`make accept` → Codex），對照 `docs/Acceptance.md`。 | 測試輸出、Acceptance 準則 | `reports/acceptance.json` | 所有 A-001~A-007 為 Pass | 驗收輸出不可信；缺少證據 | 重跑 F→I 取得證據，再 rerun K |

## 3. 里程碑節點
- **M1：設計凍結**（完成 A+B+C+D）— PRD/ARCH/Contract 同步就緒。
- **M2：Alpha 可跑**（完成 E+F+G）— 骨架、測試、自動化基本通過。
- **M3：Beta 驗證**（完成 H+I）— 審查與閘門綠燈。
- **M4：發佈包**（完成 J+K）— 文檔落地、驗收檔案輸出。

## 4. 追蹤與維護
- 每次迭代須更新本檔案的節點狀態與風險欄位，確保 DAG 可追溯。
- 若新增節點（如性能基準、滲透測試），請同步更新 Mermaid、表格與里程碑。
- 所有自動化提示詞修改後需重新跑對應 `make` 目標，並在 PR 描述中標註。
