#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
FRONTEND_DIR="${FRONTEND_DIR:-$ROOT_DIR/web}"
BACKEND_PYPROJECT="$ROOT_DIR/pyproject.toml"

step() {
  printf '\n==> %s\n' "$1"
}

if [ -f "$BACKEND_PYPROJECT" ]; then
  step "Backend: syncing dependencies (uv)"
  if command -v uv >/dev/null 2>&1; then
    uv sync --extra dev
    step "Backend: ruff check"
    if uv run ruff --version >/dev/null 2>&1; then
      uv run ruff check src
    else
      echo "   ! ruff 未安裝，跳過 lint"
    fi
    step "Backend: mypy type check"
    if uv run mypy --version >/dev/null 2>&1; then
      uv run mypy src
    else
      echo "   ! mypy 未安裝，跳過型別檢查"
    fi
    step "Backend: pytest"
    uv run pytest || { echo "Backend tests failed"; exit 1; }
  else
    echo "   ! 未找到 uv，請先安裝 https://github.com/astral-sh/uv"
  fi
else
  echo "--> 跳過後端檢查，未找到 pyproject.toml"
fi

PACKAGE_JSON="$FRONTEND_DIR/package.json"
if [ -f "$PACKAGE_JSON" ]; then
  step "Frontend: installing deps"
  if command -v pnpm >/dev/null 2>&1; then
    (cd "$FRONTEND_DIR" && pnpm install)
    RUN_TESTS="pnpm"
  elif command -v npm >/dev/null 2>&1; then
    (cd "$FRONTEND_DIR" && npm install)
    RUN_TESTS="npm"
  else
    echo "   ! 未找到 pnpm 或 npm，跳過前端檢查"
    RUN_TESTS=""
  fi

  if [ -n "$RUN_TESTS" ]; then
    step "Frontend: lint"
    if [ "$RUN_TESTS" = "pnpm" ]; then
      (cd "$FRONTEND_DIR" && pnpm run lint --if-present)
    else
      (cd "$FRONTEND_DIR" && npm run lint --if-present)
    fi

    step "Frontend: unit tests"
    if [ "$RUN_TESTS" = "pnpm" ]; then
      (cd "$FRONTEND_DIR" && pnpm run test --if-present)
    else
      (cd "$FRONTEND_DIR" && npm run test --if-present)
    fi

    step "Frontend: build"
    if [ "$RUN_TESTS" = "pnpm" ]; then
      (cd "$FRONTEND_DIR" && pnpm run build --if-present)
    else
      (cd "$FRONTEND_DIR" && npm run build --if-present)
    fi
  fi
else
  echo "--> 跳過前端檢查，未找到 $PACKAGE_JSON"
fi
