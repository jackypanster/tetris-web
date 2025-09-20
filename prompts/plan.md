目標：為當前代碼庫產出 PRD.md、ARCH.md、openapi.yaml、TASKS.md（DAG）
非功能：性能(延遲P95/吞吐)、安全(PII遮罩/審計)、可測性、可觀測性
要求：
- 文件可機器檢查且自包含
- DAG 每節點含 inputs/outputs/gates/risks/rollback
- 若發現需求矛盾→輸出 ADR 選項與取捨
