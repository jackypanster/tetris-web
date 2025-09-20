TESTPLAN.md（測試計劃）
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
