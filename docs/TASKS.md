流程 DAG（Mermaid）
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
