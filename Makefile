.PHONY: plan skeleton tests impl review gate docs accept all \
        backend-install backend-test backend-dev \
        frontend-init frontend-install frontend-build frontend-test frontend-dev setup

FRONTEND_DIR ?= web
BACKEND_MAIN ?= src/main.py
BACKEND_APP ?= src.main:app

plan:
	@echo "==> Running plan with Codex..."
	codex exec --full-auto --cd . \
      --model gpt-5-codex \
      -c model_reasoning_summary_format=experimental \
      -c model_reasoning_effort=high \
      "生成/更新 docs/PRD.md、docs/ARCH.md、docs/openapi.yaml、docs/TASKS.md；若文件已存在，请先输出差异到 reports/plan_diff.md 再覆盖。"


skeleton:
	@echo "==> Generating full-stack skeleton with Claude..."
	claude --permission-mode acceptEdits --verbose --allowed-tools "*" --print \
	  "根據 docs/PRD.md 與 docs/ARCH.md，補齊 web/ 前端與 src/ 後端骨架；同步遵循 docs/openapi.yaml 契約，不越界目錄；若缺 README/配置一併補齊"

tests:
	@echo "==> Generating test scaffolds with Gemini..."
	gemini --approval-mode yolo -m gemini-2.5-pro --debug \
	  "依據 docs/TESTPLAN.md 與 docs/openapi.yaml 生成 tests/ 與測試數據；前端無對應模塊時可留 TODO，但仍需標註 CONTRACT 條款"

impl:
	@echo "==> Running implementation/refinement with Claude..."
	claude --permission-mode acceptEdits --allowed-tools "*" --verbose --print \
	  "依據 docs/TASKS.md 已就緒節點補齊 web/ 與 src/ 實作；必要時補測試並更新文檔；若需改 CONTRACT 先起草 ADR"

review:
	@echo "==> Running review with Codex..."
	codex exec --sandbox workspace-write --cd . \
	  "審查本次變更，輸出 reports/review_codex.md（缺陷清單/風險/修復建議）"

gate:
	@echo "==> Running gate checks..."
	bash tools/gate.sh

docs:
	@echo "==> Generating docs with Gemini..."
	gemini --approval-mode yolo -m gemini-2.5-pro --debug \
	  "從 CONTRACT 與代碼註釋派生 docs/api.md + Quickstart；保留 <!-- MANUAL --> 區塊"

accept:
	@echo "==> Running acceptance evaluation with Codex..."
	codex exec --sandbox workspace-write --cd . \
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
