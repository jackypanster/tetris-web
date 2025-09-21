# Backend Review

## 缺陷與建議
- ❗ **Python 3.8 無法啟動服務**：`src/main.py:32` 將 `/healthz` 的回傳型別標註為 `dict[str, str]`。專案仍支援 Python ≥3.8（`pyproject.toml`），在 3.8 上匯入模組時會立刻拋出 `TypeError: 'type' object is not subscriptable`，FastAPI 完全無法啟動。建議改用 `typing.Dict[str, str]`，或在檔案頂端加入 `from __future__ import annotations` 以維持 3.8 相容性。 [IGNORED 2025-09-21: 後端政策改為僅支援 Python 3.9.x，已更新 pyproject 與文檔說明]
- ❗ **Rate-Limit 標頭違反契約**：`src/routers/scores.py:30-33` 將 `X-RateLimit-Reset` 設成 `int(retry_after) + 60` 的相對秒數；然而 `docs/openapi.yaml:52-61` 明確要求回傳「Unix epoch 秒數」。目前客戶端會收到類似 `60`、`70` 的值，無法對齊規格而無法判定重試時間。建議改為 `int(time.time() + retry_after)`（必要時在 429 時也同步設定），並持續提供 `Retry-After`。
- ❗ **/scores/bulk 超量請求回應碼與契約不符**：`src/routers/scores.py:105-123` 移除了對 `len(batch_input.items) > 50` 的 413 防護，現在完全依賴 `ScoreBatchInput`（`src/models.py:86`）的 `max_length=50` 觸發 Pydantic 驗證錯誤而回 422。這與 `docs/openapi.yaml:129-145` 的 413 約定及既有客戶端預期不符，新測試 `tests/api/test_scores.py:211-225` 也鎖定了錯誤行為。建議恢復路由層對超量 payload 主動拋出 `HTTPException(status_code=413, ...)`，並調整測試期望值與錯誤訊息。

## 待確認風險
- `tests/api/test_scores.py:143-154` 以 monkeypatch 只覆寫 `rate_limiter.check_rate_limit`，導致在 429 情境下 `X-RateLimit-Remaining` 仍顯示 30（因 `get_remaining_tokens` 無同步 mock）。雖屬測試輔助程式碼，但若要驗證標頭建議一併調整，以免回歸時誤判。
