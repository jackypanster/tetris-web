.PHONY: plan skeleton tests impl review gate docs accept all

plan:
	codex --full-auto -C . \
	  "生成/更新 docs/PRD.md, docs/ARCH.md, docs/openapi.yaml, docs/TASKS.md"

skeleton:
	claude --allowed-tools "Edit" --permission-mode acceptEdits --print \
	  "根據 docs/openapi.yaml 生成 src/ 最小骨架與接口桩，不越界目錄；若缺 README/配置一併補齊"

tests:
	gemini --approval-mode auto_edit --allowed-tools Edit \
	  "依據 docs/TESTPLAN.md 與 CONTRACT，生成 tests/ 與測試數據；每條測試標註 CONTRACT 條款"

impl:
	claude --allowed-tools "Edit" --permission-mode default -C . \
	  "只實作 TASKS.md 已就緒節點，最小提交，必要時補測試；不直接修改 CONTRACT"

review:
	codex exec --sandbox read-only -C . \
	  "審查本次變更，輸出 reports/review_codex.md（缺陷清單/風險/修復建議）"

gate:
	bash tools/gate.sh

docs:
	gemini --approval-mode auto_edit -C . \
	  "從 CONTRACT 與代碼註釋派生 docs/api.md + Quickstart；保留 <!-- MANUAL --> 區塊"

accept:
	codex exec --sandbox read-only -C . \
	  "對照 Acceptance.md 生成 reports/acceptance.json（機器可讀：id/status/evidence/fix/severity）"

all: plan skeleton tests impl review gate docs accept
