# LLM 多模型流水線手冊（以「網頁版俄羅斯方塊」為演練項目）

> 目標：將「Codex 規劃/驗收 × Claude 實作 × Gemini 文檔/測試」沉澱為**可重現、可審計、可回滾**的工程套路；以 Tetris Web 版作為端到端試跑。

---

## 0. TL;DR（十分鐘可跑通）
1. **契約先行（SSOT）**：以 `docs/openapi.yaml`（高分榜 API）作為唯一事實源，驅動骨架、測試、文檔。
2. **任務圖（DAG）**：把規劃→骨架→實作→測試→文檔→驗收串成可重跑任務；每步有通過條件（gate）。
3. **雙層評審**：LLM 互審（Codex ↔ Claude）+ 工具閘門（lint/type/覆蓋率/小性能基準）。
4. **安全默認**：白名單工具、沙箱寫入、最小權限；產物與提示詞全部入庫。

---

## 1. 目錄結構約定
```
.
├─ docs/              # PRD/ARCH/Acceptance/CONTRACT（本手冊內文即其初稿）
├─ prompts/           # 模板化提示詞（plan/impl/docs/accept 等）
├─ reports/           # LLM 審核輸出（review/acceptance 等）
├─ src/               # 源碼（TypeScript + Canvas）
├─ tests/             # 測試（Vitest/Jest + Playwright 可選）
├─ tools/             # gate.sh 等輔助腳本
└─ Makefile           # 或 Justfile，編排整條鏈路
```

---

## 2. 工具與安全策略
- **Codex CLI**：規劃/審核/生成差異補丁；建議 `--sandbox workspace-write` + `-a on-failure`（或 `--full-auto`）。
- **Claude Code CLI**：增量實作/重構；建議僅允許 `Edit` 類工具；必要時用 `--print` 只輸出 diff。
- **Gemini CLI**：文檔/測試生成；建議 `--approval-mode auto_edit` 僅寫入 `docs/`、`tests/`。
- **禁令**：嚴禁非白名單 shell 操作；所有自動改檔限定在既定目錄；所有提示詞、輸出入統一版本化。

---

## 3. 流程 DAG（Mermaid）
```mermaid
graph TD
  A[PRD.md] --> B[ARCH.md]
  B --> C[CONTRACT: openapi.yaml]
  C --> D[TASKS.md (DAG/里程碑/風險)]
  D --> E[Skeleton 代碼生成 (Claude)]
  E --> F[測試草案 (Gemini)]
  F --> G[實作&重構 (Claude)]
  G --> H[交叉審查 (Codex ↔ Claude)]
  H --> I[工具閘門: lint/type/cover/perf]
  I --> J[文檔派生 (Gemini)]
  J --> K[最終驗收包 (Codex JSON)]
  K -->|未達標| F
  I -->|未過| F
```

---

## 4. PRD.md（產品需求說明）— Tetris Web 版
**目標**：實現在桌面瀏覽器可 60FPS 流暢運行的 Tetris，提供高分榜後端 API，支持本地離線遊玩。

**核心玩法**：
- 10×20 棋盤，7 種方塊（I, O, T, S, Z, J, L），**Bag-7** 隨機器。
- 旋轉系統採用 **簡化 SRS**，含牆踢；支持 **soft drop / hard drop**；鎖定延遲（~500ms 可調）。
- 計分規則：單/雙/三/四消（Tetris）分值遞增；連擊/Back-to-Back 加成可選。
- 升級節奏：每若干行加速；目標 FPS ≥ 60，輸入延遲 P95 ≤ 16ms。

**最小可行後端**：
- 高分榜（匿名暱稱 + 分數 + 版本 + 客戶端指紋簡要），僅存近 14 天或 Top-N；可關閉。

**非功能性約束**：
- **性能**：常規 1080p/60Hz 裝置下，渲染與邏輯合計 < 16ms/frame。
- **可測性**：旋轉、消行、隨機器、鎖定延遲、計分均有單元測試；E2E 檢驗核心操作序列。
- **安全/隱私**：高分榜不得存儲個人敏感信息；輸入需基本校驗與速率限制。
- **可觀測**：最少矩陣：行消次數、平均下落速度、最大連擊、渲染耗時分佈（開發模式）。

**平台與技術**：TypeScript + HTML Canvas（或 WebGL 可選），Vite 構建；FastAPI + uv 部署高分榜 API。

---

## 5. ARCH.md（架構說明）
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
- `api/`（FastAPI/uv）：
  - `app/main.py` 暴露 `app = FastAPI(...)`；本地以 `uv run fastapi dev --reload` 啟動，部署時使用 `uv run fastapi run`（封裝 uvicorn）。
  - POST `/scores` 新增分數
  - GET `/scores` 查詢排行
  - 速率限制、輸入校驗與 CORS 設定集中於 `api/deps.py` 或對應中介層；依賴透過 `pyproject.toml` + `uv.lock` 管理。

**邊界與契約**：
- 唯一事實源：`docs/openapi.yaml`（見下一節）；前端 `net/` 自動從契約生成型別與客戶端（可用 openapi-typescript）。

---

## 6. CONTRACT — `docs/openapi.yaml`（高分榜 API）
```yaml
openapi: 3.0.3
info:
  title: Tetris Web Highscore API
  version: 0.1.0
servers:
  - url: https://api.example.com
paths:
  /scores:
    get:
      summary: List top scores
      parameters:
        - in: query
          name: limit
          schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items:
                      $ref: '#/components/schemas/Score'
    post:
      summary: Submit a score
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ScoreInput'
      responses:
        '201': { description: Created }
        '400': { description: Bad Request }
components:
  schemas:
    Score:
      type: object
      required: [id, nickname, points, createdAt, client]
      properties:
        id: { type: string }
        nickname: { type: string, minLength: 1, maxLength: 16 }
        points: { type: integer, minimum: 0 }
        createdAt: { type: string, format: date-time }
        client:
          type: object
          properties:
            version: { type: string }
            ua: { type: string, maxLength: 128 }
    ScoreInput:
      type: object
      required: [nickname, points]
      properties:
        nickname: { type: string, minLength: 1, maxLength: 16 }
        points: { type: integer, minimum: 0 }
        client:
          type: object
          properties:
            version: { type: string }
            ua: { type: string, maxLength: 128 }
```

---

## 7. TESTPLAN.md（測試計劃）
**覆蓋矩陣**（示意）：

| 類別 | 目標 | 測試 | 通過條件 |
|---|---|---|---|
| 旋轉 | SRS 踢牆 | `tests/rotate_srs.spec.ts` | 所有踢牆用例通過 |
| 隨機 | Bag-7 | `tests/rng_bag7.spec.ts` | 任意 14 顆內包含兩套完整七子，且無重覆率異常 |
| 消行 | 單/雙/三/四 | `tests/clear_lines.spec.ts` | 棋盤/分數一致 |
| 鎖定 | 鎖定延遲 | `tests/lock_delay.spec.ts` | 延遲視窗內移動/旋轉有效 |
| 分數 | 加成規則 | `tests/scoring.spec.ts` | 分值計算符合 PRD |
| E2E | 核心操作序列 | `e2e/play.spec.ts` | 在 30s 內完成 Tetris 一次 |
| API | scores CRUD | `tests/api_scores.spec.ts` | 200/201/400 分支覆蓋 |
| 性能 | 60FPS | `tests/perf.spec.ts` | P95 < 16ms/frame（開發機） |

**工具與閾值**：行覆蓋 ≥ 80%，分支 ≥ 70%；禁止未使用變數；循環複雜度上限（可由 ESLint 規則約束）。

---

## 8. Acceptance.md（驗收準則）
- **A-001**：10×20 棋盤與 7 子完整；旋轉/掉落/鎖定/消行行為符合 PRD。
- **A-002**：Bag-7 隨機器統計達標（見 TESTPLAN）。
- **A-003**：計分/加成準確；邊界值（超長連擊、極端旋轉）無崩潰。
- **A-004**：API 契約符合 `openapi.yaml`；錯誤輸入返回 400。
- **A-005**：性能 P95 < 16ms/frame；鍵盤輸入延遲 P95 < 16ms。
- **A-006**：單元/整合/E2E 覆蓋率達標；CI 綠燈。
- **A-007**：`docs/api.md` 與 UI 一致；Quickstart 可 3 分鐘內跑起來。

---

## 9. Makefile（或 Justfile）
```makefile
.PHONY: plan skeleton tests impl review gate docs accept all

plan:
	codex --full-auto -C . \
	  "生成/更新 docs/PRD.md, docs/ARCH.md, docs/openapi.yaml, docs/TASKS.md"

skeleton:
	claude --allowed-tools "Edit" --permission-mode acceptEdits -C . \
	  "根據 docs/openapi.yaml 生成 src/ 最小骨架與接口桩，不越界目錄；若缺 README/配置一併補齊"

tests:
	gemini --approval-mode auto_edit -C . \
	  "依據 docs/TESTPLAN.md 與 CONTRACT，生成 tests/ 與測試數據；每條測試標註 CONTRACT 條款"

impl:
	claude --allowed-tools "Edit" --permission-mode default -C . \
	  "只實作 TASKS.md 已就緒節點，最小提交，必要時補測試；不直接修改 CONTRACT"

review:
	codex exec --sandbox read-only -C . \
	  "審查本次變更，輸出 reports/review_codex.md（缺陷清單/風險/修復建議）"

gate:
	bash tools/gate.sh

docs:
	gemini --approval-mode auto_edit -C . \
	  "從 CONTRACT 與代碼註釋派生 docs/api.md + Quickstart；保留 <!-- MANUAL --> 區塊"

accept:
	codex exec --sandbox read-only -C . \
	  "對照 Acceptance.md 生成 reports/acceptance.json（機器可讀：id/status/evidence/fix/severity）"

all: plan skeleton tests impl review gate docs accept
```

**`tools/gate.sh`**（示例）：
```bash
#!/usr/bin/env bash
set -euo pipefail
# TypeScript 前端 + FastAPI 後端（uv 管理）
uv sync
uv run ruff check api
uv run mypy api
uv run pytest --maxfail=1 --disable-warnings
if command -v pnpm >/dev/null; then
  pnpm install --frozen-lockfile
  pnpm lint
  pnpm test -- --maxWorkers=50% --passWithNoTests=false
fi
# 可選：semgrep/bandit/license 掃描
```

---

## 10. prompts/（模板）
**`prompts/plan.md`**（節選）
```
目標：為當前代碼庫產出 PRD.md、ARCH.md、openapi.yaml、TASKS.md（DAG）
非功能：性能(延遲P95/吞吐)、安全(PII遮罩/審計)、可測性、可觀測性
要求：
- 文件可機器檢查且自包含
- DAG 每節點含 inputs/outputs/gates/risks/rollback
- 若發現需求矛盾→輸出 ADR 選項與取捨
```

**`prompts/impl.md`**（節選）
```
你是資深重構工程師。僅針對 TASKS.md 節點 {ID}：
- 讀 CONTRACT/ARCH，補齊 src/ 骨架，遵循 style 規範
- 如需改 CONTRACT，先輸出 ADR 草案，不直接改碼
- 每步最小提交，必要時補測試並標註原因
```

**`prompts/docs.md`**（節選）
```
輸入：openapi.yaml + 源碼註釋
輸出：docs/api.md（請求/響應示例、錯誤碼、Quickstart）
保留含 <!-- MANUAL --> 的區塊
```

**`prompts/accept.md`**（節選）
```
輸入：Acceptance.md、測試/覆蓋率/靜態分析輸出
輸出：reports/acceptance.json：[{id, status, evidence[], fix, severity}]
```

---

## 11. Tetris 需求細化（便於 Claude 實作）
- **棋盤/方塊**：
  - `Board`：二維陣列 + 消行判定 + 行下沉；
  - `Piece`：形狀矩陣 + 旋轉表 + 踢牆表（簡化 SRS）。
- **隨機器**：`Bag7`：每包七子亂序，取空則重置新包；
- **狀態機**：`Spawn → Active → Lock → Clear → Over`；支持暫停；
- **控制**：Left/Right（連發），Rotate CW/CCW/180（可選），Soft/Hard Drop，Hold（可選）；
- **渲染**：`render()` 每幀：清屏 → 畫場景 → 畫投影影子（Ghost Piece）；
- **音效/皮膚**：可留空，放入 TODO。

---

## 12. 首次演練步驟（建議流程）
1. **初始化 Repo**：
   ```bash
   git init tetris-web && cd tetris-web
   echo "node_modules\n.dist\n.cache" > .gitignore
   ```
2. **落地本手冊**：把本 markdown 存為 `docs/HANDBOOK.md`，提交一次。
3. **`make plan`**：由 Codex 生成/補齊 `docs/PRD.md / ARCH.md / openapi.yaml / TASKS.md`（初稿可直接沿用本手冊片段）。
4. **`make skeleton`**：讓 Claude 生成 `src/` 骨架與最小可跑入口（Vite + TS）；如需，先行：
   ```bash
   pnpm create vite@latest . -- --template vanilla-ts || npm create vite@latest . -- --template vanilla-ts
   ```
5. **`make tests`**：讓 Gemini 生成單元測試（旋轉/消行/隨機/計分）與 fixtures。
6. **`make impl`**：Claude 針對 TASKS 中“就緒”節點實作（例如 `core/Board` + `core/Piece`）。
7. **`make gate`**：跑 lint/type/test 規則；不過則回到 `impl`。
8. **`make docs`**：Gemini 從契約派生 `docs/api.md` 與 Quickstart。
9. **`make review`**：Codex 產生審查報告；
10. **`make accept`**：Codex 產出機器可讀驗收 JSON；若未通過，回到第 6 步。

---

## 13. 風險與回滾
- **文檔覆蓋人工內容**：手寫區塊標 `<!-- MANUAL -->`；提示詞要求保留。
- **自動改檔越界**：Claude 僅允許 `Edit`；必要時改為 `--print` 產生 diff，再人工 `git apply`。
- **循環拉長**：在 CI 設定最大循環次數與時間上限；失敗轉入人工審斷。
- **性能不穩**：增加 `tests/perf.spec.ts`，收斂至 P95 指標；渲染降級策略（減少陰影/粒子）。

---

## 14. FAQ / 擴展
- **後端可選**：若無高分榜需求，`openapi.yaml` 仍可保留作為對外擴展契約（如雲存檔）。
- **E2E 測試**：後續可引入 Playwright 錄製核心操作序列；測 FPS 可在開發模式注入計時器。
- **觀測**：開發模式輸出簡單統計（平均幀耗時/最大連擊），避免上線收集個資。
- **替換模型**：本套路與模型無耦合，只要 CLI 兼容即可；建議將提示詞與配置獨立版本管理。

