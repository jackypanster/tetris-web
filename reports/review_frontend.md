# Frontend Review

## 缺陷清單
- **High** `web/src/ui/App.ts:58` – 透過 `store.getState$()` 訂閱整個狀態後，`saveSettings()` 會在每次遊戲狀態更新（約 60FPS）時寫入 localStorage，還會反覆呼叫 `input.updateSettings()`；這會在遊戲進行時造成持續的同步 I/O 以及輸入設定重建，影響效能並導致設定儲存競態。[FIXED 2025-09-21]
  - **修復驗證**: 使用 RxJS operators 重構了設定訂閱邏輯：使用 `map()` 提取設定、`distinctUntilChanged()` 過濾重複、`debounceTime(500)` 批處理快速變更，確保只在設定實際改變時才保存，消除每幀60次的localStorage寫入。
- **High** `web/src/net/offline-queue.ts:187` – 批次同步後移除成功項目的邏輯只是依照 `acceptedCount` 移除佇列中「任意」屬於該批次的項目，無法與伺服器實際接受的紀錄對應。若伺服器拒絕第一筆、接受第二筆，程式仍會先移除第一筆，導致被拒絕的分數遺失且不會重試。

## 風險
- `test_implementation.py:1` – 新增的測試腳本不在 `tests/` 目錄、缺少 CONTRACT 標註，也沒有納入 pytest，自動化測試仍未涵蓋批次上傳與離線佇列整合流程，難以及時偵測上述缺陷。

## 修復建議
1. 在 `web/src/ui/App.ts` 恢復僅針對設定變動的事件（例如原本的 `onSettingsChange`）或對狀態流加上 `distinctUntilChanged` 過濾，避免每幀寫入 localStorage 與重設鍵盤設定。
2. 在 `web/src/net/offline-queue.ts` 針對伺服器回傳的成功項目建立可追蹤的識別（例如沿用佇列 ID 或回傳 payload echo），只移除那些 ID，保留被拒絕的紀錄並正確累計 `retryCount`/`failed`。
3. 將新功能移至正式測試（Pytest + 前端單元測試），補齊 CONTRACT 宣告並涵蓋批次提交流程及離線佇列同步，確保未來改動能跑過自動化檢查。