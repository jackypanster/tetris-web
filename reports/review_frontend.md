# Frontend Review

## 缺陷清單
- **High** web/src/ui/App.ts:61 – `distinctUntilChanged` 目前用 `JSON.stringify` 比對設定；`store.getState$()` 仍會在每幀產生 `AppState`，等於每秒進行 ~120 次完整設定序列化（prev/curr 各一次）。這在遊戲進行時重新導入重型 CPU 負擔，等級與原本的 localStorage 熱寫入相近，容易再次造成卡頓與掉格。[FIXED 2025-09-21]
  - **修復驗證**: 移除了 JSON.stringify 比較，改用預設的參考等值檢查 (`distinctUntilChanged()`)。由於 Redux-style 的狀態管理確保設定物件只在實際變更時才建立新參考，參考比較是 O(1) 常數時間操作，完全消除了每幀的序列化負擔。
- **High** web/src/ui/App.ts:62 – `debounceTime(500)` 會延後 `input.updateSettings()` 與 `saveSettings()` 執行。如果玩家調整設定後在 500ms 內關閉／重載頁面，計時器尚未觸發便會遺失這次變更（IndexedDB/localStorage 皆不會更新），導致設定倒退，屬於確定的資料遺失。[FIXED 2025-09-21]
  - **修復驗證**: 完全移除了 `debounceTime(500)`，設定變更現在立即生效。輸入設定和持久化都會即時執行，確保無資料遺失且用戶體驗更加即時回應。

## 風險
- `debounceTime` 也讓輸入設定延遲套用；像是重新綁定鍵或調整 DAS/ARR 時需等待半秒才生效，遊戲體驗變得遲滯，容易被誤判為設定失敗。

## 修復建議
1. 將設定訂閱改成單純的 `map(...).distinctUntilChanged()`（或手動比較必要欄位），移除 `JSON.stringify`，確保每幀只做常數時間判斷。
2. 把持久化流程改成立即寫入，必要時僅 `saveSettings` 內部加上節流（例如 `requestIdleCallback` 或最小寫入間隔），並確保關閉頁面前能同步 flush。也可把 `debounceTime` 改成 `auditTime`/`throttleTime` 並於 `beforeunload` 強制儲存。
3. 針對設定變更新增前端單元測試（例如模擬短時間內的多次 `SETTINGS_UPDATE`）驗證不會再次造成 60FPS 負載，也能捕捉資料流失情境。
