TESTPLAN.md（測試計劃）
**契約對應**：
- CONTRACT 指 `docs/openapi.yaml`；此契約定義高分榜 API 之請求/回應、狀態碼與欄位限制。
- 遊戲規格遵循 `docs/PRD.md` §2-5，驗收標準對照 `docs/Acceptance.md`。

**覆蓋矩陣**：

| 類別 | 目標 | 測試檔 | 框架 | 合格條件 |
|---|---|---|---|---|
| 旋轉 | SRS 踢牆 | `tests/core/rotate_srs.spec.ts` | Vitest | 所有牆踢用例通過；`CONTRACT: PRD §2` |
| 隨機 | Bag-7 | `tests/core/rng_bag7.spec.ts` | Vitest | 任意 14 顆內涵蓋兩輪完整七子；`CONTRACT: PRD §5` |
| 消行 | 單/雙/三/四 | `tests/core/clear_lines.spec.ts` | Vitest | 棋盤與分數一致；`CONTRACT: PRD §2` |
| 鎖定 | 鎖定延遲 | `tests/core/lock_delay.spec.ts` | Vitest | 延遲視窗內移動/旋轉有效；`CONTRACT: PRD §2` |
| 分數 | 加成規則 | `tests/core/scoring.spec.ts` | Vitest | 分值計算符合 PRD；`CONTRACT: PRD §2` |
| E2E | 核心操作序列 | `tests/e2e/play.spec.ts` | Playwright | 30 秒內完成一次 Tetris；`CONTRACT: Acceptance A-001` |
| API | Scores API | `tests/api/test_scores.py` | Pytest | 覆蓋 200/201/400/429；`CONTRACT: openapi.yaml#/paths/~1scores` |
| 性能 | 60FPS | `tests/perf/test_render_perf.py` | Playwright + 監測腳本 | P95 < 16ms/frame；`CONTRACT: PRD §4` |

**工具與閾值**：
- 行覆蓋 ≥ 80%，分支覆蓋 ≥ 70%；前端使用 `pnpm test --coverage`，後端使用 `uv run pytest --cov`。
- 禁止未使用變數；循環複雜度由 ESLint/ruff 規則強制。
- 每個測試檔案冒頭需以註解標明所對應的 CONTRACT 條款，便於審查。
