# Tetris Web Pipeline
```
.
├─ docs/              # PRD/ARCH/Acceptance/CONTRACT 等文檔
├─ web/               # 前端（Vite + TypeScript）預期位置
├─ src/               # 後端 FastAPI 服務
├─ tests/             # 測試（Pytest + Vitest/Playwright 預留）
├─ tools/             # gate.sh 等輔助腳本
├─ prompts/           # 自動化提示詞（plan/impl/docs/accept 等）
├─ reports/           # LLM 審核輸出（review/acceptance 等）
└─ Makefile           # 編排整條鏈路
```
