# Repository Guidelines

## Project Structure & Module Organization
- `docs/`: PRD, architecture, acceptance notes, and `openapi.yaml`; treat as single source of truth.
- `prompts/`: agent prompt templates; tweak before re-running automation.
- `reports/`: generated reviews/acceptance outputs; leave unedited.
- `src/` + `tests/`: TypeScript implementation and Vitest/Playwright suites; mirror module paths, e.g., `src/core/Board.ts` with `tests/core/Board.test.ts`.
- `api/`: FastAPI app managed by `uv`; keep entrypoint at `app/main.py` and shared deps in `pyproject.toml`.
- `tools/`: helper scripts such as the planned `gate.sh`.
- `Makefile`: orchestrates the pipeline; prefer targets over ad-hoc commands.

## Build, Test, and Development Commands
- `make plan`: refresh PRD/ARCH/openapi docs via Codex.
- `make skeleton`: let Claude generate minimal TypeScript skeleton in `src/`.
- `make tests`: ask Gemini to draft contract-backed suites in `tests/`.
- `make impl`: implement ready tasks; `make review` / `make accept` produce QA and acceptance reports.
- `make gate`: run `tools/gate.sh` (add lint/type/coverage there); `make all` chains the loop.
- Backend local dev: `uv sync`, then `uv run fastapi dev --reload`; smoke prod via `uv run fastapi run --port 8000`.

## Coding Style & Naming Conventions
Use TypeScript ES modules with 2-space indentation and semicolons. Name classes/files in PascalCase (`Board.ts`), utilities in kebab-case (`bag-rng.ts`), and align DTOs with `docs/openapi.yaml`. Backend modules stay under `api/`, use snake_case filenames, and annotate FastAPI routes with Pydantic models. Run Prettier/ESLint up front and Ruff/Black/Mypy via `uv run`; note any deliberate deviations in comments.

## Testing Guidelines
Anchor specs to `docs/TESTPLAN.md` and cite the relevant CONTRACT clause per test description. Favor Vitest for logic units, Playwright for canvas/UI flows, and Pytest for API contracts; keep regression artefacts beside new features. Before PRs, rerun `make tests`, `uv run pytest`, and `make gate` to regenerate suites and validate lint/type/coverage.

## Commit & Pull Request Guidelines
Adopt Conventional Commits (`feat:`, `fix:`, `chore:`) to keep automation predictable and mention `docs/TASKS.md` IDs or Acceptance checkpoints in bodies. PRs need a concise summary, linked issues, screenshots for UI tweaks, and a checklist of commands run (`make gate`, local test runner). Flag manual edits to generated files in the description so reviewers can re-run tooling.

## Agent Workflow Notes
This repository assumes a Codex→Claude→Gemini loop; when working manually, update the relevant prompt in `prompts/`, rerun its `make` target, then commit the diff. Avoid silent edits to generated docs/tests—if you must patch them, record the rationale in the PR and refresh upstream prompts to prevent regressions.
