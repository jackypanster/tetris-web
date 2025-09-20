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
