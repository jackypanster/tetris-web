# Repository Guidelines

## Project Structure & Module Organization
- `docs/`: PRD, architecture, acceptance notes, and `openapi.yaml`; treat as single source of truth.
- `prompts/`: agent prompt templates; tweak before re-running automation.
- `reports/`: generated reviews/acceptance outputs; leave unedited.
- `web/`: Vite + TypeScript 前端（game core/render/ui 等）；若不存在則先補骨架。
- `src/`: FastAPI 後端；入口 `src/main.py`，依賴由 `pyproject.toml` 管理。
- `tests/`: Pytest（後端）與 Vitest/Playwright 預留位置，檔案需標註 CONTRACT 條款。
- `tools/`: helper scripts such as the planned `gate.sh`.
- `Makefile`: orchestrates the pipeline; prefer targets over ad-hoc commands.

## Build, Test, and Development Commands
- `make plan`: refresh PRD/ARCH/openapi docs via Codex.
- `make frontend-init`: 若 `web/package.json` 不存在，利用 Vite 初始化前端骨架。
- `make skeleton`: 讓 Claude 同步生出 `web/` 與 `src/` 的骨架，遵循 PRD/ARCH。
- `make tests`: Gemini 產生 Pytest + 前端測試草案（前端缺模塊可留 TODO）。
- `make impl`: 實作已就緒節點；`make review` / `make accept` 產出 QA 與驗收報告。
- `make gate`: 執行 `tools/gate.sh`（uv + pnpm 條件式檢查）；`make all` 串完整流程。
- `backend-dev`: `uv run fastapi dev src/main.py --reload`；`frontend-dev`: 進入 `web/` 後 `pnpm run dev`。

## Coding Style & Naming Conventions
Frontend：採 TypeScript ES modules，2 空格縮排與分號，類/檔案 PascalCase（`Board.ts`），工具函式 kebab-case（`bag-rng.ts`）；對應 schema 以 `docs/openapi.yaml` 為準。後端：`src/` 內使用 snake_case 模組，FastAPI 路由搭配 Pydantic 模型。格式化採 Prettier/ESLint（前端）與 Ruff/Black/Mypy（後端，透過 `uv run`）。

## Testing Guidelines
所有測試需對應 `docs/TESTPLAN.md`；每檔案冒頭標註 CONTRACT 條款。Pytest 覆蓋後端 API，Vitest/Playwright 覆蓋前端邏輯與 E2E（無前端時可暫留 TODO）。提交前至少跑 `make tests`、`uv run pytest`、`make gate`，並附上覆蓋率輸出或跳過理由。

## Commit & Pull Request Guidelines
Adopt Conventional Commits (`feat:`, `fix:`, `chore:`) to keep automation predictable and mention `docs/TASKS.md` IDs or Acceptance checkpoints in bodies. PRs need a concise summary, linked issues, screenshots for UI tweaks, and a checklist of commands run (`make gate`, local test runner). Flag manual edits to generated files in the description so reviewers can re-run tooling.

## Agent Workflow Notes
This repository assumes a Codex→Claude→Gemini loop; when working manually, update the relevant prompt in `prompts/`, rerun its `make` target, then commit the diff. Avoid silent edits to generated docs/tests—if you must patch them, record the rationale in the PR and refresh upstream prompts to prevent regressions.
