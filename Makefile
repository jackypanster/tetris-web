.PHONY: plan skeleton tests impl impl-backend impl-frontend \
        review review-backend review-frontend \
        gate gate-backend gate-frontend docs accept all \
        backend-install backend-test backend-dev \
        frontend-init frontend-install frontend-build frontend-test frontend-dev setup

FRONTEND_DIR ?= web
BACKEND_MAIN ?= src/main.py
BACKEND_APP ?= src.main:app

plan:
	@echo "==> Gathering planning context..."
	cat docs/HANDBOOK.md docs/PRD.md docs/ARCH.md docs/TASKS.md docs/openapi.yaml > reports/plan_input.md
	@echo "==> Running plan with Codex..."
	codex exec --full-auto --cd . \
	      --model gpt-5-codex \
	      --input-file prompts/plan.md \
	      --input-file reports/plan_input.md \
	      --output-file reports/plan_diff.md \
	      "第一步：在 reports/plan_diff.md 梳理每份文件的擬議變更與理由，維持 Markdown 格式；第二步：根據上述 diff 更新 docs/PRD.md、docs/ARCH.md、docs/openapi.yaml、docs/TASKS.md，保留原有章節與版本號；最後在 diff 中提醒後續需跑 make tests、make impl、make gate 以刷新下游產物。"


skeleton:
	@echo "==> Generating full-stack skeleton with Claude..."
	claude --permission-mode acceptEdits --verbose --allowed-tools "*" --print \
	  "根據 docs/PRD.md 與 docs/ARCH.md，補齊 web/ 前端與 src/ 後端骨架；同步遵循 docs/openapi.yaml 契約，不越界目錄；若缺 README/配置一併補齊"

tests:
	@echo "==> Generating test scaffolds with Gemini..."
	gemini --approval-mode yolo -m gemini-2.5-pro --debug \
	  "依據 docs/TESTPLAN.md 與 docs/openapi.yaml 生成 tests/ 與測試數據；前端無對應模塊時可留 TODO，但仍需標註 CONTRACT 條款"

impl: impl-backend impl-frontend

impl-backend:
	@echo "==> Backend implementation pass..."
	claude --permission-mode acceptEdits --allowed-tools "*" --verbose --print \
	  "僅針對後端（src/ 與 docs/openapi.yaml）：先閱讀 reports/review_backend.md，鎖定其中最嚴重且尚未標註 FIXED 的缺陷；本輪只修復該缺陷，必要時同步補測試與文檔。修復完成後：1) 在原缺陷條目尾端加上 `[FIXED $(shell date +%F)]` 並簡述驗證方式；2) 更新 docs/TASKS.md 對應項為已完成；3) 執行 make gate-backend（或等效 pytest 任務）並保留結果摘要。若需調整契約請先於 docs/ 目錄新增 ADR，再重跑相關 gate。"

impl-frontend:
	@echo "==> Frontend implementation pass..."
	claude --permission-mode acceptEdits --allowed-tools "*" --verbose --print \
	  "僅針對前端（web/）：先閱讀 reports/review_frontend.md，鎖定最嚴重且尚未標註 FIXED 的缺陷；本輪只修復該缺陷並補齊必要測試/文檔。修復完成後：1) 在原缺陷條目尾端加上 `[FIXED $(shell date +%F)]` 與驗證摘要；2) 更新 docs/TASKS.md 對應項為已完成；3) 執行 make gate-frontend 或對應前端測試並記錄結果。若需調整契約請先於 docs/ 目錄新增 ADR，再重跑相關 gate。"

review: review-backend review-frontend

review-backend:
	@echo "==> Backend review with Codex..."
	codex exec --model gpt-5-codex --full-auto --cd . \
          "僅評估本次後端（src/、docs/openapi.yaml、tests/api/ 等）變更，輸出 reports/review_backend.md（缺陷清單/風險/修復建議）"

review-frontend:
	@echo "==> Frontend review with Codex..."
	codex exec --model gpt-5-codex --full-auto --cd . \
          "僅評估本次前端（web/ 與相關測試）變更，輸出 reports/review_frontend.md（缺陷清單/風險/修復建議）"

gate: gate-backend gate-frontend

gate-backend:
	@echo "==> Running backend gate checks..."
	bash tools/gate.sh backend

gate-frontend:
	@echo "==> Running frontend gate checks..."
	bash tools/gate.sh frontend

docs:
	@echo "==> Generating docs with Gemini..."
	gemini --approval-mode yolo -m gemini-2.5-pro --debug \
	  "從 CONTRACT 與代碼註釋派生 docs/api.md + Quickstart；保留 <!-- MANUAL --> 區塊"

accept:
	@echo "==> Running acceptance evaluation with Codex..."
	codex exec --model gpt-5-codex --full-auto --cd . \
	  "對照 Acceptance.md 生成 reports/acceptance.json（機器可讀：id/status/evidence/fix/severity）"

backend-install:
	@echo "==> Syncing backend dependencies (uv)..."
	@if command -v uv >/dev/null 2>&1; then \
		uv sync --extra dev; \
	else \
		echo "   ! 未找到 uv，請先安裝 https://github.com/astral-sh/uv"; \
	fi

backend-test:
	@echo "==> Running backend tests (pytest)..."
	@if command -v uv >/dev/null 2>&1; then \
		uv run pytest; \
	else \
		echo "   ! 未找到 uv，跳過後端測試"; \
	fi

backend-dev:
	@echo "==> Starting backend dev server (FastAPI)..."
	@if command -v uv >/dev/null 2>&1; then \
		uv run fastapi dev $(BACKEND_MAIN) --reload; \
	else \
		echo "   ! 未找到 uv，請使用 'uv run fastapi dev $(BACKEND_MAIN) --reload' 或其他方式啟動"; \
	fi

frontend-init:
	@echo "==> Initializing frontend scaffold..."
	@if [ -f $(FRONTEND_DIR)/package.json ]; then \
		echo "   > 已存在 $(FRONTEND_DIR)/package.json，跳過"; \
	else \
		if command -v pnpm >/dev/null 2>&1; then \
			pnpm create vite@latest $(FRONTEND_DIR) -- --template vanilla-ts; \
		elif command -v npm >/dev/null 2>&1; then \
			npm create vite@latest $(FRONTEND_DIR) -- --template vanilla-ts; \
		else \
			echo "   ! 未找到 pnpm 或 npm，請先安裝其中之一"; exit 1; \
		fi; \
	fi

frontend-install:
	@echo "==> Installing frontend dependencies..."
	@if [ -f $(FRONTEND_DIR)/package.json ]; then \
		if command -v pnpm >/dev/null 2>&1; then \
			cd $(FRONTEND_DIR) && pnpm install; \
		elif command -v npm >/dev/null 2>&1; then \
			cd $(FRONTEND_DIR) && npm install; \
		else \
			echo "   ! 未找到 pnpm 或 npm，請自行安裝"; exit 1; \
		fi; \
	else \
		echo "   > 跳過，因為未找到 $(FRONTEND_DIR)/package.json"; \
	fi

frontend-build:
	@echo "==> Building frontend bundle..."
	@if [ -f $(FRONTEND_DIR)/package.json ]; then \
		if command -v pnpm >/dev/null 2>&1; then \
			cd $(FRONTEND_DIR) && pnpm run build --if-present; \
		elif command -v npm >/dev/null 2>&1; then \
			cd $(FRONTEND_DIR) && npm run build --if-present; \
		else \
			echo "   ! 未找到 pnpm 或 npm，無法執行 build"; \
		fi; \
	else \
		echo "   > 跳過，因為未找到 $(FRONTEND_DIR)/package.json"; \
	fi

frontend-test:
	@echo "==> Running frontend tests (optional)..."
	@if [ -f $(FRONTEND_DIR)/package.json ]; then \
		if command -v pnpm >/dev/null 2>&1; then \
			cd $(FRONTEND_DIR) && pnpm run test --if-present; \
		elif command -v npm >/dev/null 2>&1; then \
			cd $(FRONTEND_DIR) && npm run test --if-present; \
		else \
			echo "   ! 未找到 pnpm 或 npm，無法執行前端測試"; \
		fi; \
	else \
		echo "   > 跳過，因為未找到 $(FRONTEND_DIR)/package.json"; \
	fi

frontend-dev:
	@echo "==> Starting frontend dev server..."
	@if [ -f $(FRONTEND_DIR)/package.json ]; then \
		if command -v pnpm >/dev/null 2>&1; then \
			cd $(FRONTEND_DIR) && pnpm run dev; \
		elif command -v npm >/dev/null 2>&1; then \
			cd $(FRONTEND_DIR) && npm run dev; \
		else \
			echo "   ! 未找到 pnpm 或 npm，無法啟動前端"; \
		fi; \
	else \
		echo "   > 跳過，因為未找到 $(FRONTEND_DIR)/package.json"; \
	fi

setup: frontend-init backend-install frontend-install

all: plan skeleton tests impl review gate docs accept
