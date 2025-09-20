目標：為當前代碼庫產出 PRD.md、ARCH.md、openapi.yaml、TASKS.md（DAG）
非功能：性能(延遲P95/吞吐)、安全(PII遮罩/審計)、可測性、可觀測性
要求：
- 文件可機器檢查且自包含
- DAG 每節點含 inputs/outputs/gates/risks/rollback
- 若發現需求矛盾→輸出 ADR 選項與取捨
- 先在 reports/plan_diff.md 梳理現有版本與擬議變更的差異（逐檔列出新增/刪除/調整與理由），再覆蓋正式文件
- 保持既有章節結構與版本資訊，必要時更新版本號並在 diff 中說明
- 結尾提醒後續需重新執行 make tests / make impl / make gate 刷新下游產物
